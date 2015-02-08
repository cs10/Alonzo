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
//
// Author:
//  Michael Ball

module.exports = function(robot) {

    robot.respond(/.*(links|forms).*/, function(msg) {
        msg.send('Late Assignments Form: http://bjc.link/sp15lateassignment');
        msg.send()
    });
}