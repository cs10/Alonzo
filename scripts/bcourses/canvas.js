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

// @PNHilfinger, this is for you.
// The most useful skill from 61B. ;)
var checkOffRegExp = /(late\s*)?(lab[- ])?check[- ]off\s+(\d+)\s*(late)?\s*((\d+\s*)*)\s*/i;
/* Hubot msg.match groups:
[ '@Alonzo check-off 12 late 1234 1234 1234',
  undefined, // Late?
  undefined, // The word "lab"
  '12',
  'late',
  '1234 1234 1234',
  '1234',
  index: 0,
  input: '@Alonzo check-off 12 late 1234 1234 1234' ]
*/

var slipDaysRegExp = /slip[- ]?days\s*(\d+)/;

var cs10 = new Canvas(bCoursesURL, { token: authToken });

/* Fuctions To Do
 * getAllLabs(assnGroupID)
 * MatchLabNumber(int-N)
 * Assign Grade(SID, grade)
 */

/* Take in a Canvas Assignment Group ID and return all the assignments in that
 * that group. */
var getAllLabs = function(courseID, assnGroupID, callback) {
    var labGroups = '/courses/' + courseID + '/assignment_groups/' + assnGroupID;
    var params = '?include[]=assignments';
    cs10.get(labGroups + params, '', function(body) {
        return body;
    });
};


var pageSource = '<!DOCTYPE html><html><head><meta charset="utf-8"><title>Slip Day Checker</title><style type="text/css">body {background: #d3d6d9;color: #636c75;text-shadow: 0 1px 1px rgba(255, 255, 255, .5);font-family: Helvetica, Arial, sans-serif;}h1 {margin: 8px 0;padding: 0;}.commands {font-size: 13px;}p {border-bottom: 1px solid #eee;margin: 6px 0 0 0;padding-bottom: 5px;}p:last-child {border: 0;}</style></head><body><h1>#{SID}\'s Slip Day Check</h1><div class="commands">#{NOTES}</div></body></html>';


module.exports = function(robot) {

    if (!authToken) {
        robot.logger.log('HUBOT_CANVAS_KEY token not found!');
        return;
    }

    robot.hear(checkOffRegExp, function(msg) {

        currentRoom = msg.message.room;
        // Prevent grading not done by TAs
        // FIXME -- this is broken in the shell....
        // if (allowedRooms.indexOf(currentRoom) === -1) {
        //     msg.send('You cannot post scores from this room');
        //     return;
        // }
        // match[3] is the late parameter.
        var labNo  = msg.match[3],
            points = (msg.match[1] !== undefined || msg.match[4] !== undefined) ? 1 : 2,
            // WTF is wrong with /s+/???
            SIDs   = msg.match[5].trim().split(/[ \t\n]/g),
            len    = SIDs.length,
            i      = 0,
            path;

        // Trim spaces
        for (; i < len; i += 1) {
            SIDs[i] = SIDs[i].trim();
            if (SIDs[i].substring(0, 1) == 'X') {
                SID[i] = SIDs[i].replace('X', '');
            }
        }

        msg.send('Checking Off ' + SIDs.length + ' students for lab ' + labNo + '.');

        path = '/courses/' + cs10CourseID + '/assignment_groups/' +
                    labsAssnID;

        cs10.get(path + '?include[]=assignments', '', function(error, response, body) {
            var assignments = body.assignments,
                assnID, i = 0;

            if (!assignments) {
                msg.send('Oh crap, no assignments were found. Please check the lab number');
                return;
            }

            for (; i < assignments.length; i += 1) {
                var assnName  = assignments[i].name;
                // All labs are named "<#>. <Lab Title> <Date>"
                var searchNum = assnName.split('.');

                if (searchNum[0] == labNo) {
                    assnID = assignments[i].id;
                    break;
                }
            }
            if (!assnID) {
                msg.send('Well, crap...I can\'t find lab ' + msg.match[2] + '.');
                msg.send('Check to make sure you put in a correct lab number.');
                return;
            }
            // now we have an assignment ID we should post scores.
            // iterate over student IDs and then PUT
            var item = 0,
                successes = 0;
            for (; item < SIDs.length; item += 1) {
                var sid = SIDs[item];

                if (!sid) {
                    continue;
                }

                var scoreForm      = 'submission[posted_grade]=' + points,
                    submissionBase = '/courses/' + cs10CourseID +
                                     '/assignments/' + assnID + '/submissions/',
                    submissionPath = submissionBase + 'sis_user_id:',
                    submissionALT  = submissionBase + 'sis_login_id:';

                // FIXME -- this is dumb.
                submissionPath += sid;
                submissionALT  += sid;

                cs10.put(submissionPath , '', scoreForm,
                        callback(sid, points, msg));
            }

            // Access in SID and points in the callback
            function callback(sid, points, msg) {
                return function(error, response, body) {
                    // TODO: Make an error function
                    // Absence of a grade indicates an error.
                    // WHY DONT I CHECK HEADERS THATS WHAT THEY ARE FOR
                    if (body.errors || !body.grade || body.grade != points.toString()) {
                        // Attempt to switch to using sis_login_id instead of the sis_user_id
                        // TODO: Make note about not finding sis_user_id and trying sis_login_id
                        cs10.put(submissionALT , '', scoreForm,
                            loginCallback(sid, points, msg));
                    } else {
                        successes += 1;
                    }
                };
            }

            // A modified call back for when sis_login_id is used
            // THese should really be condenced but I didn't want to figure
            // out a proper base case for a recursive callback...lazy....
            function loginCallback(sid, points, msg) {
                return function(error, response, body) {
                    var errorMsg = 'Problem encountered for ID: ' +
                                    sid.toString();
                    // TODO: Make an error function
                    // Absence of a grade indicates an error.
                    // WHY DONT I CHECK HEADERS THATS WHAT THEY ARE FOR
                    if (body.errors || !body.grade || body.grade != points.toString()) {
                        // Attempt to switch to using sis_login_id instead of the sis_user_id
                        if (body.errors && body.errors[0]) {
                            errorMsg += '\nERROR:\t' + body.errors[0].message;
                        }
                        errorMsg += '\n' + 'Please enter the score directly in bCoureses.';
                        errorMsg += '\n' + 'https://bcourses.berkeley.edu/courses/1246916/gradebook';
                        msg.send(errorMsg);
                    } else {
                        successes += 1;
                    }
                };
            }

            // wait till all requests are complete...hopefully.
            // FIXME there has got to be a better way to do this..
            setTimeout(function() {
                var score = successes + ' score' + (successes == 1 ? '' : 's');
                msg.send(score + ' successfully updated for lab ' + labNo + '.');
            }, 5000);
        });
    });

    ///////////////////////////////////////////////////////////////////////////

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

        res.setHeader('content-type', type);
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
