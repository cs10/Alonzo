// Use the Canvas API library, written just for CS10
var Canvas = require('node-canvas-lms');
var authToken = process.env.HUBOT_CANVAS_KEY;
var bCoursesURL = 'https://bcourses.berkeley.edu';

var cs10 = new Canvas(bCoursesURL, {
    token: authToken
});


/************************************************
 * STUFF THAT NEEDS TO BE UPDATED EACH SEMESTER *
 ************************************************/

// LAST UPDATED FOR: SPRING 2016 - ANDY

/**
 * COURSE AND ASSIGNMENT IDS
 */
// These are used in URL building, so strings are OK.
// This is the bcourses course ID
// https://bcourses.berkeley.edu/courses/<course-id>
// Michael Sandbox: 1268501
cs10.courseID = 1408649;

// This is the ID of the "labs" assignment group
// Get the id from this URL:
// https://bcourses.berkeley.edu/api/v1/courses/<course-id>/assignment_groups
// Michael Sandbox: 1593713
cs10.labsID = 1947116;

// The google drive id of the file for the late add form data. Open the file and look at the url:
// For example --> https://docs.google.com/spreadsheets/d/<file-id-we-want>/edit#gid=1772779228
cs10.LATE_ADD_RESPONSES_DRIVE_ID = '1tvWvV_PPL3C9Y5UqMzwWnJpUox1KC1lNDFVvOMs-4zE';
cs10.LATE_ADD_FORM_URL = 'bjc.link/sp16lateadd';
cs10.LATE_ADD_FORM_PASSWORD = 'yzjn7597';

// The start date of the course
cs10.START_DATE = new Date('1/19/2016');

// Internal bCourses assignment IDs, as intergers
// They need to be updated every semester.
// To get these just click on the assignmnet in bcourses. The url will be formatted as:
// https://bcourses.berkeley.edu/courses/<course-id>/assignments/<assignment-id>
cs10.slipDayAssignmentIDs = [
    7259694, // Homework 1
    7259695, // Homework 2
    7259696, // Homework 3
    7259697, // Midterm Project
    //TODO: this is tricky to get if it's a discussion -- must use the API
    4632124, // Explore Post Content
    7259691, // Final Project
];

/** Mapping of extenstion student IDs to bCourses IDs
    If there are no extenstion students, leave this empty
    The UID.. is for the sis_user_id field as bCourses doesn't know about
    extenstion student IDs. To get the UID format go to the user's page in
    bCourses and click "more details" (The extenstion IDs come from the
    BearFacts roster).

    TODO: Consider making this a config for privacy reasons
    However, these IDs don't actually reveal anything.
**/
cs10.SWAP_IDS = {};


/***********************************************
 * MAY NEED TO CHANGE BASED ON COURSE POLICIES *
 ***********************************************/

// SLIP DAY ASSIGNMENTS
cs10.gracePeriodMinutes = 15;
cs10.allowedSlipDays = 3;

// LABS
cs10.labCheckOffPoints = 2;
cs10.labCheckOffLatePts = 1;
var oneWeek = 1000 * 60 * 60 * 24 * 7;
cs10.labSecsAllowedLate = oneWeek;
cs10.firstLab = 2;
cs10.lastLab = 18;
// Add special labs to the array below such as [1,2,3,4]
// For summer there was special extra credit lab 42
// var extraLabs = [42];
// This semester (sp2016) there are no extra labs:
var extraLabs = [];
cs10.extraLabs = new Set(extraLabs);

// LATE ADD POLICIES
// Maps assignment-name: number-of-days-since-student-added-class
cs10.lateAddAssignments = {
    'Homework 1': 4,
    'Homework 2': 7,
    'Homework 3': 12 
}

/**********************
 * SOME HIPCHAT STUFF *
 **********************/

// These are room names that are particularly useful
cs10.LA_ROOM = 'lab_assistant_check-offs';
cs10.TA_ROOM = 'lab_check-off_room';


/**********************************
 * BCOURSES CONFIG AND SOME UTILS *
 **********************************/


// This changes the default ID of a student to tell bCourses to use SIDs
// The default are internal bCourses IDs, but no one knows those.
// See https://bcourses.berkeley.edu/doc/api/file.object_ids.html
cs10.uid = 'sis_user_id:';

// all endpoints are based of the course, at least for our usage
cs10.baseURL = `/courses/${cs10.courseID}/`;

// Shortcut for use in chat error messages
cs10.gradebookURL = `${bCoursesURL+cs10.baseURL}gradebook`;

// Trim an SID and check off extenstion students
// This must be called whenever a SID is used to make sure its the proper format
cs10.normalizeSID = function(sid) {
    sid = sid.trim().replace('X', '');
    if (Object.keys(cs10.SWAP_IDS).indexOf(sid) !== -1) {
        sid = cs10.SWAP_IDS[sid];
    }
    if (sid.indexOf(cs10.uid) !== -1) {
        return sid;
    }
    return cs10.uid + sid;
};


/**
    This posts multiple grades to a single assignment at once.
    Grades should be of the form: { sid: grade }
    Note, bCourses is whacky and updates grades in an async manner:

 **/
cs10.postMultipleGrades = function(assnID, grades, msg) {
    var url = `${cs10.baseURL}assignments/${assnID}/submissions/update_grades`;
    var form = {};
    for (sid in grades) {
        form[`grade_data[${sid}][posted_grade]`] = grades[sid];
    }
    cs10.post(url, '', form, function(error, response, body) {
        var notify = msg ? msg.send : console.log;
        if (error || !body || body.errors) {
            notify('Uh, oh! An error occurred');
            notify(error);
            notify(body.errors || 'No error message...');
            return;
        }
        notify('Success?!');
    });
};

//Export the cs10 object
module.exports = cs10;