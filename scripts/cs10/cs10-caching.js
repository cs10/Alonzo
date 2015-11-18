//Some caching utility functions to check that things are working and to force caching to occur

var cs10 = require('./bcourses-config.js');

//Key for redis cache for an array of staff ids.
var STAFF_ID_CACHE_KEY = "STAFF_IDS";

module.exports = function(robot) {

    //refresh the ids on load
    refreshStaffIDs(function(err) {return;});

    robot.respond('/show cached staff ids/i', {id: 'cs10-caching.show-staff-ids'}, function(msg) {
        msg.send('/code', robot.brain.get(cs10.STAFF_ID_CACHE_KEY));
    });

    robot.respond('/refresh staff ids/i', {id: 'cs10-caching.refresh-staff-ids'}, function(msg) {
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

//Refreshes the current list of staff IDs
function refreshStaffIDs(cb) {
    var params = {enrollment_type: ['ta', 'teacher'], per_page: '100'};
    cs10.get('/courses/' + cs10.courseID + '/users?', params, function(err, resp, staffInfo) {
        if (err != null || staffInfo == null) {
            cb("there was a problem");
            return;
        }
        var staffIDs = [];
        for (var i = 0; i < staffInfo.length; i++) {
            staffIDs.push(staffInfo[i].id);
        }
        robot.brain.set(STAFF_ID_CACHE_KEY, staffIDs);
        cb(null);
    })
}
