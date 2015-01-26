var Canvas    = require('node-canvas-lms');
var authToken = process.env.HUBOT_CANVAS_KEY;

var bCoursesURL = 'https://bcourses.berkeley.edu/';

var cs10 = new Canvas(bCoursesURL, { token: authToken });

// Update Each Semester
// Michael Sandbox: '1268501'
// var cs10CourseID = '1301472'; Spring 2015
cs10.courseID = '1301472';
// Update Each Semester
// Michael Sandbox: 1593713
// cs10.labsID = '1702126' Spring 2015
cs10.labsID = '1702126';

cs10.uid = 'sis_user_id:';

// Mapping of extenstion IDs to bCourses IDs
cs10.SWAP_IDS = {
    '539182':'UID:1083827',
    '538761':'UID:1074257',
    '538594':'UID:1074141',
    '538652':'UID:1007900',
    '539072':'UID:1082812',
};

cs10.normalizeID = function(sid) {
    
}

module.exports = cs10;