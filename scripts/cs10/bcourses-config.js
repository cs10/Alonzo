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


/**
 * COURSE AND ASSIGNMENT IDS
 * The course ID is the standard CS10 course id, easily obtainable from the URL:
 * http://bcourses.berkeley.edu/courses/<id>/ when you are viewing the CS10
 * page in bCourses.
 * The labsID is the id of the "assignment group" for all lab check offs.
 * To get this id...... TODO.
 */
// These are used in URL building, so strings are OK.
// This is the bcourses course ID
// https://bcourses.berkeley.edu/courses/<course>
// Michael Sandbox: 1268501
cs10.courseID = 1371647;
// This is the ID of the "labs" assignment group
// Get the id from this URL:
// https://bcourses.berkeley.edu/api/v1/courses/XXX/assignment_groups
// Michael Sandbox: 1593713
cs10.labsID = 1846637;

// The google drive id of the file for the late add form data. Open the file and look at the url:
// For example --> https://docs.google.com/spreadsheets/d/1PFAHirAhvRkTE39QStPLYmVl-8ec4qNWjfg5m_7wfII/some_extra_stuff
// the id is: 1PFAHirAhvRkTE39QStPLYmVl-8ec4qNWjfg5m_7wfII
cs10.LATE_ADD_DRIVE_ID = '1PFAHirAhvRkTE39QStPLYmVl-8ec4qNWjfg5m_7wfII';

// Internal bCourses assignment IDs, as intergers
// They need to be updated every semester.
// Use the bCourses API courses/X/assignments to get these IDs or the page URLs
// https://bcourses.berkeley.edu/api/v1/courses/XXX/assignments
cs10.slipDayAssignmentIDs = [
    6644471, // Homework 1
    6644472, // Homework 2
    6930656, // Homework 3
    6644475, // Midterm Project
    //TODO: this is tricky to get if it's a discussion -- must use the API
    6644470, // Explore Post Content
    6644476, // Final Project
];

/** Mapping of extenstion student IDs to bCourses IDs
    If there are no extenstion students, leave this empty
    The UID.. is for the sis_user_id field as bCourses doesn't know about
    extenstion student IDs. To get the UID format go to the user's page in
    bCourses and click "more details" (The extenstion IDs come from the
    BearFacts roster.)

    TODO: Consider making this a config for privacy reasons
    However, these IDs don't actually reveal anything.
**/
cs10.SWAP_IDS = {};


/***********************************************
 * MAY NEED TO CHANGE BASED ON COURSE POLICIES *
 ***********************************************/


cs10.gracePeriodMinutes = 15;
cs10.allowedSlipDays = 3;
cs10.firstLab = 2;
cs10.lastLab = 18;
cs10.labCheckOffPoints = 2; // These could be changed as the course changes.
cs10.labCheckOffLatePts = 1;


/**********************
 * SOME HIPCHAT STUFF *
 **********************/


//These are room names that are particularly useful
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