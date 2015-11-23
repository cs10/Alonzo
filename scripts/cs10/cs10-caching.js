// Description:
//   Perform caching of useful bcourses information in hubot's brain.
//
// Dependencies:
//   bcourses library see ./bcourses-config.js
//
// Configuration:
//   See bcourses
//
// Commands:
//   hubot show cached staff (ids)? -- shows the ids of current cs10 staff members in hubot's brain
//   hubot refresh staff (ids)? (cache)? -- updates the staff member ids from bcourses to brain
//   hubot show cached labs -- list the labs and their due dates. Also the time at which the cache was last updated
//   hubot refresh lab cache -- updates the list of lab assignments
//   hubot refresh groups -- updates the mapping of group names to ids
//   hubot show (cached)? groups -- show the list of groups, names and ids
//   hubot refresh (bcourses)? cache -- refreshes labs, staff ids, and student groups
//
// Author:
//  Andrew Schmitt

var cs10 = require('./bcourses-config.js');
var cs10Cache = {};

//CONSTANTS
cs10Cache.CACHE_HOURS = 12;

/**
 * Cache keys for various things that are stored in the redis brain
 * and that are cs10 related
 * robot.brain.get(KEY) --> gets the data associated with the key
 * robot.brain.set(KEY, data) --> sets data for that cache key
 */
cs10Cache.STAFF_CACHE_KEY = 'STAFF_IDS';
cs10Cache.LAB_CACHE_KEY = 'LAB_ASSIGNMENTS';
cs10Cache.STUD_GROUP_CACHE_KEY = 'STUD_GROUPS';
cs10Cache.LA_DATA_KEY = 'LA_DATA';

/**
 * Below are functions that return cached values. 
 * There is a possibility that these values could be null initally, but, on loading,
 * Alonzo will referesh the cache.
 *
 * NOTE: All of these values return an object of {time: <cache-timestamp>, data: <actual-data>}
 *       except for la data currently.
 */
cs10Cache.staffIDs = function() {
    return robot.brain.get(cs10Cache.STAFF_CACHE_KEY);
}
cs10Cache.studentGroups = function() {
    return robot.brain.get(cs10Cache.STUD_GROUP_CACHE_KEY);
}
cs10Cache.labAssignments = function() {
    return robot.brain.get(cs10Cache.LAB_CACHE_KEY);
}
//TODO: implement cache object style for la data
cs10Cache.laData = function() {
    return robot.brain.get(cs10Cache.LA_DATA_KEY);
}

/**
 * Expects the respObj to have an error and msg attribute
 * Should only be called from a scope  where msg can be bound
 */
function genericErrorCB(msg, respObj) {
    if (!respObj.error) {
        msg.send(respObj.msg);
        return;
    }
    // Maybe do other things for error here 
    msg.send(respObj.msg);
}
/**
 * Give this data and it will put a time stamp on it. Hooray.
 */
function createCacheObj(data) {
    return {time: (new Date()).toString(), cacheVal: data}
}
/**
 * Caches the current list of staff IDs
 *
 * errCB - a one argument function that should accept an object as a parameter
 */
cs10Cache.cacheStaffIDs = function(errCB) {
    var url = `/courses/${cs10.courseID}/users`,
        params = {
            'per_page': '100',
            'enrollment_type[]': ['ta', 'teacher']
        };
    
    cs10.get(url, params, function(err, resp, staffInfo) {
        if (err || !staffInfo) {
            if (errCB) {
                errCB({error: true, msg: 'There was a problem caching staff IDs :('});
            }
            return;
        }

        var staffIDs = [];
        for (var i = 0; i < staffInfo.length; i++) {
            staffIDs.push(staffInfo[i].id);
        }
        robot.brain.set(cs10Cache.STAFF_CACHE_KEY, createCacheObj(staffIDs));

        if (errCB) {
            errCB({error: false, msg: 'Successfully cached staff IDs! :)'});
        }
    })
}
/**
 * Caches the current list of assignment groups
 *
 * errCB - a one argument function that should accept an object as a parameter
 */
cs10Cache.cacheStudGroups = function(errCB) {
    var url = `/courses/${cs10.courseID}/group_categories`;
    cs10.get(url, '', function(err, resp, categories) {
        if (err || !categories) {
            if (errCB) {
                errCB({error: true, msg: 'There was a problem caching assignment groups :('});
            }
            return;
        }
        var groups = {}
        categories.forEach(function(cat) {
            groups[cat.name] = cat.id;
        });
        robot.brain.set(cs10Cache.STUD_GROUP_CACHE_KEY, createCacheObj(groups));

        if (errCB) {
            errCB({error: false, msg: 'Successfully cached student groups! :)'})
        }
    });
}
/**
 * Caches lab assignmentst and the time at which they were cached
 *
 * errCB - a one argument function that should accept an object as a parameter
 */
cs10Cache.cacheLabAssignments = function(errCB) {
    var url   = `${cs10.baseURL}assignment_groups/${cs10.labsID}`,
        query = {'include[]': 'assignments'};

    cs10.get(url, query, function(err, response, body) {
        if (err || !body) {
            if (errCB) {
                errCB({error: true, msg: 'There was a problem caching lab assignments :('});
            }
            return;
        }

        robot.brain.set(cs10Cache.LAB_CACHE_KEY, createCacheObj(body.assignments));

        if (errCB) {
            errCB({error: false, msg: 'Successfully cached lab assignments! :)'})
        }
    });
}
//Checks if a cache is valid.
cs10Cache.cacheIsValid = function(cacheObj) {
    var exists = cacheObj && cacheObj.cacheVal;
    var date = cacheObj.time;
    var diff = (new Date()) - (new Date(date));
    return exists && diff / (1000 * 60 * 60) < cs10Cache.CACHE_HOURS;
}
/**
 * Refreshes course dependent cache objects.
 *
 * Things not refreshed:
 * - Lab Assistant Data
 *
 * Things refreshed:
 * - Staff IDs
 * - Stduent groups
 * - Lab assignments
 * 
 * errCB - a one argument function that should accept an object as a parameter
 */
cs10Cache.refreshCache = function(errCB) {
    cs10Cache.cacheStaffIDs(errCB);
    cs10Cache.cacheStudGroups(errCB);
    cs10Cache.cacheLabAssignments(errCB);
}

//Caching is allowed everywhere except the LA room
function isValidRoom(msg) {
    return msg.message.room !== cs10.LA_ROOM;
}
/**
 * This exports the robot functionality for the caching module
 */
module.exports = function(robot) {

    // Weirdness because the brain loads after the scripts. 
    // Set a 10 second timeout and then refresh the cache
    setTimeout(cs10Cache.refreshCache, 10000, function(respObj) {
        if (respObj.error) {
            robot.logger.error(respObj.msg);
            return;
        }
        robot.logger.info(respObj.msg)
    });

    // This is mostly for debugging as it currently does not show names mapped to ids.
    // TODO: Store names and ids in cache
    robot.respond(/show cached staff\s*(ids)?/i, {id: 'cs10.caching.show-staff-ids'}, function(msg) {
        if (!isValidRoom(msg)) {
            return;
        }
        msg.send(`/code${cs10Cache.staffIDs().cacheVal}`);
    });

    robot.respond(/refresh staff\s*(ids)?\s*(cache)?/i, {id: 'cs10.caching.refresh-staff-ids'}, function(msg) {
        if (!isValidRoom(msg)) {
            return;
        }
        msg.send('Refreshing staff ids...');
        cs10Cache.cacheStaffIDs(genericErrorCB.bind(null, msg));
    });

    robot.respond(/show cached labs/i, {id: 'cs10.caching.show-labs'}, function(msg) {
        if (!isValidRoom(msg)) {
            return;
        }
        var labs = cs10Cache.labAssignments(),
            labStr = "";
        labs.cacheVal.forEach(function(lab) {
            labStr += `${lab.name} - Due: ${(new Date(lab.due_at)).toDateString()}\n`
        });
        labStr += `Cache last updated on: ${(new Date(labs.time)).toDateString()}`;
        msg.send(labStr);
    });

    robot.respond(/refresh lab cache/i, {id: 'cs10.caching.refresh-labs'}, function(msg) {
        if (!isValidRoom(msg)) {
            return;
        }
        msg.send('Refreshing labs...');
        cs10Cache.cacheLabAssignments(genericErrorCB.bind(null, msg));
    });

    robot.respond(/show\s*(cached)?\s*groups/i, {id: 'cs10.caching.show-groups'}, function(msg) {
        if (!isValidRoom(msg)) {
            return;
        }

        var groups = cs10Cache.studentGroups(),
            grpStr = 'Current Student Groups:\n';
        for (var g_name in groups.cacheVal) {
            grpStr += `${g_name} - bcourses_id: ${groups.cacheVal[g_name]}\n`
        }
        grpStr += `Cache last updated on: ${(new Date(groups.time)).toDateString()}`;
        msg.send(grpStr);
    });

    robot.respond(/refresh groups/i, {id: 'cs10.caching.refresh-groups'}, function(msg) {
        if (!isValidRoom(msg)) {
            return;
        }
        msg.send("Refreshing groups...");
        cs10Cache.cacheStudGroups(genericErrorCB.bind(null, msg));
    });

    robot.respond(/refresh\s*(bcourses)?\s*cache/i, {id: 'cs10.checkoff.refresh-lab-cache'}, function(msg) {
        if (!isValidRoom(msg)) {
            return;
        }
        msg.send('Waiting on bCourses...');
        cs10Cache.refreshCache(genericErrorCB.bind(null, msg));
    });
}
/**
 * This exposes functions to the outside.
 * But since we also want some robot listening being done we do this down here.
 */
for (var key in cs10Cache) {
    module.exports[key] = cs10Cache[key];
}

