// Description:
//   Logic for dealing with student slip day calculations
//   Exposes: /slipdays/:studentID/:json? as a web endpoint
//
// Dependencies:
//   bcourses library see ./bcourses-config.js
//
// Configuration:
//   See bcourses
//
// URLS:
//  /slipdays/:sid -- show the slip days for SID
//
// Commands:
//   hubot slip days <SID> -- CS10: get slip days used for students
//
// Author:
//  Michael Ball

// This sets up all the bCourses interface stuff
var cs10 = require('./bcourses-config.js');
//stuff for caching
var cs10Cache = require('./caching.js');

module.exports = function(robot) {
    // redirect to the CS10 site.
    robot.respond(/(?:check\s*)slip days\s*(\d+)/i, {
        id: 'cs10.slip-days'
    }, function(msg) {
        var sid = msg.match[1];
        msg.send(`http://cs10.org/fa15/slipdays/?${sid}`);
        calculateSlipDays(sid, function(data) {
            msg.send(`/code\n${JSON.stringify(data)}`);
        });
    });

    robot.router.get('/slipdays/:sid', function(req, res) {
        res.setHeader('Content-Type', 'text/json');
        // Damn you, CORS...
        res.setHeader('Access-Control-Allow-Origin', '*');
        res.setHeader('Access-Control-Allow-Credentials', true);
        res.setHeader('Access-Control-Allow-Methods', 'POST, GET');
        res.setHeader('Access-Control-Allow-Headers',
                    'Origin, X-Requested-With, Content-Type, Accept');

        calculateSlipDays(req.params.sid, function(data) {
            res.end(JSON.stringify(data));
        });
    });

};


function getSlipDays(submissionTime, dueTime) {
    var threshold = 1000 * 60 * cs10.gracePeriodMinutes,
        oneDay = 1000 * 60 * 60 * 24,
        d1 = new Date(submissionTime),
        d2 = new Date(dueTime);

    var diff = d1 - d2;

    if (diff < threshold) {
        return 0;
    }

    return Math.ceil(diff / oneDay);
}


/** Iterate over all the assignments that slip days count towards:

 **/
var STATE_GRADED = 'graded';

function calculateSlipDays(sid, callback) {
    cs10Cache.staffIDs(function(err, resp) {

        if (err) {
            return callback(null);
        }
        
        var staffIDs = resp.cacheVal;
        cs10Cache.allAssignments(function (assnErr, assnResp) {
            if (assnErr) {
                return callback(null);
            }
            
            var assignmentsCache = assnResp.cacheVal;
            
            var assignmentsURL = `${cs10.baseURL}students/submissions`,
                options = {
                    'include[]': ['submission_comments', 'assignment'],
                    'student_ids[]': cs10.normalizeSID(sid),
                    'assignment_ids[]': cs10.slipDayAssignmentIDs,
                    grouped: true
                };

            cs10.get(assignmentsURL, options, function(error, response, body) {
                var results = {
                    totalDays: 0,
                    daysRemaining: cs10.allowedSlipDays,
                    assignments: [], // Assignment object described below
                    errors: []
                };

                if (!body || body.errors) {
                    results.errors.push('Oh, Snap! Something went wrong. :(');
                    if (body.errors.constructor != Array) {
                        body.errors = [body.errors];
                    }
                    body.errors.forEach(function(err) {
                        results.errors.push(err.message);
                    });
                    callback(results);
                    return;
                }

                var submissions = body[0].submissions;
                // List of submissions contains only most recent submission
                // TODO: Refactor this and pull out of call back.
                submissions.forEach(function (subm) {
                    var days,
                        // True IFF Reader explicitly left a comment
                        isVerified = false,
                        subAssn, assnObj, displayDays, stundets_due_at;

                    subAssn = subm.assignment;
                    // Graded assignments should have reader comments.
                    // TODO: Log errors when no reader comment is found.
                    if (subm.workflow_state === STATE_GRADED) {
                        days = getReaderDays(subm.submission_comments, staffIDs);
                        displayDays = days;
                        isVerified = days != -1;
                    }

                    if (!isVerified) { // Use time of submission
                        students_due_at = subm.assignment.due_at;
                        
                        if (subAssn.has_overrides) {
                            console.log('OVERRIDES');
                            students_due_at = calculateOverrideDate(
                                subm.user_id, // person submitting.
                                assignmentsCache[subAssn.name]
                            );
                        }
                        days = getSlipDays(subm.submitted_at, students_due_at);
                        displayDays = days;
                    }
                    
                    // No submissions result in days<0.
                    days = Math.max(0, days);

                    assnObj = {
                        title: subm.assignment.name,
                        slipDays: displayDays,
                        verified: isVerified,
                        url: subm.preview_url,
                        submitted: subm.submitted_at !== null
                    };

                    results.totalDays += days;
                    results.daysRemaining -= days;
                    results.assignments.push(assnObj);
                }); // end forEach

                callback(results);
            });
        });
    });
}

/*
    When an assignment has overrides in Canvas, calculate the due date for this
    particular student.
*/
function calculateOverrideDate(user_id, assign) {
    var override = 0
    console.log('USER:', user_id);
    console.log(assign);
    return assign.due_at;
}


// Get an array of comments on a submission
// Filter for comments w/ valid author ID
// Search comments for a "Slip Days Used" match
function getReaderDays(comments, staffIDs) {
    var tempDay, days = -1;
    comments = comments.filter(function (comment) {
        commentIsAuthorized(staffIDs, comment);
    });
    // It's possible multiple readers may comment.
    // The last comment with a valid day found will be used for slip days
    comments.forEach(function(comment) {
        tempDay = extractSlipDays(comment.comment);
        if (tempDay !== -1) {
            days = tempDay;
        }
    });
    return days;
}

/** Make sure only staff can verify slip days
    This is currently based on using a known list of staff IDs, but could
    query bCourses in the future, though that would slow every request unless
    someone implemented a cache.
**/
function commentIsAuthorized(staffIDs, comment) {
    return staffIDs.indexOf(comment.author_id) !== -1;
}

// parse comment (just a string) then return slip days or -1
function extractSlipDays(comment) {
    var slipdays = /.*(?:used)?\s*slip\s*days?\s*(?:used)?:?.*(\d+)/gi;
    var match = slipdays.exec(comment);
    if (match) {
        return match[1];
    }
    return -1;
}