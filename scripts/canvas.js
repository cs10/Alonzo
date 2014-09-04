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
var authToken = process.env.HUBOT_CANVAS_TOKEN;

var bCoursesURL = 'https://bcourses.berkeley.edu/';
// Update Each Semester
var cs10CourseID = '1246916';
// Update Each Semester
var labsAssnID = '1549984';
// Make sure only a few people can assign grades
var privelegedRooms = '';

var checkOffRegExp = /(lab[- ])?check[- ]off\s+(\d+)\s*(late)?\s*((\d+\s*)+)/i;
// Match groups:
/*
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
 */

/* Take in a Canvas Assignment Group ID and return all the assignments in that
 * that group. */
var getAllLabs = function(courseID, assnGroupID, callback) {
    console.log('Call Made');
    var path = '/courses/' + courseID + '/assignment_groups/' + assnGroupID;
    cs10.get(path, '?include[]=assignments', function(body) {
        console.log(body);
    });
}

module.exports = function(robot) {

    if (!authToken) {
        robot.logger.log('HUBOT_CANVAS_TOKEN token not found!');
        return;
    }

    robot.respond(checkOffRegExp, function(msg) {
        console.log('Check off matched');
        console.log('\n\n');

        var path = '/courses/' + cs10CourseID + '/assignment_groups/' + labsAssnID;
        cs10.get(path + '?include[]=assignments', '', function(body) {
            var assnList = body.assignments;
            // find assnID
            var assnID;
            var i = 0; l = assnList.length;
            for (; i < l; i += 1) {
                var assnName = assnList[i].name;
                console.log(assnName);
                var labNum = assnName.split('.');
                if (labNum.length < 1) {
                    msg.send('Oh shit, something is wrong');
                    return
                } else if (labNum[0] == msg.match[2]) {
                    assnID = assnList[i].id;
                    msg.send('Found it!');
                    msg.send(assnID);
                }
            }
            if (!assnID) {
                // Highly appropriate error messages
                msg.send('Well, crap...I can\'t find lab' + msg.match[2] + '.');
                msg.send('Hey, @Michael, you stuff is broken. Jerk');
                return
            }

        });

        getAllLabs(cs10CurseID, labsAssnID, function(body) {
            msg.send('thingy')
            msg.send(body.assignments.length);
        })
    });
}
