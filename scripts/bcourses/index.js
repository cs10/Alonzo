// Use the Canvas API library, written just for CS10
var Canvas    = require('node-canvas-lms');
var authToken = process.env.HUBOT_CANVAS_KEY;

var bCoursesURL = 'https://bcourses.berkeley.edu';

var cs10 = new Canvas(bCoursesURL, { token: authToken });

/** COURSE AND ASSIGNMENT IDS
    Update these each semester!!
    The course ID is the standard CS10 course id, easily obtainable from the URL:
    http://bcourses.berkeley.edu/courses/<id>/ when you are viewing the CS10
    page in bCourses.
    The labsID is the id of the "assignment group" for all lab check offs.
    To get this id...... TODO.
**/
// These are used in URL building, so strings are OK.
// Michael Sandbox: 1268501
// Spring 2015: 1301472
// Fall 2014: 1246916
cs10.courseID = '1301472';
// Michael Sandbox: 1593713
// cs10.labsID = '1702126' Spring 2015
cs10.labsID = '1702126';

// This changes the default ID of a student to tell bCourses to use SIDs
// The default are internal bCourses IDs, but no one knows those.
// See https://bcourses.berkeley.edu/doc/api/file.object_ids.html
cs10.uid = 'sis_user_id:';

// all endpoints are based of the course, at least for our usage
cs10.baseURL = '/courses/' + cs10.courseID + '/';

// Shortcut for use in chat error messages
cs10.gradebookURL = bCoursesURL + cs10.baseURL + 'gradebook';

/** Mapping of extenstion student IDs to bCourses IDs
    If there are no extenstion students, leave this empty
    The UID.. is for the sis_user_id field as bCourses doesn't know about
    extenstion student IDs. To get the UID format go to the user's page in
    bCourses and click "more details" (The extenstion IDs come from the
    BearFacts roster.)

    TODO: Consider making this a config for privacy reasons
    However, these IDs don't actually reveal anything.
**/
cs10.SWAP_IDS = { };

// Course Level Policies:
cs10.gracePeriodMinutes = 15;
cs10.allowedSlipDays    = 3;
cs10.numberLabs         = 18;
cs10.labCheckOffPoints  = 2; // These could be changed as the course changes.
cs10.labCheckOffLatePts = 1;

// Internal bCourses assignment IDs, as intergers
// They need to be updated every semester.
// Use the bCourses API courses/X/assignments to get these IDs or the page URLs
cs10.slipDayAssignmentIDs = [
    5919083, // Homework 1
    5919084, // Homework 2
    5919085, // Homework 3
    5919087, // Midterm Project
    5919089, // Explore Post Content
    5919103, // Explore Post Artifact and Comments
    5919088, // Final Project
];

// Note that these need to be internal canvas IDs as integers!
// TODO: Future Query roles for TAs (also check for type teacher !!)
// courses/X/search_users?enrollment_type=ta
cs10.staffIDs = [
    4877463, // The Man
    4886975, // TAs
    4862335, // Me
    4881542,
    4901643,
    4891642,
    4831377,
    4907764,
    4997192,
    4900858,
    4894982,
    4899427,
    4850975,
    4904808,
    5013924,
    4970007, // Readers
    4890943,
    4908524,
    5008226,
    4901852,
    5025344,
    4897435
];


// Trim an SID and check of extenstion students
// This must called whenever a SID is used to make sure its the proper format
cs10.normalizeSID = function(sid) {
     sid = sid.trim().replace('X', '');
     if (Object.keys(cs10.SWAP_IDS).indexOf(sid) !== -1) {
         sid = cs10.SWAP_IDS[sid];
     }
     if (sid.indexOf(cs10.uid) !== -1) {
         return sid;
     }
     return cs10.uid + sid;
}


/**
    This posts multiple grades to a single assignment at once.
    Grades should be of the form: { sid: grade }
    Note, bCourses is whacky and updates grades in an async manner:

 **/
cs10.postMultipleGrades = function(assnID, grades, msg) {
    var url = cs10.baseURL + 'assignments/' + assnID + '/submissions/update_grades';
    var form = {};
    for (sid in grades) {
        form['grade_data[' + sid + '][posted_grade]'] = grades[sid];
    }
    cs10.post(url, '', form, function(error, response, body) {
        var notify = msg ? msg.send : console.log;
        if (error || !body || body.errors) {
            notify('Uh, oh! An error occurred');
            notify(error);
            notify(body.errors || 'No error message...');
            return;
        }
        notify('bCourses Progress:\n\t', assnID, body.message, body.url);
    });
}

// Note that all variable which you want to share with other scripts must be
// a member of the CS10 object.
module.exports = cs10;