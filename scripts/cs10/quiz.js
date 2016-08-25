// Description:
//  Reading quiz stuff for TAs
//
// Dependencies:
//   bcourses/index.js
//
// Configuration:
//   None
//
// Commands:
//   hubot quiz <n> password <word> - CS10: Resets a reading quiz password.
//
// Author:
//  Peter Sujan
//  Michael Ball

var crypto = require('crypto');

var cs10 = require('./bcourses-config.js');

// Resetting a password can only be done in the TA room
var TA_ROOM = 'CS10_Staff_Room(private)',
    RQ_GROUP_NAME = 'Reading Quizzes',
    RESET_MINS = 30,
    TIMEOUT = 1000 * 60 * RESET_MINS,
    // Store previous passwords
    prevQuizPW = {};
    // Map Quiz ID's to resetIDs.
    storedResetID = {};

// TODO: Store previous password, and warn if identical.
// TODO: Simplify this.
function getIDSetPW(quizNum, password, resp) {
    var url = `${cs10.baseURL}assignment_groups`,
        options = { 'include' : 'assignments' };

    cs10.get(url, options, function(error, response, body) {
        /*
            body is a list of assignment groups which have an assignments list
        */
        var assn = body.filter(function (grp) {
            return grp.name === RQ_GROUP_NAME;
        })[0].assignments.filter(function (assign) {
            return /\d+/.exec(assign.name)[0] === quizNum;
        })[0];
        setQuizPassword(assn.quiz_id, password, resp, autoResetCallback);
    });
}

function setQuizPassword(quizID, password, resp, callback) {
    var url = `${cs10.baseURL}quizzes/${quizID}`,
        options = { 'quiz[access_code]': password },
        prev = prevQuizPW[quizID];

    if (prev === password || prev === md5(password)) {
        resp.send('Warning: You should choose a different password!');
        resp.send('In the meantime, I\'ll begrudgingly use this password…');
    }
    cs10.put(url, '', options, callback(quizID, password, resp));
}


function md5(text) {
    return crypto.createHash('md5').update(text).digest('hex');
}

function autoResetCallback(quizID, password, msg) {
    return function (error, response, body) {
        if (error || response.statusCode >= 400) {
            msg.send('There was a problem setting the password.');
            if (body.access_code) {
                msg.send(`The current password is: ${body.access_code}`);
            }
        } else {
            var qz = msg.match[1];
            prevQuizPW[quizID] = password;
            msg.send(`Quiz ${qz} password updated successfully!`);
            msg.send(`New password: ${password}`);
            msg.send("Will update to random password in 30 minutes.");
            storedResetID[qz] = setTimeout(function() {
                var hash = md5(password);
                setQuizPassword(quizID, hash, msg, simpleResetCallback);
                prevQuizPW[quizID] = hash;
                storedResetID[qz] = null;
            }, TIMEOUT);
        }
    };
}

function simpleResetCallback(quizID, password, msg) {
    return function(error, response, body) {
        if (error || response.statusCode >= 400) {
            msg.send(`There was a problem resetting the password for quiz ${msg.match[1]}.`);
            if (body.access_code) {
                msg.send(`The current password is: ${body.access_code}`);
            }
        } else {
            msg.send(`Automatically reset quiz ${msg.match[1]} password.`);
        }
    };
}


function processQuizMessage(resp) {
    if (resp.message.room !== TA_ROOM && resp.message.room !== 'Shell') {
        resp.send('You\'re not allowed to set quiz passwords in this room.');
        return;
    }
    resp.send("Attempting to set quiz password.");
    var quizNum = resp.match[1],
        password = resp.match[2];
    if (storedResetID[quizNum]) {
        resp.send('Existing auto-reset was cleared.');
        clearTimeout(storedResetID[quizNum]);
    }
    getIDSetPW(quizNum, password, resp);
}

module.exports = function(robot) {
    robot.respond(
        /quiz\s*(\d+)\s*password\s*(\w+)/i,
        { id: 'cs10.quiz-pw' },
        processQuizMessage
    );
};
