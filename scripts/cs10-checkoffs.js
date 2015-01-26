// Description:
//   A simple interaction with the built in HTTP Daemon
//
// Dependencies:
//   bcourses library see ./bcourses/index.js
//
// Configuration:
//   See bcourses
//
// Commands:
//   hubot (late) check-off <NUM> (late) <SIDs> -- check of these students
//
// Author:
//  Michael Ball

var cs10 = require('./bcourses/');

var checkOffRegExp = /(late\s*)?(lab[- ])?check[- ]off\s+(\d+)\s*(late)?\s*((\d+\s*)*)\s*/i;
/* Hubot msg.match groups:
[ '@Alonzo check-off 12 late 1234 1234 1234',
  undefined, // Late?
  undefined, // The word "lab"
  '12',
  'late',
  '1234 1234 1234',
  '1234',
  index: 0,
  input: '@Alonzo check-off 12 late 1234 1234 1234' ]
*/

var LARoom = 'lab_assistant_check-offs';
var TARoom = 'lab_check-off_room';

// Global-ish stuff for successful lab checkoff submissions.
var successes;
var failures;
var expectedScores;
var timeoutID;

module.exports = function(robot) {
    
    robot.hear(checkOffRegExp, function(msg) {
        currentRoom = msg.message.room;
        
        // Develop Condition: 
        if (currentRoom === LARoom || currentRoom === 'Shell') {
            console.log('LA Check Off');
            doLACheckoff(msg);
        } else if (currentRoom === TARoom) {
            doTACheckoff(msg);
        } else {
            msg.send('Lab Check offs are not allowed from this room');
        }
    });

};


function doTACheckoff(msg) {
    // match[3] is the late parameter.
    var labNo  = msg.match[3],
        points = (msg.match[1] !== undefined || msg.match[4] !== undefined) ? 1 : 2,
        isLate = points === 1,
        SIDs   = msg.match[5].trim().split(/[ \t\n]/g),
        len    = SIDs.length,
        i      = 0,
        labsURL;

    SIDs = SIDs.map(cs10.normalizeSID);

    msg.send('Checking Off ' + SIDs.length + ' students for lab ' + labNo + '.');

    labsURL = cs10.baseURL + '/assignment_groups/' + cs10.labsID;

    cs10.get(labsURL + '?include[]=assignments', '', function(error, response, body) {
        var assignments = body.assignments,
            assnID, i = 0;

        if (!assignments) {
            msg.send('Oh crap, no assignments were found. Please check the lab number');
            return;
        }

        for (; i < assignments.length; i += 1) {
            var assnName  = assignments[i].name;
            // All labs are named "<#>. <Lab Title> <Date>"
            var searchNum = assnName.split('.');

            if (searchNum[0] == labNo) {
                assnID = assignments[i].id;
                break;
            }
        }
        if (!assnID) {
            msg.send('Well, crap...I can\'t find lab ' + msg.match[2] + '.');
            msg.send('Check to make sure you put in a correct lab number.');
            return;
        }

        successes = 0;
        failures = 0;
        expectedScores = SIDs.length;
        SIDs.forEach(function(sid) {
            if (!sid) { return; }
            
            postLabScore(sid, assnID, points, msg);
        });

        // wait till all requests are complete...hopefully.
        // Or send a message after 30 seconds
        timeoutID = setTimeout(function() {
            var scores = successes + ' score' + (successes == 1 ? '' : 's');
            msg.send('After 30 seconds: ' + scores + ' successfully updated for lab ' + labNo + '.');
        }, 30000);
    });
}

function doLACheckoff(msg) {
    // match[3] is the late parameter.
    var labNo  = msg.match[3],
        points = (msg.match[1] !== undefined || msg.match[4] !== undefined) ? 1 : 2,
        isLate = points === 1,
        SIDs   = msg.match[5].trim().split(/[ \t\n]/g),
        len    = SIDs.length;
        
    var LA_DATA = robot.brain.get('LA_DATA');
    if (!LA_DATA) {
        LA_DATA = [];
    }
    
    LA_DATA.push(
        {
            lab: labNo,
            late: isLate,
            sid: SIDs,
            time:  (new Date()).toString(),
            laname: msg.message.user.name,
            uid: msg.message.user.id,
            text: msg.message.text
        }
    );
    
    robot.brain.set('LA_DATA', LA_DATA);
    
    msg.send('Checking Off ' + SIDs.length + ' student for lab ' + labNo + '.');
        
        
}

function postLabScore(sid, labID, score, msg) {
var scoreForm = 'submission[posted_grade]=' + score,
    url = cs10.baseURL + '/assignments/' + labID + '/submissions/' +
            cs10.uid + sid;
    
    cs10.put(url , '', scoreForm, handleResponse(sid, score, msg));
}

// Error Handler for posting lab check off scores.
function handleResponse(sid, points, msg) {
    return function(error, response, body) {
        var errorMsg = 'Problem encountered for ID: ' + sid;
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
                msg.send('WARING: ' + failures + ' uploads failed.');
            }
        }
    };
}
