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
//   hubot show la data -- dumb the raw saved Lab Assistant check offs.
//   hubot review la scores -- stats abput LA scores. Will punlish the safe scores to bCourses
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
var containsSIDExp = /.*x?\d{5,}/gi;


// Allowed rooms for doing / managing check offs
var LA_ROOM = 'lab_assistant_check-offs';
var TA_ROOM = 'lab_check-off_room';

// Keys for data that key stored in robot.brain
var LA_DATA_KEY      = 'LA_DATA';
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
            msg.send('/code\n' + JSON.stringify(robot.brain.get(LA_DATA_KEY)));
        }
    });

    robot.respond(/refresh\s*(bcourses)?\s*cache/i, function(msg) {
        robot.brain.remove(LAB_CACHE_KEY);
        msg.send('Waiting on bCourses...');
        cacheLabAssignments(msg.send, ['Assignments Cache Refreshed']);
    });

    // Command Review LA data
    // Output total, num sketchy
    robot.respond(/\s*review\s*la(b\s*assistant)?\s*(?:scores|data)?\s*/i, function(msg) {

    })
    // submit LA scores

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

    var LA_DATA = robot.brain.get(LA_DATA_KEY) || [];
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

    robot.brain.set(LA_DATA_KEY, LA_DATA);
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
    return result;
}

function getAssignmentID(num, assignments) {
    var lab = findLabByNum(num, assignments.labs);
    return lab.id || false;
}

// Use a newer bCourses API
// TODO: Test this API then re-write the nasty submissions function above
// https://bcourses.berkeley.edu/doc/api/submissions.html#method.submissions_api.bulk_update
// Note returning a "progress" w/ a URL -- this should be investigated
function sendLAStats(processed) {

}

/** Verify all the LA data for easy assignment posting
    Each set of checkoffs creates:
    <num>: { ontime: [], late: [] }
    There is one object for safe check-offs and one for sketchy checkoffs
**/
function reviewLAData(data) {
    var safe = {};
    var sketchy = { msgs: [] };

    // Prevent Checking if an array exists
    for(var i = 1; i < 20; i += 1) {
        safe[i] = { ontime: [], late: [] };
        skethcy[i] = { ontime: [], late: [] };
    }

    data.forEach(function(checkoff) {
        var sketch = isSketchy(checkoff);
        var list_type =   checkoff.late ? 'late' : 'ontime';
        var lab = checkoff.lab;
        var obj = safe[lab];
        if (sketch) {
            obj = sketchy[lab];
            list = 'late'; // FIXME -- not sure this is right?
            sketchy.msgs.append(checkoff);
        }
        obj[list].push(checkoff.sid);
    });

    return {safe: safe, sketchy: skethcy };
}

/** Determine whether an LA checkoff is sketchy.
    "Sketchy" means: More than 1 week paste the due date,
    Or: Checked off during non-lab hours
**/
function isSketchy(co) {
    var date = new Date(co.time);
    var hour = date.getUTCHours();
    // NOTE: Heroku server time is in UTC
    // PST, checkoffs should be between 9am - 8pm FIXME -- CONFIG THIS
    // This means, in UTC GOOD check offs are <=5, >=17 hours
    if (hour > 6 || hour < 17) {
        return false;
    }
    var oneWeek = 1000 * 60 * 60 * 24 * 7;
    // FIXME -- this assumes the cache is valid.
    var assignments = robot.brain.get(LAB_CACHE_KEY),
        dueDate = findLabByNum(co.lab, assignments.labs).due_at;
    dueDate = new Date(dueDate);
    return co.late || date - dueDate <= oneWeek;
}

function clearSafeScores() {

}
