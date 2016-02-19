// This send emails to students using the mailgun service


var nodemailer = require('nodemailer');
var cs10 = require('./bcourses-config');

var CS10Emailer = function(username, password) {
	this.userEmail = username;
	this.userPassword = password;
}
module.exports = CS10Emailer;

CS10Emailer.prototype.sendMail = function(recipients, subject, messageBody, cb) {
	var transporter = nodemailer.createTransport({
	        service: 'Mailgun',
	        auth: {
	            user: this.userEmail,
	            pass: this.userPassword
	        }
	    });

    var message = {
        from: this.userEmail,
        to: recipients, // comma separated list
        subject: subject,
        html: messageBody
    };

    transporter.sendMail(message, function(error, info){
        if (error) {
            return cb(error);
        } 
        cb(null, info);
    });
};

/*********************************************
 * ADD ADDITIONAL HTML MESSAGE BUILDERS HERE *
 *********************************************/

/**
 * This code constructs the email message that is sent to late adds
 * dueDateInfo should be an array of the form: [{name: 'HW1', date: 'some date string'}]
 *
 * TODO: FIND A BETTER WAY TO DO THIS. THIS IS JANKY
 */
CS10Emailer.prototype.buildLateAddMessage = function(joinDate, dueDateInfo, studObj) {

    var lateAddAssignments = "";

    for (var i = 0; i < dueDateInfo.length; i++) {
        var asgn = dueDateInfo[i];
        lateAddAssignments += `<li>${asgn.name} is due for you on: ${asgn.date}</li>\n`;
    }

    var studentName = studObj.name,
        taName = studObj.ta,
        taEmail = studObj.taEmail;

    var message =
        `
        <h3> Hello ${studentName}, and Welcome to CS10!</h3>

        You're receiving this email because you filled out a late add form and told us that you added the class on: ${joinDate.toDateString()}
        <br>
        What this means for you is the following:
        <br>
        <ul>    
            <li> You need to get labs 1-8 checked off (in lab) by the time that we have the quest on: ${cs10.questDate.toDateString()}</li>
            <li> You need to complete reading quizzes 1-4 before the quest. Talk to your TA to set up times in lab to take your quizzes. These quizzes must be taken in lab</li>
            ${lateAddAssignments}
        </ul>

        Additionally, please make sure that you have access to the following sites: 
        <ul>
            <li>Our class question/answer forum on piazza.com </li> 
            <li>The CS10 class on bcourses.berkeley.edu (this is how you will see your grades) </li>
            <li>Theake a look at the assignment calendar and course policies at cs10.org </li>
        </ul>
        <br>
        If you have any other questions please don't hesitate to talk to your TA. ${taName} can be reached at: ${taEmail}, 
        but TAs don't like emails very much so try to go see ${taName} in lab or office hours (which you can find at cs10.org).
        <br>
        <br>
        Thanks!
        <br>
        - Alonzo, the CS10 bot
    `

    return message;
}

