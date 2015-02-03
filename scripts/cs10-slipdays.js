// Description:
//   Logic for dealing with student slip day calculations
//   Exposes: /slipdays/:studentID/:json? as a web endpoint
//
// Dependencies:
//   bcourses library see ./bcourses/index.js
//
// Configuration:
//   See bcourses
//
// Commands:
//   hubot  slip days <SID> -- get slip days used for students
//
// Author:
//  Michael Ball

// This sets up all the bCourses interface stuff
var cs10 = require('./bcourses/');


var slipDaysRegExp = /slip[- ]?days\s*(\d+)/;
var pageSource = '<!DOCTYPE html><html><head><meta charset="utf-8"><title>Slip Day Checker</title><style type="text/css">body {background: #d3d6d9;color: #636c75;text-shadow: 0 1px 1px rgba(255, 255, 255, .5);font-family: Helvetica, Arial, sans-serif;}h1 {margin: 8px 0;padding: 0;}.commands {font-size: 13px;}p {border-bottom: 1px solid #eee;margin: 6px 0 0 0;padding-bottom: 5px;}p:last-child {border: 0;}</style></head><body><h1>#{SID}\'s Slip Day Check</h1><div class="commands">#{NOTES}</div></body></html>';


module.exports = function(robot) {

    robot.hear(slipDaysRegExp, function(msg) {
        var student = msg.match[1];

        if (!student) {
            msg.send('Error: No Student Provided');
            return;
        }

        calculateSlipDays(student, function(result) {
            msg.send(JSON.stringify(result));
        });
    });

    robot.router.get('/slipdays/:sid/:json?', function(req, res) {
        var sid       = req.params.sid,
            useJSON   = req.params.json,
            type      = 'text/html',
            errorFn   = processError;
            successFn = processSuccess;

        if (useJSON) {
            type      = 'text/json';
            successFn = JSON.stringify;
            errorFn   = JSON.stringify;
        }

        res.type(type);
        // Damn you CORS....
        res.setHeader('Content-Type', type);
        res.setHeader('Access-Control-Allow-Origin', '*');
        res.setHeader('Access-Control-Allow-Credentials', true);
        res.setHeader('Access-Control-Allow-Methods', 'POST, GET, PUT, DELETE, OPTIONS');
        res.setHeader('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept');

        if (!sid) {
            res.end(errorFn.call(null, 'No SID Found'));
            return;
        }

        function processError() {
            return pageSource.replace('#{NOTES}', 'No SID Found')
                             .replace("#{SID}'s", "ERROR —");
        }

        function processSuccess(notices) {
            var page = pageSource.replace('#{SID}', sid);
            var results = '<p>' + notices.join('</p><p>') + '</p>';
            return page.replace('#{NOTES}', results);
        }

        calculateSlipDays(sid, function(notices) {
            res.end(successFn.call(null, notices));
        });
    });

};

////

// https://bcourses.berkeley.edu/api/v1/courses/1246916/assignments/5179913
var toCheck = [];
toCheck.push('5179913'); // HW1
toCheck.push('5179914'); // HW2
toCheck.push('5179915'); // HW3
toCheck.push('5179917'); // MT Project
toCheck.push('5179919'); // Impact Post Link
toCheck.push('5179935'); // Impact Post comments
toCheck.push('5179918'); // Final Project
// toCheck.push(); // Data Project
// individual MT reflection

toCheck = toCheck.map(function(id) {
    return 'assignment_ids[]=' + id;
});
toCheck = toCheck.join('&');


function getSlipDays(submissionTime, dueTime) {
    var threshold = 1000 * 60 * cs10.gracePeriodMinutes,
        oneDay    = 1000 * 60 * 60 * 24,
        d1 = new Date(submissionTime),
        d2 = new Date(dueTime);

    var diff = Math.abs(d1 - d2);

    if (diff < threshold) {
        return 0;
    }
    // This is somewhat shitty if you use slightly more than a day
    // TODO: only floor if < .1 difference ??
    return Math.ceil(diff / oneDay);
}

/* Canvas Result Format:
[
    {
        "sis_user_id": "XXXX",
        "submissions": [
            {
                "assignment": {
                    "due_at": "2014-12-06T07:59:00Z",
                    "html_url": "https://bcourses.berkeley.edu/courses/1246916/assignments/5179918",
                    "id": 5179918,
                    "name": "Final Project"
                },
                "assignment_id": 5179918,
                "id": XXXX,
                "late": true,
                "preview_url": "https://bcourses.berkeley.edu/courses/1246916/assignments/5179918/submissions/5018297?preview=1",
                "submitted_at": "2014-12-06T08:54:14Z",
                "workflow_state": "graded"
            },
        ],
        "user_id": XXXX
    }
]
*/


/* Iterate over all the assignments that slip days count towards:
 * URLs:
 * [BASE]/courses/ID/students/submissions ?
 * Query: assignment_ids[]=XXX&student_ids[]=XXX&grouped=true&include=assignment
 */
var STATE_GRADED = 'graded';
function calculateSlipDays(sid, callback) {
    var url, query;

    url = 'courses/' + cs10.courseID + '/students/submissions';

    // Include assignment details and group by student (we'll only have 1 stu)
    query = toCheck + '&grouped=true&include[]=assignment&include[]=rubric_assessment';
    // Include the student ID to query
    query += '&student_ids[]=' + cs10.normalizeSID(sid);

    console.log(url);
    console.log(query);
    cs10.get(url + '?' + query, '', function(error, response, body) {
        var submissions,
            results = [];
        if (!body || body.errors) {
            results.push('errrrrrooooorrrrrrrrrr');
            results.push(body.errors);
            results.push(error)
            callback(results);
            return;
        }

        results = {
            totalDays: 0,
            overLimit: 0,
            assignments: [] // Assignment: name, daysUsed, graded (bool)
        };
        // List of submissions contains only most recent submission
        submissions = body[0].submissions;
        submissions.forEach(function(subm) {
            var state = subm.workflow_state;
            // TODO: Check for muted assignments?
            if (state === STATE_GRADED) { // Use Reader Rubric
                console.log(subm.assignment.rubric);
                days = 2;
            } else if (subm.late) { // Calculate time based on submission
                days = getSlipDays(subm.submitted_at, subm.assignment.due_at);
            } else { // Not late...
                days = 0;
            }

            var assignment = {
                title: subm.assignment.name,
                slipDays: days,
                graded: state === STATE_GRADED,
                url: subm.preview_url
            };

            results.totalDays += days;
            results.overLimit  = results.totalDays - cs10.allowedSlipDays;
            results.assignments.push(assignment);
        })

        callback(results);
    });
}
