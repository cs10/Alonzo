// Description:
//   Handle lab check offs in hipchat. No more paper needed! :D
//
// Dependencies:
//   bcourses library see ./bcourses/index.js
//
// Configuration:
//   See bcourses
//
// Commands:
//   hubot (late) check off <NUM> <SIDs> -- CS10: check off these students
//
// Author:
//  Michael Ball

// This sets up all the bCourses interface stuff
var cs10 = require('./bcourses/');

// CONSTANTS
var CACHE_HOURS = 18;
var FULL_POINTS = cs10.labCheckOffPoints;
var LATE_POINTS = cs10.labCheckOffLatePts;

// Lab Numbers that people can be checked off for.
var MIN_LAB = cs10.firstLab;
var MAX_LAB = cs10.lastLab;

// Loosely look for the phrase check off and the possibility of a number.
var checkOffMessage = /check.*off.*x?\d{1,}/i;
// A generic expression that matches all messages
var containsSIDExp = /.*x?\d{5,}/gi;


// Allowed rooms for doing / managing check offs
var LA_ROOM = 'lab_assistant_check-offs';
var TA_ROOM = 'lab_check-off_room';

// Keys for data that key stored in robot.brain
// Data is stored in the brain in the following ways:
// "CHECKOFF-DATA-N" items for all parsable messages
// 'CHECKOFF-ERRORS' for all messages which are likely checkoffs but errored
var CHECKOFF_DATA  = 'CHECKOFF-DATA-';
var CHECKOFF_ERR   = 'CHECKOFF-ERRORS';
var LAB_CACHE_KEY  = 'LAB_ASSIGNMENTS';

// Global-ish stuff for successful lab checkoff submissions.
var successes;
var failures;
var expectedScores;
var timeoutID;

module.exports = function(robot) {
    //robot.hear(checkOffMessage, {id: 'cs10.check-off-new'}, processCheckOff);
};

function processCheckOff(msg) {
    var roomFn, parsed, errors;
    switch (msg.message.room) {
    case LA_ROOM:
        roomFn = doLACheckoff;
        break;
    case 'Shell': // Move this condition around for command line testing
    case TA_ROOM:
        roomFn = doTACheckoff;
        break;
    default:
        // don't send a warning message if the user likely wasn't trying
        // to check anyone off.
        if (msg.message.text.match(containsSIDExp)) {
            msg.reply('Lab Check offs are not allowed from this room');
        }
        return;
    }

    parsed = extractMessage(msg.message.text);
    errors = verifyErrors(parsed);
    if (errors.length) {
        msg.reply('Your check off was NOT saved!',
                 'ERROR: The following errors occurred.',
                 'Please check what you typed or ask for help.',
                 errors.join('\n'));

         auditLog(CHECKOFF_ERR, msg, parsed);
        return;
    }

    auditLog(CHECKOFF_DATA + parsed.lab, msg, parsed);

    roomFn(parsed, msg);
}

/**
 *
 *
 */
function doCheckoff(msg, data, type) {
    var isSketchy;

    if (isSketchy) {
        // Do warnings.
        // We probably want to alert people.
        msg.reply();
        msg.send('@headTA');


        if (type != 'TA') {
            // TAs are allowed to post sketchy scores...
            return;
        }
    }

    // Post grades.
}

// FIXME -- protect against infinite loops!!
function doTACheckoff(data, msg) {
    var assignments = robot.brain.get(LAB_CACHE_KEY);

    if (!assignments || !cacheIsValid(assignments)) {
        msg.send('Refreshing lab assignments from bCourses...')
        robot.logger.log('ALONZO: Refreshing Lab assignments cache.');
        cacheLabAssignments(doTACheckoff, [data, msg]);
        return;
    }

    msg.send('TA: Checking Off ' + data.sids.length + ' students for lab ' +
        data.lab + '.');

    var assnID = getAssignmentID(data.lab, assignments, msg);

    if (!assnID) {
        msg.send('Well, crap...I can\'t find lab ' + data.lab + '.\n' +
                 'Check to make sure you put in a correct lab number.\n' +
                 cs10.gradebookURL);
        return;
    }

    // FIXME -- check whether 1 or more scores.
    // FIXME -- or async this
    successes = 0;
    failures = 0;
    expectedScores = data.sids.length;
    data.sids.forEach(function(sid) {
        postSignleAssignment(assnID, sid, data.points, msg);
    });

    // wait till all requests are complete...hopefully.
    // Or send a message after 30 seconds
    timeoutID = setTimeout(function() {
        var scores = successes + ' score' + (successes == 1 ? '' : 's');
        msg.send('After 30 seconds: ' + scores + ' successfully submitted.');
    }, 30 * 1000);
}

function doLACheckoff(data, msg) {

    var sketchy = isSketchy(checkoff);
    if (sketchy) {
        msg.send('ERROR: You\'re being sketchy right now...\n',
                 sketchy.join('\n'),
                 'This checkoff will not be saved. :(');
        return;
    };
    // Post scores to bCourses
    var scores = 'score' + (data.sids.length === 1 ? '' : 's');
    msg.send('LA: Saved ' + data.sids.length + ' student '+ scores +
             ' for lab ' + data.lab  + '.');
}


//////////////////////////////////////////////////////////////////////////////
// Parsing / Validation
//////////////////////////////////////////////////////////////////////////////

/**
 *  Parse the message into a common formatted object.
 *  @param {string} text - message text.
 */
function extractMessage(text) {
    // Parse the following components out of a message.
    var findSIDs = containsSIDExp,
        findLate = /late/i,
        findLab  = /\d{1,2}/;

    var labNo  = text.match(findLab) || [0],
        isLate = text.match(findLate) != null,
        SIDs   = text.match(findSIDs);

    SIDs = SIDs.map(cs10.normalizeSID);

    return {
        lab: labNo[0],
        sids: SIDs,
        isLate: isLate
    };
}

/**
 *  Store the parsed message in the brain so it can be audited if need be.
 *  Audits will be most necessary for "sketchy" lab check-offs.
 *  @param {string} key - the location in the brain to store data.
 *  @param {message} msg - Hubot's message object that has all the user info.
 *  @param {object} data - data to be saved in the brain.
 */
function auditLog(key, msg, data) {
    var toStore = {
        room: msg.message.room,
        msg: msg.message.text,
        user: msg.message.user.name,
        time: (new Date()).toString(),
    };
    for (key in data) {
        toStore[key] = data[key];
    }

    var brainData = robot.brain.get(key) || [];
    brainData.push(toStore);
    robot.brain.set(key, brainData);
}

// Return an array of error messages that prevent the checkoff from being saved.
function verifyErrors(parsed) {
    var errors = [];
    if ((parsed.lab < MIN_LAB || parsed.lab > MAX_LAB) && parsed.lab != 42) {
        errors.push('The lab number: ' + parsed.lab + ' is not a valid lab!');
        errors.push('Please specify the lab number before all student ids.');
    }
    if (parsed.sids.length < 1) {
        errors.push('No SIDs were found.');
    }

    return errors;
}

//////////////////////////////////////////////////////////////////////////////
// Verifying Sketchiness
//////////////////////////////////////////////////////////////////////////////

/** Determine whether an LA checkoff is sketchy.
    "Sketchy" means: More than 1 week paste the due date,
    Or: Checked off during non-lab hours
    If a checkoff is sketchy, return an arry of warnings about why.
**/
function isSketchy(co, assingments) {
    var results = [],
        date = new Date(co.time),
        day  = date.getUTCDay(),
        hour = date.getUTCHours(),
        oneWeek = 1000 * 60 * 60 * 24 * 7;
    // NOTE: Heroku server time is in UTC
    // PST, checkoffs should be between 9am - 8pm FIXME -- CONFIG THIS
    // This means, in UTC GOOD check offs are <=5, >=17 hours
    if (hour > 6 || hour < 17) {
        results.push('Check offs should happen during lab or office hours!');
    }
    // FIXME -- is late friday a saturday in UTC??
    if (day == 0 || day == 6) {
        result.push('Check offs should happen during the week!');
    }

    // FIXME -- this assumes the cache is valid.
    var assignments = robot.brain.get(LAB_CACHE_KEY),
        dueDate = findLabByNum(co.lab, assignments.labs).due_at;
        dueDate = new Date(dueDate);

    if (!co.late && date - dueDate > oneWeek) {
        results.push('This checkoff is past due!');
    }
    return results;
}

/*
A way of building a function and an a corresponding error message.
If check passes → error is shown
Each function takes in a checkoff object, and the bCourses assignment.
{ }
bCourses:
*/

var sketchyTests = {
    isDuringDayTime: {
        test: function(co, assn) {},
        message: ''
    },
    isDuringWeek: {
        test: function(co, assn) {},
        message: ''
    },
    isOnTime: {
        test: function(co, assn) {},
        message: ''
    },
    hasValidSIDs: {
        test: function(co, assn) {},
        message: ''
    }
};

//////////////////////////////////////////////////////////////////////////////
// Posting Scores
//////////////////////////////////////////////////////////////////////////////

function postSignleAssignment(assnID, sid, score, msg) {
var scoreForm = 'submission[posted_grade]=' + score,
    url = cs10.baseURL + 'assignments/' + assnID + '/submissions/' + sid;

    cs10.put(url, '', scoreForm, verifyScoreSubmission(sid, score, msg));
}

// Error Handler for posting lab check off scores.
function verifyScoreSubmission(sid, points, msg) {
    return function(error, response, body) {
        var errorMsg = 'Problem encountered for ID: ' + sid.replace(cs10.uid, '');
        if (body.errors || !body.grade || body.grade != points.toString()) {
            failures += 1;
            if (body.errors && body.errors[0]) {
                errorMsg += '\nERROR:\t' + body.errors[0].message;
            }
            errorMsg += '\n' + 'Please enter the score directly in bCourses.';
            errorMsg += '\n' + cs10.gradebookURL;
            msg.send(errorMsg);
        } else {
            successes += 1;
        }
        if (successes + failures === expectedScores) {
            clearTimeout(timeoutID);
            if (successes) {
                var scores = successes + ' score' + (successes == 1 ? '' : 's');
                msg.send(scores + ' successfully updated.');
            }
            if (failures) {
                msg.send('WARING: ' + failures + ' submissions failed.');
            }
        }
    };
}


//////////////////////////////////////////////////////////////////////////////
// Utility
//////////////////////////////////////////////////////////////////////////////

// Return the bCourses lab object matching the CS10 lab number
// All labs are named "<#>. <Lab Title>"
function findLabByNum(num, labs) {
    var result;
    labs.some(function(lab) {
        var labNo = lab.name.match(/^(\d{1,2})/);
        if (labNo[1] == num) {
            result = lab;
            return true;
        }
        return false;
    });
    return result || { id: 0 };
}

function getAssignmentID(num, assignments) {
    var lab = findLabByNum(num, assignments.labs);
    return lab.id || false;
}

//////////////////////////////////////////////////////////////////////////////
// Caching
//////////////////////////////////////////////////////////////////////////////

// TODO: document wacky callback thingy
function verifyCache(callback, args) {
    var cached = robot.brain.get(LAB_CACHE_KEY);
    if (cacheIsValid(cached)) {
        callback.apply(null, args);
    } else {
        cacheLabAssignments(callback, args);
    }
}


function cacheLabAssignments(callback, args) {
    var url   = cs10.baseURL + 'assignment_groups/' + cs10.labsID,
        query = {'include[]': 'assignments'};

    cs10.get(url, query, function(error, response, body) {
        var assignments = body.assignments;
        var data = {};

        data.time = (new Date()).toString();
        data.labs = assignments;

        robot.brain.set(LAB_CACHE_KEY, data);

        if (callback) {
            callback.apply(null, args);
        }
    });
}

function cacheIsValid(assignments) {
    var labsExist = assignments.labs ? assignments.labs.length > 0 : false;
    var date = assignments.time;
    var diff = (new Date()) - (new Date(date));
    return labsExist && diff / (1000 * 60 * 60) < CACHE_HOURS;
}