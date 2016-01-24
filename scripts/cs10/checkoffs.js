// Description:
//   Handle lab check offs in hipchat. No more paper needed! :D
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
//   hubot review la scores -- CS10: stats about LA scores. Will punlish the safe scores to bCourses
//
// Author:
//  Michael Ball
var cs10 = require('./bcourses-config.js');
var cs10Cache = require('./caching.js');

// Checkoff points
var FULL_POINTS = cs10.labCheckOffPoints;
var LATE_POINTS = cs10.labCheckOffLatePts;

// How late a checkoff is allowed to be
var SECS_ALLOWED_LATE = cs10.labSecsAllowedLate;

// Lab Numbers that people can be checked off for.
var MIN_LAB = cs10.firstLab;
var MAX_LAB = cs10.lastLab;
var EXTRA_LABS = cs10.extraLabs;

// A long regex to parse a lot of different check off commands.
var checkOffRegExp = /(late\s*)?(?:lab[- ])?check(?:ing)?(?:[-\s])?off\s+(\d+)\s*(late)?\s*((?:\d+\s*)*)\s*/i;
// A generic expression that matches all messages
var containsSIDExp = /.*x?\d{5,}/gi;

// Global-ish stuff for successful lab checkoff submissions.
var successes,
    failures,
    expectedScores,
    timeoutID;

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
        reviewLAData(cs10Cache.getLaData(), function(err, resp) {
            if (err) {
                return msg.send(err.msg);
            }

            sendLAStats(resp, msg);
        });
    });

    // submit LA scores
    robot.respond(/post la scores/i, {
        id: 'cs10.checkoff.post-la-scores'
    }, function(msg) {
        if (!isValidRoom(msg)) {
            return;
        }
        reviewLAData(cs10Cache.getLaData(), function(err, resp) {
            if (err) {
                return msg.send(err.msg);
            }

            sendLAStats(resp, msg);
            postGrades(laScores, msg);
        });
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

function processCheckOff(msg) {
    var roomFn, parsed, errors;
    switch (msg.message.room) {
        case cs10.LA_ROOM:
            roomFn = doLACheckoff;
            break;
        case 'Shell': // Move this condition around for command line testing
        case cs10.TA_ROOM:
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

    roomFn(parsed, msg);
}

/* Proccess the regex match into a common formatted object */
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

// Return an array of error messages that prevent the checkoff from being saved.
function verifyErrors(parsed) {
    var errors = [];
    if (parsed.lab < MIN_LAB || parsed.lab > MAX_LAB || EXTRA_LABS.has(parsed.lab)) {
        errors.push(`The lab number: ${parsed.lab} is not a valid lab!`);
        errors.push('Please specify the lab number before all student ids.');
    }
    if (parsed.sids.length < 1) {
        errors.push('No SIDs were found.');
    }

    return errors;
}

// FIXME -- protect against infinite loops!!
function doTACheckoff(data, msg) {
    msg.send(`TA: Checking Off ${data.sids.length} students for lab ${data.lab}.`);

    uploadCheckoff(doTACheckoff, data, msg);
}

function doLACheckoff(data, msg) {
    var checkoff = {
        lab: data.lab,
        points: data.points,
        late: data.isLate,
        sid: data.sids,
        time: (new Date()).toString(),
        laname: msg.message.user.name,
        uploaded: false
    };

    //save checkoff to robot brain
    var laData = cs10Cache.getLaData() || [];
    LA_DATA.push(checkoff);
    cs10Cache.setLaData(LA_DATA);

    var sketchy = isSketchy(checkoff);
    if (sketchy.length) {
        msg.send('ERROR: You\'re being sketchy right now...\n',
            sketchy.join('\n'),
            'This checkoff will not be uploaded to bCourses. :(');
        return;
    }

    msg.send(`LA: Checking Off ${data.sids.length} students for lab ${data.lab}.`);

    uploadCheckoff(doLACheckoff, data, msg);

    var scores = 'score' + (data.sids.length === 1 ? '' : 's');
    msg.send(`LA: Saved ${data.sids.length} student ${scores} for lab ${data.lab}.`);

}

function uploadCheckoff(roomFn, data, msg) {
    cs10Cache.labAssignments(function(err, resp) {
        if (err) {
            return msg.send("Error getting lab assignments for checkoff. Your checkoff was not uploaded!!!");
        }

        var assignments = resp.cacheVal;
        var assnID = getAssignmentID(data.lab, assignments, msg);

        if (!assnID) {
            msg.send(`Well, crap...I can\'t find lab ${data.lab} .\n` +
                'Check to make sure you put in a correct lab number.\n' +
                cs10.gradebookURL);
            return;
        }

        // FIXME -- check whether 1 or more scores.
        successes = 0;
        failures = 0;
        expectedScores = data.sids.length;
        data.sids.forEach(function(sid) {
            postSingleAssignment(assnID, sid, data.points, msg);
        });

        // wait till all requests are complete...hopefully.
        // Or send a message after 30 seconds
        timeoutID = setTimeout(function() {
            var scores = `${successes} score${(successes == 1 ? '' : 's')}`;
            msg.send(`After 30 seconds: ${scores} successfully submitted.`);
        }, 30 * 1000);
    });
}


function postSingleAssignment(assnID, sid, score, msg) {
    var scoreForm = 'submission[posted_grade]=' + score,
        url = `${cs10.baseURL}assignments/${assnID}/submissions/${sid}`;

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
    return result || {
        id: 0
    };
}

function getAssignmentID(num, assignments) {
    var lab = findLabByNum(num, assignments);
    return lab.id || false;
}

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

/** Verify all the LA data for easy assignment posting
    Each set of checkoffs creates:
    <num>: { ontime: [], late: [] }
    There is one object for safe check-offs and one for sketchy checkoffs
**/
function reviewLAData(data, cb) {
    var safe = {};
    var sketchy = {
        labs: {},
        msgs: []
    };

    cs10Cache.labAssignments(function(err, resp) {
        if (err) {
            return cb(err.msg);
        }
        var assignments = resp.cacheVal;

        data.forEach(function(checkoff) {
            var lab = checkoff.lab,
                sketch = isSketchy(checkoff, assignments);

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

        cb(null, {
            safe: safe,
            sketchy: sketchy
        });
    });
}

/** Determine whether an LA checkoff is sketchy.
 *  "Sketchy" means that something about the check off isn't normal.
 *  The conditions are defined below in sketchyTests.
 *  If a checkoff is sketchy, return an arry of warnings about why.
 **/
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

/** A way of building a function and an a corresponding error message.
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
                console.log('On time check.... ', JSON.stringify(assn));
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