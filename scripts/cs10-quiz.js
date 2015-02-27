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
//   hubot links | forms -- show useful TA notes.
//
// Author:
//  Peter Sujan

cs10 = require('./bcourses/');

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
			callback(assn.quiz_id, password, msg) // should this be id??
		    }
		});
	    }
	});
    });
}

setQuizPassword = function(quizID, password, msg) {
    var url = cs10.baseURL + 'quizzes/' + quizID;
    var options = {
	'access_code': password
    };
    cs10.put(url, '', options, function(error, response, body) {
	if (error || !body || body.errors || body.access_code != password) {
	    msg.send("There was a problem setting the password.");
	    console.log(error);
	    
	} else {
	    msg.send("Password for quiz " + msg.match[1] + " updated successfully!");
	    msg.send("New password: " + password);
	    //msg.send("Will update to random password in 30 minutes.") // add this in when implemented
	}
    });
}

processQuizMessage = function(msg) {
    msg.send("Attempting to set quiz password.")
    var quizNum = msg.match[1];
    var password = msg.match[2];
    getQuizID(quizNum, password, msg, setQuizPassword);
}

module.exports = function(robot) {
    robot.respond(/quiz\s*(\d+)\s*password\s*(\w+)/i, processQuizMessage);
}