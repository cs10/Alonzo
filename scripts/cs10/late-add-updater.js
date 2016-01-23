// Description:
//   Load late data collected from students and automatically set their assignment due dates in bcourses
//
// Dependencies:
//   request
//   hubot-google-auth
//   csv
//   bcourses library see ./bcourses-config.js
//	 cs10 caching library see ./caching.js
//
// Configuration:
//   See bCourses
//
// Commands:
// 	 hubot refresh (force)? late data -  pulls the late data and uploads it to bcourses, optional include force
//	 hubot review late data - pulls the late data and shows a summary of it's current state
//
// Author:
//  Andrew Schmitt
var fs = require('fs');
var request = require('request');
var HubotGoogleAuth = require('hubot-google-auth');
var parse = require('csv').parse();
var cs10 = require('./bcourses-config.js');
var cs10Cache = require('./caching.js');

// We'll initialize the google auth in the module.exports function
// since this is when we have access to the brain
var auth;

var CLIENT_ID = process.env.HUBOT_DRIVE_CLIENT_ID,
    CLIENT_SECRET = process.env.HUBOT_DRIVE_CLIENT_SECRET,
    REDIRECT_URL = process.env.HUBOT_DRIVE_REDIRECT_URL,
    SCOPES = 'https://www.googleapis.com/auth/drive';

// The google drive file ids for the late add files (responses and policies)
var LATE_RESPONSES_ID = cs10.LATE_ADD_RESPONSES_DRIVE_ID,
    LATE_POLICIES_ID = cs10.LATE_ADD_POLICIES_DRIVE_ID;

// Field names in the student responses form
var DATE_FIELD = 'What day did you add this class?',
    NAME_FIELD = 'What is your name?',
    TA_FIELD = 'Who is your TA?',
    SID_FIELD = 'What is your student id number?';

// Field names in the config file
var ASSIGN_FIELD = 'NAME',
    EXT_FIELD = 'EXTENSION',
    DEADLINE_FIELD = 'DEADLINE';

// Give a few days bonus to whatever day a student said that they added a class
var FUDGE_DAYS = 3;

// A way to count whether all sets of student groups (by week) were uploaded
var numGroupUploads = 0;

// Variables to hold data from the two file
var responseData,
    responseChanged,
    configData,
    configChanged,
    numRequests;

/**
 * Callback handlers
 */
var errorHandler = function(msg, cb) {
    if (cb) {
        return cb({
            err: null,
            msg: msg
        });
    }
    robot.logger.error(msg);
};

/**
 * Downloads a file from the given links and places it into a csv parser.
 *
 * @param  link  the download link
 * @param  cb    the callback is called with the array of csv data
 */
var downloadFromLink = function(link, cb) {

    // columns true means that each row is an object with columns as keys
    var parser = parse({
        columns: true,
        trim: true,
        auto_parse: true,
        auto_parse_date: true
    }, function(err, data) {
        if (err) {
            return errorHandler('Error encountered when reading from google drive file', cb);
        }

        return cb(null, data);
    });

    var stream = request.get(link)
        .auth(null, null, true, auth.getTokens().token)
        .on('error', function(err) {
            cb({
                err: err,
                msg: 'Download Error: failed to download file'
            });
        })
        .pipe(parser);
}

/**
 * Downloads a file with given id from drive
 * Calls the callback with the modified date of the file
 */
var downloadDriveFile = function(fileId, cb) {
    if (!auth.getTokens()) {
        var authMsg = `Please authorize this app by visiting this url: ${auth.generateAuthUrl()}` +
            'then use the command @Alonzo drive set code <code>';
        return errorHandler(authMsg, cb);
    }

    auth.validateTokens(function(err, resp) {

        if (err) {
            return errorHandler(`Could not refresh google auth tokens`, cb);
        }

        var mimeType = 'text/csv';
        auth.google.drive('v2').files.get({
            fileId: fileId
        }, function(err, resp) {
            if (err) {
                return errorHandler(`API Error: Problem downloading late add response file`, cb);
            }

            var links = resp.exportLinks,
                modDate = resp.modifiedDate;

            if (!links || !links[mimeType]) {
                return errorHandler(`File Type Error: No export link found for mimeType: ${mimeType}`, cb);
            }

            downloadFromLink(links[mimeType], function(err, resp) {
                if (err) {
                    return cb(err);
                }

                return (null, {
                    resp: resp,
                    modDate: modeDate
                });
            });

        });
    });
}

/**
 * Parse the config file, attempts to autoparse date strings
 */
function processConfigFile(force, cb) {

    var cachedData = cs10Cache.getLateAddPolicies();
    downloadDriveFile(LATE_POLICIES_ID, function(err, resp) {
        if (err) {
            return cb(err);
        }

        if (!data) {
            cb(null, null);
        }

        if (!cachedData || (cachedData.time < resp.modDate)) {
            configChanged = true;
            configData = resp;
            cs10Cache.storeLateAddPolicies(resp);
            return;
        }

        configData = configData.cacheVal;
        cb(null);
    });
}

/**
 * Gets the student responses file from google drive and downloads the csv file
 */
function processResponsesFile(force, cb) {

    var processStudentData = function(data) {
        var studData = {};

        studData.sid = data[SID_FIELD];
        studData.name = data[NAME_FIELD];
        studData.ta = data[TA_FIELD];
        studData.date = data[DATE_FIELD];

        return studData;
    };

    var cachedData = cs10Cache.getLateAddData();
    downloadDriveFile(LATE_RESPONSES_ID, cachedData, function(err, data) {
        if (err) {
            return cb(err);
        }

        if (!data) {
            cb(null, null);
        }

        var uploaded = {};
        if (cachedData) {
            uploaded = cachedData.cacheVal;
        }

        var toUpload = [];

        // iterate over 2D array of rows
        // skip first column since that is when the student filled out the form
        var studInfo;
        for (var i = 0; i < data.length; i++) {
            studInfo = processStudentData(data[i]);

            if (!uploaded[studInfo.id] || force) {
                toUpload.push(studInfo);
            }
        }

        responseData = toUpload;

        cb(null);

    });
}

/**
 * Attempts to set assignment date for given set of students, who are late n weeks
 * If successful should cache the students as uploaded.
 *
 * @param  studs  an array of the students whose dates need to be set
 * @param  n      number of weeks that the students added late 
 */
function setAssignmentDates(studs, n, cb) {

}

/**
 * Given a date computes the number of weeks that a student is late to the class
 */
function computeWeeksLate(date) {
    var start = cs10.START_DATE,
        daysLate = (date - start) / (1000 * 60 * 60 * 24);

    // Give them a little bit of extra
    return (daysLate + FUDGE_DAYS) % 7;
}

/**
 * Set assignments dates for the given set of student info objects into bcourses.
 */
function uploadToBcourses(studentData, configData, cb) {

    // If force or config changed we need to upload all student data again
    if (force || configChanged) {
        var cachedStudData = cs10Cache.lateAddData();

        if (cachedStudData) {
            for (var i = 0; i < cachedStudData.length; i++) {
                studentData.push(cachedStudData[i]);
            }
        }
    }

    // Upload student data in groups partitioned by number of weeks late
    var weeksLateMap = {},
        weeksLate,
        stud;

    numGroupUploads = 0;
    for (var i = 0; i < studentData.length; i++) {
        stud = studentData[i];
        weeksLate = computeWeeksLate(stud.date);
        if (!weeksLateMap[weeksLate]) {
            weeksLateMap[weeksLate] = [];
            numGroupUploads += 1;
        }
        weeksLateMap[weeksLate].push(stud);
    }

    for (var week in weeksLateMap) {
        setAssignmentDates(weeksLateMap[week], week, cb);
    }
    
}

/**
 * Reads from the late add spreadsheet and makes the appropriate updates to bcourses
 * This is the starting point for the late add updater
 *
 * @param  force  boolean, forces an update of all late add data
 * @param  cb     the callback function (err, resp)
 */
function updateLateData(force, cb) {
    responseData = null;
    configData = null;
    configChanged = false;
    var error = false;

    // First make sure that the assignments cache is valid and usable
    cs10Cache.allAssignments(function(err, resp) {

        if (err) {
            return cb(err);
        }

        var cb = function(err, resp) {
            if (err && !error) {
                error = true;
                return cb(err);
            }

            if (error) {
                return;
            }

            if (responseData && configData) {
                uploadToBcourses(responseData, configData, cb);
            }
        }

        // Async so do them at the same time
        processResponsesFile(force, cb);
        processConfigFile(force, cb);
    });
}

module.exports = function(robot) {

    auth = new HubotGoogleAuth('HUBOT_DRIVE', CLIENT_ID, CLIENT_SECRET, REDIRECT_URL, SCOPES, robot.brain);

    robot.respond(/(force)?\s*refresh\s*(force)?\s*late\s*(?:add)?\s*data/i, {
        id: 'cs10.late-add-updater.refresh'
    }, function(msg) {
        var msg = '',
            force = false;
        if (msg.match[1] || msg.match[2]) {
            force = true;
            msg = 'force ';
        }
        msg.send(`Attempting to ${msg}update student late data in bcourses...`);
        updateLateData(force, function(err, resp) {
            if (err) {
                msg.send(err.msg);
                return;
            }

            msg.send(resp.msg);
        });
    });

    robot.respond(/show late\s*(add)?\s*data/i, {
        id: 'cs10.late-add-updater.show'
    }, function(msg) {

    });
}