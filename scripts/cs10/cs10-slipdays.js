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
//   hubot slip days <SID> -- CS10: get slip days used for students
//
// Author:
//  Michael Ball

// This sets up all the bCourses interface stuff
var cs10 = require('./bcourses/');

module.exports = function(robot) {
    // Just a simple redirect to the CS10 site.
    robot.respond(/slip[- ]?days\s*(\d+)/i, {id: 'cs10.slip-days'}, function(msg) {
        msg.send('http://cs10.org/sp15/slipdays/?' + msg.match[1]);
    });

    robot.router.get('/slipdays/:sid', function(req, res) {
        res.type('text/json');
        res.setHeader('Content-Type', 'text/json');
        // Damn you CORS....
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
            'include[]' : ['submission_comments', 'assignment', 'assignment_overrides'],
            'student_ids[]' : cs10.normalizeSID(sid),
            'assignment_ids[]' : cs10.slipDayAssignmentIDs,
            // 'as_user_id' : cs10.normalizeSID(sid),
            grouped : true
        };

    cs10.get(url, options, function(error, response, body) {
        var results = {
                totalDays: 0,
                daysRemaining: cs10.allowedSlipDays,
                assignments: [], // Assignment object described below
                errors: []
            };

        if (!body || body.errors) {
            results.errors.push('Oh, Snap! Something went wrong. :(');
            if (body.errors.constructor != Array) {
                body.errors = [ body.errors ];
            }
            console.log(body.errors);
            body.errors.forEach(function(err) {
                results.errors.push(err.message);
            });
            callback(results);
            return;
        }

        var submissions = body[0].submissions;
        // List of submissions contains only most recent submission
        submissions.forEach(function(subm) {
            var days, verified, submitted, state, assignment, dispDays;
            state = subm.workflow_state;
            submitted = subm.submitted_at !== null;
            verified = false; // True IFF Reader explicitly left a comment
            
            if (state === STATE_GRADED) { // Use Reader Comments, if avail.
                days = getReaderDays(subm.submission_comments);
                dispDays = days;
                verified = days != -1;
            }
            
            if (!verified) { // Use time of submission
                subm.assignment.description = '';
                console.log('Submission: ', subm);
                console.log(subm.submitted_at, '\n\n', subm.assignment.due_at);
                days = getSlipDays(subm.submitted_at, subm.assignment.due_at);
                dispDays = days;
                console.log(days);
                if (subm.assignment.has_overrides) {
                    dispDays = 'Unknown!';
                    results.errors.push('Could not calculate days for ' +
                        subm.assignment.name);
                }
            }
            
            // No submissions result in days<0.
            days = Math.max(0, days);

            assignment = {
                title: subm.assignment.name,
                slipDays: dispDays,
                verified: verified,
                url: subm.preview_url,
                submitted: submitted
            };

            results.totalDays      += days;
            results.daysRemaining  -= days;
            results.assignments.push(assignment);
        });

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