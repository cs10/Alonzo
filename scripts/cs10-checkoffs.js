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
//   hubot (late) check off <NUM> (late) <SIDs> -- check off these students
//
// Author:
//  Michael Ball

// This sets up all the bCourses interface stuff
var cs10 = require('./bcourses/');

// CONSTANTS
var CACHE_HOURS = 6;
var fullPoints = 2;
var latePoints = fullPoints / 2;


// A long regex to parse a lot of different check off commands.
var checkOffRegExp = /(late\s*)?(?:lab[- ])?check(?:ing)?(?:[-\s])?off\s+(\d+)\s*(late)?\s*((?:\d+\s*)*)\s*/i;
// A generic expression that matches all messages
var containsSIDExp = /.*x?\d{5,}/i;


// Allowed rooms for doing / managing check offs
var LA_ROOM = 'lab_assistant_check-offs';
var TA_ROOM = 'lab_check-off_room';

// Keys for data that key stored in robot.brain
var laDataKey      = 'LA_DATA';
var LAB_CACHE_KEY  = 'LAB_ASSIGNMENTS';

// Global-ish stuff for successful lab checkoff submissions.
var successes;
var failures;
var expectedScores;
var timeoutID;

module.exports = function(robot) {

    robot.hear(checkOffRegExp, function(msg) {
        // Develop Condition: || msg.message.room === 'Shell'
        if (msg.message.room === LA_ROOM) {
            doLACheckoff(msg);
        } else if (msg.message.room === TA_ROOM || msg.message.room === 'Shell') {
            doTACheckoff(msg);
        } else {
            msg.send('Lab Check offs are not allowed from this room');
        }
    });

    robot.respond(/.*gradebook.*/i, function(msg) {
        msg.send(cs10.gradebookURL);
    })

    // Commands for managing LA check-off publishing
    robot.respond(/show la data/i, function(msg) {
        if (msg.message.room === TA_ROOM || msg.message.room === 'Shell') {
            msg.send('/code\n' + JSON.stringify(robot.brain.get('LA_DATA')));
        }
    });

    robot.respond(/refresh\s*(bcourses)?\s*cache/i, function(msg) {
        robot.brain.remove(LAB_CACHE_KEY);
        msg.send('Waiting on bCourses...');
        cacheLabAssignments(msg.send, ['Assignments Cache Refreshed']);
    });

    // Command Review LA data
    // Output total, num sketchy
    robot.respond(/\s*review\s*la(b\s*assistant)?\s*scores?\s*/i, function(msg) {
        msg.send
    })
    // submit LA scores

    // review sketchy scores
};



/* Hubot msg.match groups:
[ '@Alonzo check-off 12 late 1234 1234 1234',
  undefined,         // Late?
  '12',              // Lab Number
  'late',            // Late or undefined
  '1234 1234 1234',  // SIDs
  index: 0,
  input: '@Alonzo check-off 12 late 1234 1234 1234' ]
*/
/* Proccess the regex match into a common formatted object */
function extractMessage(match) {
    var result = {};

    var labNo  = match[2],
        isLate = match[1] !== undefined || match[3] !== undefined,
        SIDs   = match[4].trim().split(/[ \t\n]/g);

    SIDs = SIDs.filter(function(item) { return item.trim() !== '' });
    SIDs = SIDs.map(cs10.normalizeSID);

    result.lab    = labNo;
    result.sids   = SIDs;
    result.isLate = isLate;
    result.points = isLate ? latePoints : fullPoints;

    return result;
}

// Cache
// TODO: document wacky callback thingy
// FIXME -- protect against infinite loops!!
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


function doTACheckoff(msg) {
    var data = extractMessage(msg.match);
    var assignments = robot.brain.get(LAB_CACHE_KEY);

    msg.send('TA: Checking Off ' + data.sids.length + ' students for lab ' +
        data.lab + '.');

    if (!assignments || !cacheIsValid(assignments)) {
        console.log('ALONZO: Refreshing Lab assignments cache.');
        cacheLabAssignments(doTACheckoff, [msg]);
        return;
    }

    var assnID = getAssignmentID(data.lab, assignments, msg);

    if (!assnID) {
        msg.send('Well, crap...I can\'t find lab ' + data.lab + '.');
        msg.send('Check to make sure you put in a correct lab number.');
        msg.send(cs10.gradebookURL);
        return;
    }

    successes = 0;
    failures = 0;
    expectedScores = data.sids.length;
    data.sids.forEach(function(sid) {
        postLabScore(sid, assnID, data.points, msg);
    });

    // wait till all requests are complete...hopefully.
    // Or send a message after 30 seconds
    timeoutID = setTimeout(function() {
        var scores = successes + ' score' + (successes == 1 ? '' : 's');
        msg.send('After 30 seconds: ' + scores + ' successfully submitted.');
    }, 30 * 1000);
}

function doLACheckoff(msg) {
    var data = extractMessage(msg.match);
    // TODO: Note that this might change, these are loose rough bounds
    // We could always search for values from the lab assignments list.
    var minLab = 2, maxLab = 20;
    if (data.lab < 2 || data.lab > 20) {
        msg.send('ERROR: The lab ' + data.lab + ' does not exist!!\n' +
            'Score were NOT saved, please try again. Thanks! (heart)');
        return;
    }

    var LA_DATA = robot.brain.get('LA_DATA') || [];
    LA_DATA.push({
        lab: data.lab,
        late: data.isLate,
        sid: data.sids,
        points: data.points,
        time:  (new Date()).toString(),
        laname: msg.message.user.name,
        uid: msg.message.user.id,
        text: msg.message.text
    });

    robot.brain.set('LA_DATA', LA_DATA);
    var scores = 'score' + (data.sids.length === 1 ? '' : 's');
    msg.send('LA: Saved ' + data.sids.length + ' student '+ scores +
             ' for lab ' + data.lab  + '.');

}

function postLabScore(sid, labID, score, msg) {
var scoreForm = 'submission[posted_grade]=' + score,
    url = cs10.baseURL + 'assignments/' + labID + '/submissions/' + sid;

    cs10.put(url , '', scoreForm, handleResponse(sid, score, msg));
}

// Error Handler for posting lab check off scores.
function handleResponse(sid, points, msg) {
    return function(error, response, body) {
        var errorMsg = 'Problem encountered for ID: ' + sid.replace(cs10.uid, '');
        if (body.errors || !body.grade || body.grade != points.toString()) {
            failures += 1;
            if (body.errors && body.errors[0]) {
                errorMsg += '\nERROR:\t' + body.errors[0].message;
            }
            errorMsg += '\n' + 'Please enter the score directly in bCoureses.';
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

function cacheIsValid(assignments) {
    var labsExist = assignments.labs ? assignments.labs.length > 0 : false;
    var date = assignments.time;
    var diff = (new Date()) - (new Date(date));
    return labsExist && diff / (1000 * 60 * 60) < CACHE_HOURS;
}


function getAssignmentID(num, assignments) {
    var labs = assignments.labs,
        assnID;

    labs.some(function(lab) {
        var assnName  = lab.name;
        // All labs are named "<#>. <Lab Title>"
        // TODO: Use regex in the future /^\d{1,2}/
        var searchNum = assnName.split('.');

        if (searchNum[0] == num) {
            assnID = lab.id;
            return true;
        }
        return false;
    });

    return assnID;
}


/** Determine whether an LA checkoff is sketchy.
    "Sketchy" means: More than 1 week paste the due date,
    Or: Checked off during non-lab hours
**/
