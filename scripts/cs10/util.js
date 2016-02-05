// Description:
//  Simple stuff for TAs
//
// Dependencies:
//   bcourses/index.js
//
// Configuration:
//   See bcourses/index.js
//
// Commands:
//   hubot links | forms - CS10: show useful TA notes.
//   hubot locker (combo)? - CS10: show the locker comber for lab
//   hubot late form - CS10: show the link and password for the student late add form
//
// Author:
//  Michael Ball

cs10 = require('./bcourses-config.js');

module.exports = function(robot) {
    robot.respond(/.*(links|forms).*/i, {
        id: 'cs10.links'
    }, function(msg) {
        // 'LA Attendance: https://bcourses.berkeley.edu/courses/1301477/external_tools/36957';
        msg.send(cs10.HELP_LINKS.join('\n'));
    });

    robot.respond(/\s*locker( combo)?/i, {
        id: 'cs10.util.locker-combo'
    }, function(msg) {
        msg.send(process.env.LOCKER_COMBO);
    });
};