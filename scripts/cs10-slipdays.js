// Description:
//   Logic for dealing with student slip day calculations
//   Exposes: /slipdays/:studentID/:json? as a web endpoint
//
// Dependencies:
//   bcourses library see ./bcourses/index.js
//
// Configuration:
//   See bcourses
//
// URLS:
//  /slipdays/:sid -- show the slip days for SID
//
// Commands:
//   hubot slip days <SID> -- get slip days used for students
//
// Author:
//  Michael Ball

// This sets up all the bCourses interface stuff
var cs10 = require('./bcourses/');

module.exports = function(robot) {
    // Just a simple redirect to the CS10 site.
    robot.respond(/slip[- ]?days\s*(\d+)/i, function(msg) {
        msg.send('http://cs10.org/sp15/slipdays/?' + msg.match[1]);
    });

    robot.router.get('/slipdays/:sid', function(req, res) {
        // Damn you CORS....
        res.type('text/json');
        res.setHeader('Content-Type', 'text/json');
        res.setHeader('Access-Control-Allow-Origin', '*');
        res.setHeader('Access-Control-Allow-Credentials', true);
        res.setHeader('Access-Control-Allow-Methods', 'POST, GET');
        res.setHeader('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept');

        calculateSlipDays(req.params.sid, function(data) {
            res.end(JSON.stringify(data));
        });
    });

};


function getSlipDays(submissionTime, dueTime) {
    var threshold = 1000 * 60 * cs10.gracePeriodMinutes,
        oneDay    = 1000 * 60 * 60 * 24,
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
    var url = cs10.baseURL + 'students/submissions',
        options = {
            'include[]' : ['assignment', 'submission_comments'],
            'student_ids[]' : cs10.normalizeSID(sid),
            'assignment_ids[]' : cs10.slipDayAssignmentIDs
    };

    cs10.get(url, options, function(error, response, body) {
        var days, verified, submitted,
            results = {
                totalDays: 0,
                daysRemaining: cs10.allowedSlipDays,
                assignments: [], // Assignment object described below
                errors: null
            };

        if (!body || body.errors) {
            results.errors = [];
            results.errors.push('Oh, Snap! Something went wrong. :(');
            body.errors.forEach(function(err) {
                results.errors.push(err.message);
            });
            callback(results);
            return;
        }

        // List of submissions contains only most recent submission
        // TODO: Check for muted assignments?
        body.forEach(function(subm) {
            state = subm.workflow_state;
            submitted = subm.submitted_at !== null;
            verified = false; // True IFF Reader explicitly left a comment
            // TODO: Refactor this mess...
            if (state === STATE_GRADED) { // Use Reader Comments or fallback
                days = getReaderDays(subm.submission_comments);
                if (days === -1 && submitted) {
                    days = getSlipDays(subm.submitted_at, subm.assignment.due_at);
                } else if (submitted) {
                    verified = true; // Good comment === verified
                } else { // No submission & no comment. (Group Assignmet)
                    days = 0;
                }
            } else if (subm.late) { // Calculate time based on submission
                days = getSlipDays(subm.submitted_at, subm.assignment.due_at);
            } else { // Not late...
                days = 0;
            }

            var assignment = {
                title: subm.assignment.name,
                slipDays: days,
                verified: verified,
                url: subm.preview_url,
                submitted: submitted
            };

            results.totalDays      += days;
            results.daysRemaining  -= days;
            results.assignments.push(assignment);
        })

        callback(results);
    });
}

// Get an array of comments on a submission
// Filter for comments w/ valid author ID
// Search comments for a "Slip Days Used" match
function getReaderDays(comments) {
    var tempDay, days = -1;
    comments = comments.filter(commentIsAuthorized);
    // It's possible multiple readers may comment.
    // The last comment with a valid day found will be used for slip days
    // TODO: Explictly verify the last comment is the most recent.
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
function commentIsAuthorized(comment) {
    return cs10.staffIDs.indexOf(comment.author_id) !== -1;
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