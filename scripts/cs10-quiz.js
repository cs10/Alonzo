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
//   hubot quiz <n> password <word> -- CS10: update the password for reading quiz <n>.
//
// Author:
//  Peter Sujan
// Augmented by Michael Ball

var crypto = require('crypto');

cs10 = require('./bcourses/');

// Resetting a password can only be done in the TA room
var TA_ROOM = 'cs10_staff_room_(private)';
var RESET_MINS = .1;

var TIMEOUT = 1000 * 60 * RESET_MINS;
var storedResetID = null;

function getQuizID(quizNum, password, msg, callback) {
    var url = cs10.baseURL + 'assignment_groups';
    var options = {
        'include' : 'assignments'
    };

    cs10.get(url, options, function(error, response, body) {
        body.forEach(function(group) {
            if (group.name == "Reading Quizzes") {
                group.assignments.forEach(function(assn) {
                    if (assn.name.match(/\d+/)[0] == quizNum) {
                        callback(assn.quiz_id, password, msg)
                    }
                });
            }
        });
    });
}

function setQuizPassword(quizID, password, msg) {
    var url = cs10.baseURL + 'quizzes/' + quizID;
    var options = {
        'quiz[access_code]': password
    };
    cs10.put(url, '', options, function(error, response, body) {
        if (error || !body || body.errors || body.access_code != password) {
            msg.send("There was a problem setting the password.");
            if (body.access_code) {
                msg.send('The current password is: ' + body.access_code);
            }
        } else {
            msg.send("Password for quiz " + msg.match[1] + " updated successfully!");
            msg.send("New password: " + password);
            msg.send("Will update to random password in 30 minutes.");
            storedResetID = setTimeout(function() {
                var md5 = crypto.createHash('md5');
                var hash = md5.update(password).digest('hex');
                autoResetPassword(quizID, hash, msg);
                storedResetID = null;
            }, TIMEOUT);
        }
    });
}


function autoResetPassword(quizID, password, msg) {
    var url = cs10.baseURL + 'quizzes/' + quizID;
    var options = {
        'quiz[access_code]': password
    };
    cs10.put(url, '', options, function(error, response, body) {
        if (error || !body || body.errors || body.access_code != password) {
            msg.send("There was a problem resetting the password for quiz " +
                msg.match[1] + ".");
            if (body.access_code) {
                msg.send('The current password is: ' + body.access_code);
            }
        } else {
            msg.send("Automatically reset quiz " + msg.match[1] + " password.");
            msg.send("New password: " + password);
        }
    });
}


processQuizMessage = function(msg) {
    if (msg.message.room != TA_ROOM || msg.message.room != 'Shell') {
        msg.send('You\'re not allowed to set quiz passwords in this room.');
        //return;
    }
    msg.send("Attempting to set quiz password.")
    var quizNum = msg.match[1];
    var password = msg.match[2];
    if (storedResetID !== null) {
        msg.send('Existing auto-reset was cleared.');
        clearTimeout(storedResetID);
    }
    getQuizID(quizNum, password, msg, setQuizPassword);
}

module.exports = function(robot) {
    robot.respond(/quiz\s*(\d+)\s*password\s*(\w+)/i, processQuizMessage);
}