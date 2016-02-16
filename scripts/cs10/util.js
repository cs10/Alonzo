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

var _ = require('lodash');

var cs10 = require('./bcourses-config.js');

function findDueDates(resp) {
    // Send a message
    resp.send('Working on it...');
    var NOW = new Date();
    cs10.get(`${cs10.baseURL}/assignments`, { per_page: 100 }, function(err, res, body) {
            var next, future, msgText, due;
            // Skip the error handling!
            function dateDist(assn) { return new Date(assn.due_at) - NOW };
            function isFuture(assn) { return dateDist(assn) > 0 };
            future = _.filter(body, isFuture);
            next = _.minBy(future, dateDist);
            due = new Date(next.due_at).toLocaleString();
            msgText = `The next assignment ${next.name} is due on ${due}.`;
            // Notify the asker
            resp.reply(msgText);
    });
}

module.exports = function(robot) {
    robot.respond(/.*(links|forms).*/i, {
        id: 'cs10.links'
    }, function(msg) {
        msg.send(cs10.HELP_LINKS.join('\n'));
    });

    robot.respond(/\s*locker( combo)?/i, {
        id: 'cs10.util.locker-combo'
    }, function(msg) {
        msg.send(process.env.LOCKER_COMBO);
    });

    robot.respond(/find the next due date/i, findDueDates);

    robot.respond(/\s*(backup|back-up|back\s*up)\s*/i, {id: 'cs10.util.backup'}, function(msg) {
        msg.send(cs10.BACKUP_LINKS.join('\n'));
    });
};