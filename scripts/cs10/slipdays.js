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
        msg.send(`http://cs10.org/fa17/slipdays/?${sid}`);
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

    // Grab staff ids and assignment data from cache
    var data = ["staffIDs", "allAssignments"];
    cs10Cache.allBcoursesData(data, function(err, staffIDResp, assignResp) {

        if (err) {
            return callback(err);
        }

        var staffIDs = staffIDResp.cacheVal;
        var cachedAssignments = assignResp.cacheVal;

        // Get student submissions, packaged with an assignment object to identify the submission
        var assignmentsURL = `${cs10.baseURL}students/submissions`,
            options = {
                'include[]': ['submission_comments', 'assignment'],
                'student_ids[]': cs10.normalizeSID(sid),
                'assignment_ids[]': cs10.slipDayAssignmentIDs,
                grouped: true,
                'Authorization': 'Bearer 1072~3PeIF55Dhv3o43bD2aB7jtMruKVJkxxzkKXzzNo2cHd1jMdQhRJSoAC4ow13OWdw'
            };

        cs10.get(assignmentsURL, options, function(error, response, body) {
            var results = {
                totalDays: 0,
                daysRemaining: cs10.allowedSlipDays,
                assignments: [], // Assignment object described below
                errors: []
            };

            if (!body || body.errors || response.statusCode >= 400) {
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

            // List of submissions contains only most recent submission
            var submissions = body[0].submissions;
            submissions.forEach(function(subm) {
                var days,
                    assignment,
                    displayDays,
                    state = subm.workflow_state,
                    submitted = subm.submitted_at !== null,
                    verified = false; // True IFF Reader explicitly left a comment

                // Use Reader Comments, if available to determine # of slip days
                if (state === STATE_GRADED) {
                    days = getReaderDays(subm.submission_comments, staffIDs);
                    displayDays = days;
                    verified = days != -1;
                }

                // Use time of submission if reader days can't be determined
                if (!verified) {
                    var dueDate = findAssignmentDueDate(subm.user_id, subm.assignment, cachedAssignments);
                    days = getSlipDays(subm.submitted_at, dueDate);
                    displayDays = days;
                }

                // No submissions result in days<0.
                days = Math.max(0, days);

                assignment = {
                    title: subm.assignment.name,
                    slipDays: displayDays,
                    verified: verified,
                    url: subm.preview_url,
                    submitted: submitted
                };

                results.totalDays += days;
                results.daysRemaining -= days;
                results.assignments.push(assignment);
            });

            callback(results);
        });
    });
}

/**
 * Given an assignment object associated with a submission, Returns
 * the true due date of the assignment for the particular student.
 *
 * Why this?
 * Late add students have due dates that are not the same as everyone else
 */
function findAssignmentDueDate(userId, submittedAssignment, cachedAssignments) {

    // This cached assignment stores the true due date for everyone
    // and also any override due dates
    var assignment = cachedAssignments[submittedAssignment.id];
    if (!assignment) {
        robot.logger.debug(`Cache is potentially corrupted. Could not find cached
            assignment with id: ${submittedAssignment.id} in slip day tracker`);
        return submittedAssignment.due_at;
    }

    // If the assignment has overrides parse through the id list and
    // see if the student has a different date
    if (assignment.has_overrides && assignment.overrides) {
        assignment.overrides.forEach(function(override) {
            override.student_ids.forEach(function(sid) {
                if (userId == sid) {
                    return override.due_at;
                }
            });
        });
    }

    return assignment.due_at;
}


/**
 * Get an array of comments on a submission
 * Filter for comments w/ valid author ID
 * Search comments for a "Slip Days Used" match
 */
function getReaderDays(comments, staffIDs) {
    var tempDay, days = -1;
    comments = comments.filter(function(comment) {
        return commentIsAuthorized(staffIDs, comment);
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

/**
 * Make sure only staff can verify slip days
 */
function commentIsAuthorized(staffIDs, comment) {
    return staffIDs.indexOf(comment.author_id) !== -1;
}

/**
 * Parse comment (just a string) then Return number of slip days found or -1
 */
function extractSlipDays(comment) {
    var slipdays = /.*(?:used)?\s*slip\s*days?\s*(?:used)?:?.*(\d+)/gi;
    var match = slipdays.exec(comment);
    if (match) {
        return match[1];
    }
    return -1;
}
