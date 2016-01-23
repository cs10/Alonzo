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
//
// Author:
//  Michael Ball

cs10 = require('./bcourses-config.js');

module.exports = function(robot) {
    robot.respond(/.*(links|forms).*/i, {
        id: 'cs10.links'
    }, function(msg) {
        var txt = [
            'Late Assignments Form: http://bjc.link/lateformfa15',
            `Grade book: ${cs10.gradebookURL}`,
            'Checkoff Answers: http://bjc.link/cs10checkoffquestions',
            'Contacts Sheet: http://bjc.link/cs10contacts',
            'Get Snap! Project: https://alonzo.herokuapp.com/snap-proj.html'
        ];
        // 'LA Attendance: https://bcourses.berkeley.edu/courses/1301477/external_tools/36957';
        msg.send(txt.join('\n'));
    });

    robot.respond(/\s*locker( combo)?/i, {
        id: 'cs10.locker'
    }, function(msg) {
        msg.send(process.env.LOCKER_COMBO);
    });

};
