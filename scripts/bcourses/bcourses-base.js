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



module.exports = cs10;