// Description:
//   Handle lab check offs in hipchat. No more paper needed! :D
//
//   If you're just getting started with this file take a look at 
//   the MAIN CHECKOFF CODE section near the bottom of this file
//
// Dependencies:
//   bcourses library see ./bcourses-config.js
//   cs10 Caching see ./cs10-caching.js
//
// Configuration:
//   See bcourses
//
// Commands:
//   hubot (late) check off <NUM> <SIDs> -- CS10: input lab check offs for these students
//   hubot show la data -- CS10: dump the raw saved Lab Assistant check offs.
//   hubot review la scores -- CS10: stats about LA scores. Will publish the safe scores to bCourses
//
// Author:
//  Michael Ball
var cs10 = require('./bcourses-config.js');
var cs10Cache = require('./caching.js');

// Checkoff policies
var FULL_POINTS = cs10.labCheckOffPoints;
var LATE_POINTS = cs10.labCheckOffLatePts;
var SECS_ALLOWED_LATE = cs10.labSecsAllowedLate;

// Lab Numbers that people can be checked off for
var MIN_LAB = cs10.firstLab;
var MAX_LAB = cs10.lastLab;
var SPECIAL_LABS = cs10.specialLabs;

// A long regex to parse a lot of different check off commands.
var checkOffRegExp = /(late\s*)?(?:lab[- ])?check(?:ing)?(?:[-\s])?off\s+(\d+)\s*(late)?\s*((?:\d+\s*)*)\s*/i;
// A generic expression that matches all messages
var containsSIDExp = /.*x?\d{5,}/gi;

// Global-ish stuff for successful lab checkoff submissions.
var successes,
    failures,
    snames,
    expectedScores,
    timeoutID;

/*************************************
 * REVIEW LA DATA AND DO BULK UPLOAD *
 *************************************/
// This section is not used currently, LA checkoffs go directly to bcourses

function sendLAStats(ladata, msg) {
    var safe = getSIDCount(ladata.safe);
    var text = 'LA Data Processed:\n';
    text += `Found Safe Check offs for: ${Object.keys(ladata.safe).join(' ')} labs.\n`;
    text += 'Found Sketchy Check offs for: ' +
        (Object.keys(ladata.sketchy.labs).join(' ') || 'no') + ' labs.\n';
    text += `Total of ${safe.ontime} good on time checkoffs, ` +
        safe.late + ' late check offs.\n';
    msg.send(text);
}

// Bulk upload grades to bCourses
function postGrades(ladata, msg) {
    cs10Cache.labAssignments(function(err, resp) {
        if (err) {
            return msg.send("Error getting lab assignments for bulk grade upload");
        }
        var assignments = resp.cacheVal;
        var grades = ladata.safe;
        for (lab in grades) {
            var assnID = getAssignmentID(lab, assignments);
            cs10.postMultipleGrades(assnID, grades[lab], msg);
        }
    });
}

// This takes in a processed labs object from review LA data.
function getSIDCount(labs) {
    var ontime = 0;
    var late = 0;
    for (num in labs) {
        ontime += Object.keys(labs[num]).length || 0;
        // late += labs[num].late.length || 0;
    }
    return {
        ontime: ontime,
        late: late
    };
}

/** 
 * Verify and Group all the LA data for easy assignment posting
 * Each set of checkoffs creates: 
 *      <num>: { ontime: [], late: [] }
 * There is one object for safe check-offs and one for sketchy checkoffs
 */
function reviewLAData(data) {
    var safe = {};
    var sketchy = {
        labs: {},
        msgs: []
    };

    data.forEach(function(checkoff) {
        var lab = checkoff.lab,
            sketch = checkoff.sketchy;

        if (!safe[lab] && !sketch) {
            safe[lab] = {};
        }

        if (!sketchy.labs[lab] && sketch) {
            sketchy.labs[lab] = {};
        }

        var obj = safe[lab];

        if (sketch) {
            obj = sketchy.labs[lab];
            sketchy.msgs.push(checkoff);
        }

        if (!checkoff.uploaded) {
            checkoff.sid.forEach(function(sid) {
                // Verify that an SID is 'normal' either sis_user_id:XXX or just XXX
                // FIXME -- this should be removed sometime soon...
                if (!sid || sid.length !== 20 && sid.length !== 8) {
                    return;
                }
                sid = cs10.normalizeSID(sid);
                obj[sid] = checkoff.points;
            });
        }
    });

    return {
        safe: safe,
        sketchy: sketchy
    };
}

/*****************
 * SKETCHY TESTS *
 *****************/

/** 
 * Determine whether an LA checkoff is sketchy.
 *  "Sketchy" means that something about the check off isn't normal.
 *  The conditions are defined below in sketchyTests.
 *  If a checkoff is sketchy, return an arry of warnings about why.
 */
function isSketchy(co, assignments) {
    var results = [];
    for (var checkName in sketchyTests) {
        if (sketchyTests.hasOwnProperty(checkName)) {
            var test = sketchyTests[checkName];
            if (!test.test(co, assignments)) {
                results.push(test.message);
            }
        }
    }

    return results;
};

/** 
 * A way of building a function and a corresponding error message.
 *  If test fails → error is shown
 *  The tests are a map of name: {test-object}
 *  A test object has two keys inside:
 *  A `test`: call a function with checkoff data, and a bCourses assignment
 *      A test should return a boolean based on a signle case it is testing.
 *      FYI: User access control is assumed to be handled by Room Admins.
 *  A `message`: A human-reader error shown IFF the test case fails.
 */
var sketchyTests = {
    isDuringDayTime: {
        message: 'Check offs should happen during lab or office hours! (9am-8pm)',
        test: function(co, assn) {
            var d = new Date(co.time),
                hour = d.getHours();

            if (hour < 8 || hour > 20) {
                return false;
            }

            return true;
        }
    },
    isDuringWeek: {
        message: 'Check offs should happen during the week! (Mon-Fri)',
        test: function(co, assn) {
            var d = new Date(co.time),
                day = d.getDay();

            if (day == 0 || day == 6) {
                return false;
            }

            return true;
        }
    },
    isOnTime: {
        message: 'This lab checkoff is past due!\nOnly TAs can give full credit now.',
        test: function(co, assn) {
            var date = new Date(co.time),
                dueDate = findLabByNum(co.lab, assn).due_at;

            dueDate = new Date(dueDate);

            if (!co.late && date - dueDate > SECS_ALLOWED_LATE) {
                return false;
            }

            return true;
        }
    },
    hasValidSIDs: {
        // TODO: implement SID caching
        // TODO: Shouldn't the message say which SIDs? Need to fix the API.
        message: 'This checkoff has SIDs that can\'t be found in bCourses.',
        test: function(co, assn) {
            return true;
        },
    }
};

/**********************
 * MAIN CHECKOFF CODE *
 **********************/

function processCheckOff(msg) {
    var roomFn, parsed, errors;
    switch (msg.message.room) {
        case 'Shell': // Move this condition around for command line testing
        case cs10.LA_ROOM:
            roomFn = doLACheckoff;
            break;
        case cs10.TA_ROOM:
            roomFn = doTACheckoff;
            break;
        default:
            msg.reply('Lab Check offs are not allowed from this room');
            return;
    }

    cs10Cache.labAssignments(function(err, resp) {
        if (err) {
            return msg.reply('There was a problem with the bcourses assignment cache.' +
                '\nYour checkoff was not uploaded :(');
        }
        var assignments = resp.cacheVal;

        parsed = extractMessage(msg.message.text);
        errors = verifyErrors(parsed, assignments);
        if (errors.length) {
            msg.reply('Your check off was NOT saved!',
                'ERROR: The following errors occurred.',
                errors.join('\n'));
            return;
        }

        roomFn(assignments, parsed, msg);
    });
}

/**
 * Proccess the regex match into a common formatted object 
 */
function extractMessage(text) {
    // Parse the following components out of a message.
    var findSIDs = /x?\d{5,}/g,
        findLate = /late/i,
        findLab = /\d{1,2}/;

    var labNo = text.match(findLab) || [0],
        isLate = text.match(findLate) != null,
        SIDs = text.match(findSIDs);

    SIDs = SIDs.map(cs10.normalizeSID);

    return {
        lab: labNo[0],
        sids: SIDs,
        isLate: isLate,
        points: isLate ? LATE_POINTS : FULL_POINTS
    };
}

/**
 * Return an array of error messages that prevent the checkoff from being saved.
 */
function verifyErrors(parsed, assignments) {
    var errors = [];
    if ((parsed.lab < MIN_LAB || parsed.lab > MAX_LAB) && (SPECIAL_LABS.indexOf(parsed.lab) === -1)) {
        errors.push(`The lab number: ${parsed.lab} is not a valid lab!`);
        errors.push('Please specify the lab number before all student ids.');
        errors.push('Here is a list of the current Labs and their numbers:');
        assignments.forEach(function(assgn) {
            errors.push(assgn.name);
        });
    }
    if (parsed.sids.length < 1) {
        errors.push('No SIDs were found.');
    }

    return errors;
}

/**
 * Return the bCourses lab object matching the CS10 lab number
 * All labs are named "<#>. <Lab Title>"
 */
function findLabByNum(num, labs) {
    var result;
    labs.some(function(lab) {
        var labNo = lab.name.match(/^(\d{1,2})/);
        if (labNo && labNo[1] == num) {
            result = lab;
            return true;
        }
        return false;
    });
    return result || {
        id: 0
    };
}

function getAssignmentID(num, assignments) {
    var lab = findLabByNum(num, assignments);
    return lab.id || false;
}

function doTACheckoff(assignments, data, msg) {
    msg.send(`TA: Checking Off ${data.sids.length} students for lab ${data.lab}.`);
    uploadCheckoff(doTACheckoff, assignments, data, msg, true);
}

function doLACheckoff(assignments, data, msg) {
    var checkoff = {
        lab: data.lab,
        points: data.points,
        late: data.isLate,
        sid: data.sids,
        time: (new Date()).toString(),
        laname: msg.message.user.name,
        uploaded: false
    };

    // See sketchy tests section
    var sketchyErrors = isSketchy(checkoff, assignments),
        wasSketchy = sketchyErrors.length > 0;

    checkoff.sketchy = wasSketchy;

    //save LA checkoffs to robot brain
    var laData = cs10Cache.getLaData() || [];
    laData.push(checkoff);
    cs10Cache.setLaData(laData);

    var scores = 'score' + (data.sids.length === 1 ? '' : 's');
    msg.send(`LA: Saved ${data.sids.length} student ${scores} for lab ${data.lab}.`);

    if (wasSketchy) {
        sendSketchyWarning(msg, sketchyErrors);
        return;
    }

    msg.send(`LA: Checking Off ${data.sids.length} students for lab ${data.lab}.`);
    uploadCheckoff(doLACheckoff, assignments, data, msg, false);
}

function sendSketchyWarning(msg, errors) {
    msg.reply('ERROR: You\'re being sketchy right now...',
        errors.join('\n'),
        'This checkoff will not be uploaded to bCourses. :(');
    msg.send(`@${cs10.LAB_ASSISTANT_MANAGER} has now been alerted...`);
}

/**
 * Send the appropriate error message based on whether 
 * the checkoff was done by an LA or TA
 */
function sendErrorMsg(sid, body, msg, isTA) {
    var errorMsg = `Problem encountered for ID: ${sid.replace(cs10.uid, '')}\n`;
    if (body && body.errors && body.errors[0]) {
        errorMsg += `ERROR:\t ${body.errors[0].message}\n`;
    }

    if (isTA) {
        errorMsg += `Please enter the score directly into bCoureses: ${cs10.gradebookURL}\n`;
    } else {
        errorMsg += 'Make sure you typed the correct sid, otherwise speak to your lab TA.\n'
    }
    msg.reply(errorMsg);
}

/**
 * Checks if all request have completed and messages the user if completed
 */
function attemptToCompleteRequest(msg) {
    if (successes + failures === expectedScores) {
        clearTimeout(timeoutID);
        if (successes) {
            var scores = successes + ' score' + (successes == 1 ? '' : 's');
            var successMsg = `${scores} successfully updated for:\n`;
            i = 1;
            for (var sid in snames) {
                if (snames.hasOwnProperty(sid)) {
                    successMsg += `${i}.) ${snames[sid]}, ${sid.replace(cs10.uid, '')}\n`;
                    i++;
                }
            }
            msg.reply(successMsg);
        }
        if (failures) {
            msg.reply('WARING: ' + failures + ' submissions failed.');
        }
    }
}

/**
 * Error Handler for posting lab check off scores.
 */
function verifyScoreSubmission(sid, points, msg, isTA) {
    return function(error, response, body) {
        if (body.errors || !body.grade || body.grade != points.toString()) {
            failures += 1;
            sendErrorMsg(sid, body, msg, isTA);
        } else {
            successes += 1;
        }
        attemptToCompleteRequest(msg);
    };
}

/**
 * Post a single score to bcourses
 */
function postSingleAssignment(assnID, sid, score, msg, isTA) {
    var scoreForm = 'submission[posted_grade]=' + score,
        url = `${cs10.baseURL}assignments/${assnID}/submissions/${sid}`;

    // Try to get the student's name for better feedback then make the grade request
    cs10.get(`${cs10.baseURL}users/${sid}`, '', function(err, resp, body) {
        if (err || resp.statusCode >= 400) {
            failures += 1;
            sendErrorMsg(sid, null, msg, isTA);
            attemptToCompleteRequest(msg);
            return;
        }
        snames[sid] = body.name;
        cs10.put(url, '', scoreForm, verifyScoreSubmission(sid, score, msg, isTA));
    });
}

function uploadCheckoff(roomFn, assignments, data, msg, isTA) {
    var assnID = getAssignmentID(data.lab, assignments);

    if (!assnID) {
        var labNotFoundMsg = `Well, crap...I can\'t find lab ${data.lab}.\n
                            It's possible that you shouldn't be checking that lab off!\n
                            Here is a list of the current Labs and their numbers:\n
                            ${assignments.map(function(assgn) { return assgn.name }).join("\n")}`;
        msg.reply(labNotFoundMsg);
        return;
    }

    // FIXME -- check whether 1 or more scores.
    successes = 0;
    failures = 0;
    snames = {};
    expectedScores = data.sids.length;
    data.sids.forEach(function(sid) {
        postSingleAssignment(assnID, sid, data.points, msg, isTA);
    });

    // wait till all requests are complete...hopefully.
    // Or send a message after 30 seconds
    timeoutID = setTimeout(function() {
        var scores = `${successes} score${(successes == 1 ? '' : 's')}`;
        msg.reply(`After 30 seconds: ${scores} successfully submitted.`);
    }, 30 * 1000);
}

/*******************
 * ROBOT FUNCTIONS *
 *******************/

function isValidRoom(msg) {
    return msg.message.room !== cs10.LA_ROOM;
}

module.exports = function(robot) {
    // Loosely look for the phrase check off and the possibility of a number.
    var couldBeCheckOff = /check.*off.*x?\d{1,}/i;
    robot.hear(couldBeCheckOff, {
        id: 'cs10.checkoff.check-off-all'
    }, processCheckOff);

    // Commands for managing LA check-off publishing
    robot.respond(/show la data/i, {
        id: 'cs10.checkoff.la-data'
    }, function(msg) {
        if (!isValidRoom(msg)) {
            return;
        }
        msg.send('/code', JSON.stringify(cs10Cache.getLaData()));
    });

    // Command Review LA data
    // Output total, num sketchy
    robot.respond(/review la (scores|data)/i, {
        id: 'cs10.checkoff.send-la-data'
    }, function(msg) {
        if (!isValidRoom(msg)) {
            return;
        }

        var processedLaData = reviewLAData(cs10Cache.getLaData())
        sendLAStats(processedLaData, msg);
    });

    // submit LA scores
    robot.respond(/post la scores/i, {
        id: 'cs10.checkoff.post-la-scores'
    }, function(msg) {
        if (!isValidRoom(msg)) {
            return;
        }

        var processedData = reviewLAData(cs10Cache.getLaData());

        sendLAStats(processedData, msg);
        postGrades(processedData, msg);
    });

    // See the most recent checkoff for debugging
    robot.respond(/see last checkoff/i, {
        id: 'cs10.checkoff.see-last-checkoff'
    }, function(msg) {
        if (!isValidRoom(msg)) {
            return;
        }
        var data = cs10Cache.getLaData(),
            last = data[data.length - 1];
        msg.send('/code', JSON.stringify(last));
    });

};
