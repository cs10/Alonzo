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

// LAST UPDATED FOR: Spring 2021 - Yolanda

/**
 * COURSE AND ASSIGNMENT IDS
 */
// These are used in URL building, so strings are OK.
// This is the bcourses course ID
// https://bcourses.berkeley.edu/courses/<course-id>
// Michael Sandbox: 1268501
cs10.courseID = 1513042;

// DOES NOT CHANGE: all endpoints are based of the course, at least for our usage
cs10.baseURL = `/courses/${cs10.courseID}/`;

// DOES NOT CHANGE: Shortcut for use in chat error messages
cs10.gradebookURL = `${bCoursesURL+cs10.baseURL}gradebook`;

// This is the ID of the "labs" assignment group
// Get the id from this URL:
// https://bcourses.berkeley.edu/api/v1/courses/<course-id>/assignment_groups
// Michael Sandbox: 1593713
cs10.labsID = 2182850;

// The google drive id of the file for the late add form data. Open the file and look at the url:
// For example --> https://docs.google.com/spreadsheets/d/<file-id-we-want>/edit#gid=1772779228
cs10.LATE_ADD_RESPONSES_DRIVE_ID = '1tvWvV_PPL3C9Y5UqMzwWnJpUox1KC1lNDFVvOMs-4zE'; // ACTUAL FORM not updated for su16
// cs10.LATE_ADD_RESPONSES_DRIVE_ID = '1-5RZESFvsQ02JNSR3hWXX11qpFoFkmWrnQDoFdZWZ5c'; // A COPY OF THE ACTUAL FORM TO USE FOR TESTING

// The start date of the course (this needs to be a date object)
// Monday of the first week of classes.
cs10.START_DATE = new Date('1/17/2022');


// The quest due date (this just needs to be a string)
cs10.questDate = '2/8/2022';

// TA Emails taken from the website
cs10.TA_EMAILS = {
    'Yolanda': 'yashen@berkeley.edu',
    'Shannon': 'shannon_hearn@berkeley.edu'
};

// Use the name that you would use in hipchat for example @Steven --> "Steven"
cs10.LAB_ASSISTANT_MANAGER = "shannonhearnberkeleyedu";

// Helpful link for TAs
cs10.HELP_LINKS = [
  'AI Attendance: http://bjc.link/sp21ai',
  'Discussion Attendance: http://bjc.link/sp21disc',
  'Zoom Room: http://bjc.link/zoomroomsp21'
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

// ASSIGNMENT IDS -- Used for Slip Day Calculation
// Internal bCourses assignment IDs, as integers
// They need to be updated every semester.
// To get these just click on the assignmnet in bcourses. The url will be formatted as:
// https://bcourses.berkeley.edu/courses/<course-id>/assignments/<assignment-id>
var hw1_id = 8054982,
    hw2_id = 8055006,
    hw3_id = 8055018,
    midtermProj_id = 8055066,
    explorePost_id = 8055061,
    finalProj_id = 8055068;

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
cs10.labCheckOffPoints = 2.5;
cs10.labCheckOffLatePts = 2.5;
var threeDays = 1000 * 60 * 60 * 24 * 3;
cs10.labSecsAllowedLate = threeDays;
// cs10.labsSecsAllowedLate = 0;
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
 * SOME SLACK STUFF *
 **********************/

// These are room names that are particularly useful
// LA_ROOM is use for Lab Checkoffs
cs10.LA_ROOM = 'C02UFNRRHS8';
cs10.TA_ROOM = 'C02TYS09P3J';
cs10.RQ_ROOM = 'C02TYS09P3J';


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
