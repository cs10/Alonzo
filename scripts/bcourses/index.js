var Canvas    = require('node-canvas-lms');
var authToken = process.env.HUBOT_CANVAS_KEY;

var bCoursesURL = 'https://bcourses.berkeley.edu';

var cs10 = new Canvas(bCoursesURL, { token: authToken });

// Update Each Semester
// Michael Sandbox: 1268501
// Spring 2015: 1301472
// Fall 2014: 1246916
cs10.courseID = '1246916';
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
    '538866':'UID:1083023'
};

// Trim an SID and check of extenstion students
cs10.normalizeSID = function(sid) {
     sid = sid.trim().replace('X', '');
     if (Object.keys(cs10.SWAP_IDS).indexOf(sid) !== -1) {
         sid = cs10.SWAP_IDS[sid];
     }
     return cs10.uid + sid;
}

// Course Level Policies:
cs10.gracePeriodMinutes = 15;
cs10.allowedSlipDays    = 3;

// These are the IDs of the assignments that matter for slip day calculations
// They need to be updated every semester.
cs10.slipDayAssignmentIDs = [
    
];

// Note that these need to be internal canvas IDs.
// TODO: Future Query roles for TAs.
// courses/1301472/search_users?enrollment_type=ta
// Note: These should be integers
cs10.staffIDs = [
    4881542,
    4901643,
    4970007,
    4890943,
    4891642,
    4831377,
    4907764,
    4997192,
    4908524,
    4900858
    // FIXME
];

module.exports = cs10;