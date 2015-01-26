var Canvas    = require('node-canvas-lms');
var authToken = process.env.HUBOT_CANVAS_KEY;

var bCoursesURL = 'https://bcourses.berkeley.edu';

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

cs10.baseURL = '/courses/' + cs10.courseID;

cs10.gradebookURL = bCoursesURL + cs10.baseURL + '/gradebook';

// Mapping of extenstion IDs to bCourses IDs
// Make sure this is still defined even if there are no extenstion students
cs10.SWAP_IDS = {
};

// Trim an SID and check of extenstion students
cs10.normalizeSID = function(sid) {
     sid = sid.trim().replace('X', '');
     if (Object.keys(cs10.SWAP_IDS).indexOf(sid) !== -1) {
         sid = cs10.SWAP_IDS[sid];
     }
     return sid;
}

module.exports = cs10;