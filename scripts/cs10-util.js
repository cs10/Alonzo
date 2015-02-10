// Description:
//  Simple stuff for TAs
//
// Dependencies:
//   None
//
// Configuration:
//   None
//
// Commands:
//   hubot links | forms -- show useful TA notes.
//   hubot locker combo? -- show the locker comber for lab
//
// Author:
//  Michael Ball

cs10 = require('./bcourses/');

module.exports = function(robot) {

    robot.respond(/.*(links|forms).*/i, function(msg) {
        var txt = '';
        txt += 'Late Assignments Form: http://bjc.link/sp15lateassignment\n';
        txt += 'Grade book:' + cs10.gradebookURL + '\n';
        txt += 'Contacts Sheet: http://bjc.link/cs10contacts\n';
        msg.send(txt)
    });
    
    robot.respond( /\s*locker( combo)?/i, function(msg) {
        msg.send('11-29-15');
    });
    
}