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

var Canvas    = require('node-canvaslms');
var authToken = process.env.HUBOT_CANVAS_TOKEN;

var bCoursesURL = '';
// Update Each Semester
var cs10CourseID;
// Update Each Semester
var groupAssignmentID;
// Make sure only a few people can assign grades
var privelegedRooms;

var checkOffRegExp = /(lab[- ])?check[- ]off\s+(\d+)\s*(late)?\s*(\d+\s+)+/i;
var cs10 = new Canvas(bCoursesURL, { token: authToken });

module.exports = function(robot) {

    if (!authToken) {
        robot.logger.log('HUBOT_CANVAS_TOKEN token not found!');
        return;
    }

    robot.respond(, function(msg) {

    });
}
