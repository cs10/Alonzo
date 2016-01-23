// Description:
//   Perform caching of useful bCourses information in hubot's brain.
//
// Dependencies:
//   bcourses library see ./bcourses-config.js
//
// Configuration:
//   fs
//   util
//   See bCourses
//
// Commands:
//   hubot refresh (bcourses)? cache — refresh labs, staff ids, and student groups
//
// Author:
//  Andrew Schmitt
var fs = require('fs');
var util = require('util');
var cs10 = require('./bcourses-config.js');
var cs10Cache = {};

// Live time for a cache object
cs10Cache.CACHE_HOURS = 12;
cs10Cache.isEnabled = true;

/**
 * Cache keys for various things that are stored in the redis brain
 * and that are cs10 related
 * robot.brain.get(KEY) --> gets the data associated with the key
 * robot.brain.set(KEY, data) --> sets data for that cache key
 */
cs10Cache.STAFF_CACHE_KEY = 'STAFF_IDS',
cs10Cache.LAB_CACHE_KEY = 'LAB_ASSIGNMENTS',
cs10Cache.STUD_GROUP_CACHE_KEY = 'STUD_GROUPS',
cs10Cache.LA_DATA_KEY = 'LA_DATA',
cs10Cache.LATE_ADD_DATA_KEY = 'LATE_ADD_DATA',
cs10Cache.LATE_ADD_POLICY_KEY = 'LATE_ADD_POLICIES',
cs10Cache.ALL_ASSIGNMENTS_KEY = 'ALL_ASSIGNMENTS';

/**
 * Expects two objects (error, resp) which will each have a msg attribute
 * Should only be called from a scope  where msg can be bound
 */
function genericErrorCB(msg, error, resp) {
    if (error) {
        msg.send(error.msg);
        return;
    }
    msg.send(resp.msg);
}

/**
 * Give this data and it will put a time stamp on it. Hooray.
 */
function createCacheObj(data) {
    return {
        time: (new Date()).toString(),
        cacheVal: data
    };
}

/**
 * A general caching function
 *
 * @param url {string} the url endpoint for cache data from bcourses
 * @param params {object} query parameters
 * @param key {string} a cache key
 * @param proccessFunc {func(body)} a one argument function that processes the reponse body
 * @param errMsg {string} message passed to cb if the query fails
 * @param sucMsg {string} message passed to cb if the query succeeds
 * @param cb {func(err, resp)} the callback function. err and resp will have a msg attribute
 */
function cacheObject(url, params, key, processFunc, errMsg, sucMsg, cb) {
    cs10.get(url, params, function(err, resp, body) {

        if (err || !body || resp.statusCode >= 400) {
            if (cb) {
                cb({
                    msg: `${errMsg}\nAPI status: ${resp.statusCode}, ${resp.statusMessage}`
                }, null);
            }
            return;
        }


        robot.brain.set(key, createCacheObj(processFunc(body)));

        if (cb) {
            cb(null, {
                msg: sucMsg
            });
        }
    });
}

/**
 * Caches the current list of staff IDs
 *
 * cb - a function of (error, resp) or null
 */
cs10Cache.cacheStaffIDs = function(cb) {
    var url = `${cs10.baseURL}users`,
        params = {
            'per_page': '100',
            'enrollment_type': ['ta', 'teacher']
        },
        errMsg = 'There was a problem caching staff IDs :(',
        sucMsg = 'Successfully cached staff IDs! :)',
        key = cs10Cache.STAFF_CACHE_KEY;

    var staffIDProcessor = function(body) {
        var staffIDs = [];
        for (var i = 0; i < body.length; i++) {
            staffIDs.push(body[i].id);
        }
        return staffIDs;
    };

    robot.logger.info('Attempting to cache staff ids');
    cacheObject(url, params, key, staffIDProcessor, errMsg, sucMsg, cb);
};

/**
 * Caches the current list of assignment groups
 *
 * cb - a function of (error, resp) or null
 */
cs10Cache.cacheStudGroups = function(cb) {
    var url = `${cs10.baseURL}group_categories`,
        errMsg = 'There was a problem caching assignment groups :(',
        sucMsg = 'Successfully cached student groups! :)',
        key = cs10Cache.STUD_GROUP_CACHE_KEY;

    function studGroupsProcessor(body) {
        var groups = {},
            cat;
        for (var i = 0; i < body.length; i++) {
            cat = body[i];
            groups[cat.name] = cat.id
        }
        return groups;
    };

    robot.logger.info('Attempting to cache student groups');
    cacheObject(url, '', key, studGroupsProcessor, errMsg, sucMsg, cb);
};

/**
 * Caches lab assignments and the time at which they were cached
 *
 * cb - a function of (error, resp) or null
 */
cs10Cache.cacheLabAssignments = function(cb) {
    var url = `${cs10.baseURL}assignment_groups/${cs10.labsID}`,
        params = {
            'include[]': 'assignments'
        },
        errMsg = 'There was a problem caching lab assignments :(',
        sucMsg = 'Successfully cached lab assignments! :)',
        key = cs10Cache.LAB_CACHE_KEY;

    function labAssignmentProcessor(body) {
        return body.assignments;
    };

    robot.logger.info('Attempting to cache lab assignments');
    cacheObject(url, params, key, labAssignmentProcessor, errMsg, sucMsg, cb);
};

/**
 * Caches all assignments from bcourses, names, ids, base due date
 */
cs10Cache.cacheAllAssignments = function(cb) {

}

/**
 * Checks if a cacheObj is valid
 * Expects a cache object to be of the form {time: NUM, data: SOME_DATA_THING}
 */
cs10Cache.cacheIsValid = function(cacheObj) {
    var exists = cacheObj && cacheObj.cacheVal,
        date = cacheObj.time,
        diff = (new Date()) - (new Date(date));
    return exists && diff / (1000 * 60 * 60) < cs10Cache.CACHE_HOURS;
};

/**
 * We don't want to do auto refreshing and setting for these sets of data.
 * Instead we generate getters and setters
 * 
 * Data format:
 *  LaData is an array of checkoff objects. See checkoffs.js
 *  LateAddData is an array of late add student data see late-add-updater.hs
 *  LateAddPolicies is an array of objects representing the rows of a spreadsheet
 */
var dataMap = {
    'LateAddData': cs10Cache.LATE_ADD_DATA_KEY,
    'LateAddPolicies': cs10Cache.LATE_ADD_POLICY_KEY,
    'LaData': cs10Cache.LA_DATA_KEY
}
for (var dataName in dataMap) {
    cs10Cache['set' + dataName] = (function(key, data) {
        robot.brain.set(key, data);
    }).bind(null, dataMap[dataName]);

    cs10Cache['get' + dataName] = (function(key) {
        return robot.brain.get(key)
    }).bind(null, dataMap[dataName]);
}

/**
 * Below are functions that can be used to retrieve cached values.
 * You must provide a callback to each of these getter functions because if the cache is invalid
 * the function will attempt to refresh the cache for you.
 *
 * If the cache is disabled then the values will always be refreshed
 * 
 * All values returned are objects of the form:
 * {cacheVal: <data>, time: <time-stamp>}
 */
var cacheMap = {
    'staffIDs': {
        'key': cs10Cache.STAFF_CACHE_KEY,
        'func': cs10Cache.cacheStaffIDs
    },
    'studentGroups': {
        'key': cs10Cache.STUD_GROUP_CACHE_KEY,
        'func': cs10Cache.cacheStudGroups
    },
    'labAssignments': {
        'key': cs10Cache.LAB_CACHE_KEY,
        'func': cs10Cache.cacheLabAssignments
    },
    'allAssignments': {
        'key': cs10Cache.ALL_ASSIGNMENTS_KEY,
        'func': cs10Cache.cacheAllAssignments
    }
}
for (var funcName in cacheMap) {
    cs10Cache[funcName] = (function(accessor, cb) {
        var cacheObj = robot.brain.get(accessor['key']);
        if (cs10Cache.isEnabled && cs10Cache.cacheIsValid(cacheObj)) {
            return cb(null, cacheObj);
        }

        accessor['func'](cb);

    }).bind(null, cacheMap[funcName]);
}

/**
 * Refreshes course dependent cache objects.
 *
 * cb - a function of (error, resp) or null
 */
cs10Cache.refreshCache = function(cb) {
    cs10Cache.cacheStaffIDs(cb);
    cs10Cache.cacheStudGroups(cb);
    cs10Cache.cacheLabAssignments(cb);
    cs10Cache.cacheAllAssignments(cb);
};

/**
 * Enable or disbale this cache
 */
cs10Cache.enable = function() {
    cs10Cache.isEnabled = true;
}

cs10Cache.disable = function() {
    cs10Cache.isEnabled = false;
}

// Caching functions are allowed everywhere except the LA room
function isValidRoom(msg) {
    return msg.message.room !== cs10.LA_ROOM;
}

/**
 * This exports the robot functionality for the caching module
 */
var initialBrainLoad = true;
module.exports = function(robot) {

    // Refresh the cache on brain loaded
    robot.brain.on('loaded', function() {
        if (!initialBrainLoad) {
            return;
        }

        initialBrainLoad = false;
        cs10Cache.refreshCache(function(err, resp) {
            if (err) {
                robot.logger.debug(err.msg);
                return;
            }
            robot.logger.info(resp.msg);
        });
    });

    // Dump the contents of the brain to a file. Provide an optional key
    robot.respond(/(dump brain|brain dump)\s*(.+)?/i, {
        id: 'cs10.caching.dump-brain'
    }, function(msg) {
        var obj = robot.brain,
            key = msg.match[2],
            filePath = './temp-brain-dump.json';;
        if (key) {
            obj = robot.brain.get(key);
        }

        if (!obj) {
            msg.send(`Key does not exist: ${key}`);
            return;
        }

        var brainString = util.inspect(obj, {
            showHidden: true,
            depth: null
        });
        fs.writeFile(filePath, brainString, function(err) {
            if (err) {
                msg.send('Error writing to file for brain dump');
                fs.unlink(filePath);
                return;
            }
            var name = 'brain-dump';
            if (key) {
                name = 'brain-dump-' + key;
            }
            fileInfo = {
                path: filePath,
                type: 'json',
                name: name
            }

            if (robot.adapterName == 'hipchat') {
               msg.sendFile(fileInfo);
            } else {
                msg.send(`Files can only be sent via the hipchat adapter. You adapter is: ${robot.adapterName}`);
            }
            fs.unlink(filePath);
        });
    });

    robot.respond(/dump keys/i, {
        id: 'cs10.caching.dump-brain-keys'
    }, function(msg) {
        var keys = '';
        // This is hacky, but the brain doesn't expose it any other way
        for (var key in robot.brain.data._private) {
            keys += key + '\n'
        }
        filePath = './temp-brain-key-dump.json';
        fs.writeFile(filePath, keys, function(err) {
            if (err) {
                msg.send('Error writing to file for brain dump');
                fs.unlink(filePath);
                return;
            }

            fileInfo = {
                path: filePath,
                type: 'json',
                name: 'brain-key-dump'
            }

            if (robot.adapterName == 'hipchat') {
               msg.sendFile(fileInfo);
            } else {
                msg.send(`Files can only be sent via the hipchat adapter. You adapter is: ${robot.adapterName}`);
            }

            fs.unlink(filePath);
        });
    });

    robot.respond(/refresh\s*(bcourses)?\s*cache/i, {
        id: 'cs10.caching.refresh-lab-cache'
    }, function(msg) {
        if (!isValidRoom(msg)) {
            return;
        }
        msg.send('Waiting on bCourses...');
        cs10Cache.refreshCache(genericErrorCB.bind(null, msg));
    });

    /**
     * Clear all the la data. Needs confirmation.
     */
    var needConfirm = true;
    robot.respond(/CLEAR BRAIN KEY (.+)/, function(msg) {
        if (!robot.brain.get(msg.match[1])) {
            msg.send('Could not find a key with name: ' + msg.match[1]);
            return;
        }

        if (needConfirm) {
            msg.send('Are you sure???? Enter the command again if you are absolutely certain!');
            needConfirm = false;
            return;
        }

        robot.brain.remove(msg.match[1]);
        robot.brain.save();
        msg.send('Poof! All that data is GONE.');
        needConfirm = true;
    });
};

/**
 * This exposes functions to the outside.
 * But since we also want some robot listening being done we do this down here.
 */
for (var key in cs10Cache) {
    module.exports[key] = cs10Cache[key];
}