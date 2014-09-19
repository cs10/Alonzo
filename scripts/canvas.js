// Description:
//   A collection of CS10 scripts to automate grading with our Canvas LM
//   instance
//
// Dependencies:
//     node-canvaslms
//
// Configuration:
//   HUBOT_CANVAS_TOKEN
//   HUBOT_STAFF_ROOMS
//
//
// Commands:
//   [lab-]? check-off [NUM] [late]? [array of SIDs] -- check off these students for the lab specified. "Late" is optional and will assign students 1 point instead of 2. All SIDs will be assigned the same score.
//
// Notes:
//
//
// Author:
//   Michael Ball @cycomachead

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

// @PNHilfinger, this is for you.
// The most useful skill from 61B. ;)
var checkOffRegExp = /(lab[- ])?check[- ]off\s+(\d+)\s*(late)?\s*((\d+\s*)*)\s*/i;
/* Hubot msg.match groups:
[ '@Alonzo check-off 12 late 1234 1234 1234',
  undefined,
  '12',
  'late',
  '1234 1234 1234',
  '1234',
  index: 0,
  input: '@Alonzo check-off 12 late 1234 1234 1234' ]
*/

var cs10 = new Canvas(bCoursesURL, { token: authToken });

/* Fuctions To Do
 * getAllLabs(assnGroupID)
 * MatchLabNumber(int-N)
 * Assign Grade(SID, grade)
 * build Some URL paths
 */

/* Take in a Canvas Assignment Group ID and return all the assignments in that
 * that group. */
var getAllLabs = function(courseID, assnGroupID, callback) {
    var labGroups = '/courses/' + courseID + '/assignment_groups/' + assnGroupID;
    var params = '?include[]=assignments';
    cs10.get(labGroups + params, '', function(body) {
        console.log(body);
    });
}

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

        var labNo  = msg.match[2];
        // match[3] is the late parameter.
        var points = msg.match[3] != undefined ? 1 : 2;
        var SIDs   = msg.match[4].trim().split(' ');

        // Trim spaces
        var len = SIDs.length, i = 0;
        for (; i < len; i += 1) {
            SIDs[i] = SIDs[i].trim();
        }

        msg.send('Checking Off ' + SIDs.length + ' students for lab ' + labNo + '.');

        var path = '/courses/' + cs10CourseID + '/assignment_groups/' +
                    labsAssnID;

        cs10.get(path + '?include[]=assignments', '', function(body) {
            var assignments = body.assignments,
                assnID, i = 0;
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
                msg.send('Hey, @Michael, your code is broken. Jerk!');
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
                // Access in SID and points in the callback
                function callback(sid, points, msg) {
                    return function(body) {
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
                    return function(body) {
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

                cs10.put(submissionPath , '', scoreForm,
                        callback(sid, points, msg));
            }

            // wait till all requests are complete...hopefully.
            // FIXME there has got to be a better way to do this..
            setTimeout(function() {
                var score = successes + ' score' + (successes == 1 ? '' : 's');
                msg.send(score + ' successfully updated for lab ' + labNo + '.');
            }, 5000);
        });
    });
}
