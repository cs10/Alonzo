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
var CACHE_HOURS = 12;
var FULL_POINTS = cs10.labCheckOffPoints;
var LATE_POINTS = cs10.labCheckOffLatePts;

// Lab Numbers that people can be checked off for.
var MIN_LAB = 2;
var MAX_LAB = 18;

// Allowed rooms for doing / managing check offs
var LA_ROOM = 'lab_assistant_check-offs';
var TA_ROOM = 'lab_check-off_room';

// Keys for data that key stored in robot.brain
var LA_DATA_KEY    = 'LA_DATA';
var LAB_CACHE_KEY  = 'LAB_ASSIGNMENTS';

// Global-ish stuff for successful lab checkoff submissions.
var successes;
var failures;
var expectedScores;
var timeoutID;

module.exports = function(robot) {
    // Loosely look for the phrase check off and the possibility of a number.
    var couldBeCheckOff = /check.*off.*x?\d{1,}/i;
    robot.hear(couldBeCheckOff, processCheckOff);

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
    robot.respond(/review la (scores|data)/i, function(msg) {
        var laScores = reviewLAData(robot.brain.get(LA_DATA_KEY));
        sendLAStats(laScores, msg);
    });

    // submit LA scores
    robot.respond(/post la scores/i, function(msg) {
        if (msg.message.room !== TA_ROOM && msg.message.room !== 'Shell') {
            return;
        }
        var laScores = reviewLAData(robot.brain.get(LA_DATA_KEY));
        sendLAStats(laScores, msg);
        postGrades(laScores, msg);
    });
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
        msg.send('Lab Check offs are not allowed from this room');
        return;
    }
    
    parsed = extractMessage(msg.message.text);
    errors = verifyErrors(parsed);
    if (errors.length) {
        msg.send('Your check off was NOT saved!',
                 'ERROR: The following errors occurred.',
                 errors.join('\n'));
        return;
    }
    // Verify Cache Here
    roomFn(parsed, msg);
}

/* Proccess the regex match into a common formatted object */
function extractMessage(text) {
    // Parse the following components out of a message.
    var findSIDs = /x?\d{5,}/g,
        findLate = /late/i,
        findLab = /\d{1,2}/;

    var labNo  = text.match(findLab) || [0],
        isLate = text.match(findLate) != null,
        SIDs   = text.match(findSIDs);

    SIDs = SIDs.filter(function(item) { return item.trim() !== '' });
    SIDs = SIDs.map(cs10.normalizeSID);

    return {
        lab: labNo[0],
        sids: SIDs,
        isLate: isLate,
        points: isLate ? LATE_POINTS : FULL_POINTS
    };
}

// Return an array of error messages that prevent the checkoff from being saved.
function verifyErrors(parsed) {
    var errors = [];
    if (parsed.lab < MIN_LAB || parsed.lab > MAX_LAB) {
        errors.push('The lab number: ' + parsed.lab + ' is not a valid lab!');
        errors.push('Please specify the lab number before all student ids.');
    }
    if (parsed.sids.length < 1) {
        errors.push('No SIDs were found.');
    }
    
    return errors;
}
// Cache
// TODO: document wacky callback thingy
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

// FIXME -- protect against infinite loops!!
function doTACheckoff(data, msg) {
    var assignments = robot.brain.get(LAB_CACHE_KEY);

    msg.send('TA: Checking Off ' + data.sids.length + ' students for lab ' +
        data.lab + '.');

    if (!assignments || !cacheIsValid(assignments)) {
        robot.logger.log('ALONZO: Refreshing Lab assignments cache.');
        cacheLabAssignments(doTACheckoff, [data, msg]);
        return;
    }

    var assnID = getAssignmentID(data.lab, assignments, msg);

    if (!assnID) {
        msg.send('Well, crap...I can\'t find lab ' + data.lab + '.\n' +
                 'Check to make sure you put in a correct lab number.\n' +
                 cs10.gradebookURL);
        return;
    }

    // FIXME -- check whether 1 or more scores.
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
        time: (new Date()).toString(),
        laname: msg.message.user.name
    });

    robot.brain.set(LA_DATA_KEY, LA_DATA);
    var scores = 'score' + (data.sids.length === 1 ? '' : 's');
    msg.send('LA: Saved ' + data.sids.length + ' student '+ scores +
             ' for lab ' + data.lab  + '.');

}

function postSignleAssignment(assnID, sid, score, msg) {
var scoreForm = 'submission[posted_grade]=' + score,
    url = cs10.baseURL + 'assignments/' + assnID + '/submissions/' + sid;

    cs10.put(url , '', scoreForm, verifyScoreSubmission(sid, score, msg));
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
    return result || { id: 0 };
}

function getAssignmentID(num, assignments) {
    var lab = findLabByNum(num, assignments.labs);
    return lab.id || false;
}


function sendLAStats(ladata, msg) {
    var safe = getSIDCount(ladata.safe);
    var text = 'LA Data Processed:\n';
    text += 'Found Safe Check offs for: ' + Object.keys(ladata.safe).join(' ') +
            ' labs.\n';
    text += 'Found Sketchy Check offs for: ' +
            (Object.keys(ladata.sketchy.labs).join(' ') || 'no') + ' labs.\n';
    text += 'Total of ' + safe.ontime + ' good on time checkoffs, ' +
            safe.late + ' late check offs.\n';
    msg.send(text);
}

// Bulk upload grades to bCourses
function postGrades(ladata, msg) {
    var grades = ladata.safe;
    for (lab in grades) {
        var assnID = getAssignmentID(lab, robot.brain.get(LAB_CACHE_KEY));
        cs10.postMultipleGrades(assnID, grades[lab], msg);
    }
}

// This takes in a processed labs object from review LA data.
function getSIDCount(labs) {
    var ontime = 0;
    var late = 0;
    for(num in labs) {
        ontime += Object.keys(labs[num]).length || 0;
        // late += labs[num].late.length || 0;
    }
    return {ontime: ontime, late: late};
}

/** Verify all the LA data for easy assignment posting
    Each set of checkoffs creates:
    <num>: { ontime: [], late: [] }
    There is one object for safe check-offs and one for sketchy checkoffs
**/
function reviewLAData(data) {
    var safe = {};
    var sketchy = { labs: {}, msgs: [] };

    data.forEach(function(checkoff) {
        var lab = checkoff.lab,
            sketch = isSketchy(checkoff);

        if (parseInt(lab) > 20 || parseInt(lab) < 2) { return; }

        if (!safe[lab] && !sketch) { safe[lab] = {}; }

        if (!sketchy.labs[lab] && sketch) { sketchy[lab] = {}; }

        var obj = safe[lab];

        if (sketch) {
            obj = sketchy.labs[lab];
            sketchy.msgs.append(checkoff);
        }

        checkoff.sid.forEach(function(sid) {
            if (!sid || sid.length !== 20 && sid.length !== 8) {
                return
            }
            sid = cs10.normalizeSID(sid);
            obj[sid] = checkoff.points;
        })
    });

    return { safe: safe, sketchy: sketchy };
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
    // FIXME  -- exclude Sat and Sun
    var oneWeek = 1000 * 60 * 60 * 24 * 7;
    // FIXME -- this assumes the cache is valid.
    var assignments = robot.brain.get(LAB_CACHE_KEY),
        dueDate = findLabByNum(co.lab, assignments.labs).due_at;
    dueDate = new Date(dueDate);
    return co.late || date - dueDate <= oneWeek;
}
