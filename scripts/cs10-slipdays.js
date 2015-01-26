var Canvas    = require('node-canvas-lms');
var authToken = process.env.HUBOT_CANVAS_KEY;

var bCoursesURL = 'https://bcourses.berkeley.edu/';
// Update Each Semester
// CS10 FA14: '1246916'
// Michael Sandbox: '1268501'
var cs10CourseID = '1246916';
// Update Each Semester
// CS10 FA14 Labs 1549984
// Michael Sandbox: 1593713
var labsAssnID = '1549984';
// Make sure only a few people can assign grades
// TODO: Grab the actual strings from HipChat
// We can also use the "secret" room...
var allowedRooms = ['lab_check-off_room', 'cs10_staff_room_(private)'] + [ process.env.HUBOT_SECRET_ROOM ];

// Mapping of extenstion IDs to bCourses IDs
var SWAP_IDS = {
    '539182':'UID:1083827',
    '538761':'UID:1074257',
    '538594':'UID:1074141',
    '538652':'UID:1007900',
    '539072':'UID:1082812',
};

var slipDaysRegExp = /slip[- ]?days\s*(\d+)/;

/* Take in a Canvas Assignment Group ID and return all the assignments in that
 * that group. */
var getAllLabs = function(courseID, assnGroupID, callback) {
    var labGroups = '/courses/' + courseID + '/assignment_groups/' + assnGroupID;
    var params = '?include[]=assignments';
    cs10.get(labGroups + params, '', function(error, response, body) {
        return body;
    });
};

var cs10 = new Canvas(bCoursesURL, { token: authToken });


var pageSource = '<!DOCTYPE html><html><head><meta charset="utf-8"><title>Slip Day Checker</title><style type="text/css">body {background: #d3d6d9;color: #636c75;text-shadow: 0 1px 1px rgba(255, 255, 255, .5);font-family: Helvetica, Arial, sans-serif;}h1 {margin: 8px 0;padding: 0;}.commands {font-size: 13px;}p {border-bottom: 1px solid #eee;margin: 6px 0 0 0;padding-bottom: 5px;}p:last-child {border: 0;}</style></head><body><h1>#{SID}\'s Slip Day Check</h1><div class="commands">#{NOTES}</div></body></html>';


module.exports = function(robot) {

    robot.hear(slipDaysRegExp, function(msg) {
        var student = msg.match[1];

        if (!student) {
            msg.send('Error: No Student Provided');
            return;
        }

        calculateSlipDays(student, function(notices) {
            notices.forEach(function(note) {
                msg.send(note);
            });
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

        if (!sid.match(/\d+/)) {
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
    var threshold = 1000 * 60 * 30,
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
function calculateSlipDays(sid, callback) {
    var url, query, idType = 'sis_user_id:';

    // Extension Student ID problems....
    // TODO: Make this a function.
    if (Object.keys(SWAP_IDS).indexOf(sid) !== -1) {
        sid = SWAP_IDS[sid];
    }

    url = '/courses/' + cs10CourseID + '/students/submissions';

    // gather specified assignments
    query = '?' + toCheck;
    // Include assignment details and group by student (we'll only have 1 stu)
    query += '&grouped=true&include=assignment';
    // Include the student ID to query
    query += '&student_ids[]=' + idType + sid;

    cs10.get(url + query, '', function(error, response, body) {
        var results = [];
        // See above comments for API result formats
        var submissions, days, daysUsed;
        if (!body || body.errors) {
            results.push('errrrrrooooorrrrrrrrrr');
            results.push(body.errors);
            results.push(error)
            callback(results);
            return;
        }

        daysUsed = 0;
        // List of submissions contains only most recent submission
        submissions = body[0].submissions;
        var i = 0, end = submissions.length, subm;
        for(; i < end; i += 1) {
            subm = submissions[i];

            if (subm.late) { // late is fale even for no submission!
                days = getSlipDays(subm.submitted_at, subm.assignment.due_at);
                daysUsed += days;
                if (days > 0) {
                    results.push('Used ' + days.toString() + ' slip days for assignment ' +
                        subm.assignment.name);
                }
            }
        }

        results.push('Total: ' + daysUsed.toString() + ' slip days used.');

        callback(results);
    });
}
