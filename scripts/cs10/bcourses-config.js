// Use the Canvas API library, written just for CS10
var Canvas = require('canvas-lms');
var authToken = process.env.HUBOT_CANVAS_KEY;
var testURL = 'https://ucberkeley.test.instructure.com';
var bCoursesURL = 'https://bcourses.berkeley.edu';

// TOGGLE WHETHER TO USE THE TEST INSTANCE OR THE REAL INSTANCE OF BCOURSES
var TEST = false;

// NODE-CANVAS-LMS CREATION
var host = bCoursesURL;
if (TEST) {
    host = testURL;
}
var cs10 = new Canvas(host, {
    token: authToken
});

// This is used by CI to make sure that we never deploy with test set to true
cs10.test = TEST;

/************************************************
 * STUFF THAT NEEDS TO BE UPDATED EACH SEMESTER *
 ************************************************/

// LAST UPDATED FOR: Fall 2018- Mansi

/**
 * COURSE AND ASSIGNMENT IDS
 */
// These are used in URL building, so strings are OK.
// This is the bcourses course ID
// https://bcourses.berkeley.edu/courses/<course-id>
// Michael Sandbox: 1268501
cs10.courseID = 1474574;

// DOES NOT CHANGE: all endpoints are based of the course, at least for our usage
cs10.baseURL = `/courses/${cs10.courseID}/`;

// DOES NOT CHANGE: Shortcut for use in chat error messages
cs10.gradebookURL = `${bCoursesURL+cs10.baseURL}gradebook`;

// This is the ID of the "labs" assignment group
// Get the id from this URL:
// https://bcourses.berkeley.edu/api/v1/courses/<course-id>/assignment_groups
// Michael Sandbox: 1593713
cs10.labsID = 2081106;

// The google drive id of the file for the late add form data. Open the file and look at the url:
// For example --> https://docs.google.com/spreadsheets/d/<file-id-we-want>/edit#gid=1772779228
cs10.LATE_ADD_RESPONSES_DRIVE_ID = '1tvWvV_PPL3C9Y5UqMzwWnJpUox1KC1lNDFVvOMs-4zE'; // ACTUAL FORM not updated for su16
// cs10.LATE_ADD_RESPONSES_DRIVE_ID = '1-5RZESFvsQ02JNSR3hWXX11qpFoFkmWrnQDoFdZWZ5c'; // A COPY OF THE ACTUAL FORM TO USE FOR TESTING

// The start date of the course (this needs to be a date object)
cs10.START_DATE = new Date('8/22/2018');

// The quest due date (this just needs to be a string)
cs10.questDate = new Date('9/18/2018');

// TA Emails taken from the website
cs10.TA_EMAILS = {
    'Mansi': 'mansi@cs10.org',
    'Aaron': 'aaron@cs10.org',
    'Angela': 'angela@cs10.org',
    'Bhumika': 'bhumika@cs10.org',
    'Brendan': 'brendan@cs10.org',
    'Niket': 'niket@cs10.org',
    'Niki': 'niki@cs10.org',
    'Matthew': 'matthew@cs10.org',
    'Maxson': 'maxson@cs10.org',
    'Schuyler': 'schuyler@cs10.org',
    'Varda': 'varda@cs10.org'
};

// Use the name that you would use in hipchat for example @Steven --> "Steven"
cs10.LAB_ASSISTANT_MANAGER = "emansishah";

// ASSIGNMENT IDS
// Internal bCourses assignment IDs, as integers
// They need to be updated every semester.
// To get these just click on the assignmnet in bcourses. The url will be formatted as:
// https://bcourses.berkeley.edu/courses/<course-id>/assignments/<assignment-id>
var hw1_id = 7914866,
    hw2_id = 7914867,
    hw3_id = 7914868,
    midtermProj_id = 7914869,
    explorePost_id = 7914861,
    finalProj_id = 7914863;

// Helpful link for TAs
cs10.HELP_LINKS = [
    'LA Attendance: http://bjc.link/fa18LA',
    'Late Add Deadlines Form: http://bjc.link/fa18lateadds',
    'Late Assignments Form: https://goo.gl/forms/ZwxClCQTpyvDKAz42',
    'Student Billing Account Verification: http://bjc.link/fa18iclickeragree',
    'iClicker Checkout (TAs fill out): http://bjc.link/fa18iclickercheckout',
    'Register iClicker: http://bjc.link/fa18iclickerreg'
];

// Links to backup sites for when things go to hell
cs10.BACKUP_LINKS = [
    'Snap! Backup: http://cs10.org/snap',
    'Lab Backup (might be out of order): http://beautyjoy.github.io/bjc-r/'
];

/** Mapping of extenstion student IDs to bCourses IDs
    If there are no extenstion students, leave this empty
    The UID.. is for the sis_user_id field as bCourses doesn't know about
    extenstion student IDs. To get the UID format go to the user's page in
    bCourses and click "more details" (The extenstion IDs come from the
    BearFacts roster).

    TODO: Consider making this a config for privacy reasons
    However, these IDs don't actually reveal anything.

    NOTE: THIS IS NOT NEEDED ANYMORE I THINK - ANDY SP2016
**/
cs10.SWAP_IDS = {};


/***********************************************
 * MAY NEED TO CHANGE BASED ON COURSE POLICIES *
 ***********************************************/

// This is the email that is linked to alonzo (used by the late add emailer)
cs10.ADMIN_EMAIL = 'alonzo-bot@berkeley.edu';

// SLIP DAY ASSIGNMENTS
cs10.gracePeriodMinutes = 15;
cs10.allowedSlipDays = 3;
cs10.slipDayAssignmentIDs = [
    hw1_id,
    hw2_id,
    hw3_id,
    midtermProj_id,
    //TODO: this is tricky to get if it's a discussion -- must use the API
    explorePost_id,
    finalProj_id
];

// LABS
cs10.labCheckOffPoints = 2;
cs10.labCheckOffLatePts = 1;
//var oneWeek = 1000 * 60 * 60 * 24 * 7;
//cs10.labSecsAllowedLate = oneWeek;
cs10.labsSecsAllowedLate = 0;
cs10.firstLab = 2;
cs10.lastLab = 19;

// Add special labs to the array below such as [1,2,3,4]
// For summer there was special extra credit lab 42
// var extraLabs = [42];
// This semester (sp2016) there are no extra labs:
cs10.specialLabs = [];

// LATE ADD POLICIES
// For example an entry below of the form:
//  1234567 : {days: 4, name: 'Homework'}
// --> means that assignment with id 1234567 is due 4 days after a student joins the class and is named Homework
// Put the ids as variables in the section above entitled 'UPDATE EVERY SEMESTER'
// These assignments should appear in the order that they are due in for the semester
cs10.lateAddAssignments = {
    [hw1_id]: {days: 4, name: 'Homework 1'},
    [hw2_id]: {days: 7, name: 'Homework 2'},
    [hw3_id]: {days: 12, name: 'Homework 3'}
};

/**********************
 * SOME HIPCHAT STUFF *
 **********************/

// These are room names that are particularly useful
cs10.LA_ROOM = 'GC8MPM36X';
cs10.TA_ROOM = 'GC8RMMVBL';
cs10.STAFF_ROOM = 'GC90CNUGM';
cs10.RQ_ROOM = 'GD5HXUE84';


/**********************************
 * BCOURSES CONFIG AND SOME UTILS *
 **********************************/


// This changes the default ID of a student to tell bCourses to use SIDs
// The default are internal bCourses IDs, but no one knows those.
// See https://bcourses.berkeley.edu/doc/api/file.object_ids.html
cs10.uid = 'sis_user_id:';

// Trim an SID and check off extenstion students
// This must be called whenever a SID is used to make sure its the proper format
cs10.normalizeSID = function(sid) {
    sid = sid.toString().trim().replace('X', '');
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
