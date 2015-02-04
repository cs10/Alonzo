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
// Commands:
//   hubot slip days <SID> -- get slip days used for students
//
// Author:
//  Michael Ball

// This sets up all the bCourses interface stuff
var cs10 = require('./bcourses/');


var slipDaysRegExp = /slip[- ]?days\s*(\d+)/;
var pageSource = '<!DOCTYPE html><html><head><meta charset="utf-8"><title>Slip Day Checker</title><style type="text/css">body {background: #d3d6d9;color: #636c75;text-shadow: 0 1px 1px rgba(255, 255, 255, .5);font-family: Helvetica, Arial, sans-serif;}h1 {margin: 8px 0;padding: 0;}.commands {font-size: 13px;}p {border-bottom: 1px solid #eee;margin: 6px 0 0 0;padding-bottom: 5px;}p:last-child {border: 0;}</style></head><body><h1>#{SID}\'s Slip Day Check</h1><div class="commands">#{NOTES}</div></body></html>';


module.exports = function(robot) {

    robot.respond(slipDaysRegExp, function(msg) {
        var student = msg.match[1];

        if (!student) {
            msg.send('Error: No Student Provided');
            return;
        }

        calculateSlipDays(student, function(result) {
            // TODO: Turn this into a real message.
            // Or just go to the darn webpage....
            msg.send(JSON.stringify(result));
        });
    });

    robot.router.get('/slipdays/:sid/:json?', function(req, res) {
        var sid       = req.params.sid,
            useJSON   = req.params.json,
            type      = 'text/html',
            errorFn   = processError;
            successFn = processSuccess;

        if (useJSON) {
            type      = 'text/json';
            successFn = JSON.stringify;
            errorFn   = JSON.stringify;
        }

        res.type(type);
        // Damn you CORS....
        res.setHeader('Content-Type', type);
        res.setHeader('Access-Control-Allow-Origin', '*');
        res.setHeader('Access-Control-Allow-Credentials', true);
        res.setHeader('Access-Control-Allow-Methods', 'POST, GET, PUT, DELETE, OPTIONS');
        res.setHeader('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept');

        if (!sid) {
            res.end(errorFn.call(null, 'No SID Found'));
            return;
        }

        function processError() {
            return pageSource.replace('#{NOTES}', 'No SID Found')
                             .replace("#{SID}'s", "ERROR —");
        }

        function processSuccess(notices) {
            var page = pageSource.replace('#{SID}', sid);
            var results = '<p>' + notices.join('</p><p>') + '</p>';
            return page.replace('#{NOTES}', results);
        }

        calculateSlipDays(sid, function(notices) {
            res.end(successFn.call(null, notices));
        });
    });

};

// Format the assignment IDs for the URL
var toCheck = cs10.slipDayAssignmentIDs;
toCheck = toCheck.map(function(id) {
    return 'assignment_ids[]=' + id;
});
toCheck = toCheck.join('&');


function getSlipDays(submissionTime, dueTime) {
    var threshold = 1000 * 60 * cs10.gracePeriodMinutes,
        oneDay    = 1000 * 60 * 60 * 24,
        d1 = new Date(submissionTime),
        d2 = new Date(dueTime);

    var diff = Math.abs(d1 - d2);

    if (diff < threshold) {
        return 0;
    }
    return Math.ceil(diff / oneDay);
}


/* Iterate over all the assignments that slip days count towards:
 * URLs:
 * [BASE]/courses/ID/students/submissions ?
 * Query: assignment_ids[]=XXX&student_ids[]=XXX&grouped=true&include=assignment
 */
var STATE_GRADED = 'graded';
function calculateSlipDays(sid, callback) {
    var url, query;

    url = 'courses/' + cs10.courseID + '/students/submissions';

    // Include assignment details and group by student (we'll only have 1 stu)
    query = '?' + toCheck + '&include[]=assignment&include[]=submission_comments';
    // Include the student ID to query
    query += '&student_ids[]=' + cs10.normalizeSID(sid);

    cs10.get(url + query, '', function(error, response, body) {
        var days, verified, submitted, results;
        
        results = {
            totalDays: 0,
            overLimit: 0,
            assignments: [], // Assignment object described below
            errors: null
        };
        
        if (!body || body.errors) {
            results.errors = [];
            results.errors.push('Oh, Snap! Something went wrong. :(');
            results.errors.push(body.errors);
            callback(results);
            return;
        }

        // List of submissions contains only most recent submission
        body.forEach(function(subm) {
            state = subm.workflow_state;
            submitted = subm.submitted_at !== null;
            verified = false; // Reader explicitly left a comment
            // TODO: Check for muted assignments?
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

            results.totalDays += days;
            results.overLimit  = results.totalDays - cs10.allowedSlipDays;
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