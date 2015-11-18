//Some caching utility functions to check that things are working and to force caching to occur

var cs10 = require('./bcourses-config.js');

//don't let lab assistants play with the cache
var LA_ROOM = 'lab_assistant_check-offs';

module.exports = function(robot) {

    robot.respond('/show cached staff ids/i', {id: 'cs10-caching.show-staff-ids'}, function(msg) {
        if (msg.message.room === LA_ROOM) {
            return;
        }
        msg.send('/code', robot.brain.get(cs10.STAFF_CACHE_KEY));
    });

    robot.respond('/refresh staff ids/i', {id: 'cs10-caching.refresh-staff-ids'}, function(msg) {
        if (msg.message.room === LA_ROOM) {
            return;
        }
        msg.send('Refreshing staff ids...');
        cs10.refreshStaffIDs(function(err) { 
            if (err != null) {
                msg.send('I encountered a problem. Staff IDs were not cached!!!!!!');
                return;
            }
            msg.send('Staff IDs successfully cached :)');
        });
    });
}
