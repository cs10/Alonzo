// Description:
//   Load late data collected from students and automatically set their assignment due dates in bcourses
//
// Dependencies:
//   bcourses library see ./bcourses-config.js
//	 cs10 caching library see ./caching.js
//	 google drive for hubot-hipchat package
//
// Configuration:
//   See bCourses
//
// Commands:
// 	 hubot refresh late data  pulls the late data and uploads it to bcourses
//	 hubot review late data   pulls the late data and shows a summary of it's current state
//
// Author:
//  Andrew Schmitt

var fs = require('fs');
var google = require('googleapis');
var drive = google.drive('v2');
var request = require('request');
var mime = require('mime');
var cs10 = require('./bcourses-config.js');
var cs10Cache = require('./caching.js');

// We'll initialize the google auth in the module.exports function
// since this is when we have access to the brain
var HubotGoogleAuth = require('hubot-google-auth');
var auth;

var CLIENT_ID = process.env.HUBOT_DRIVE_CLIENT_ID,
    CLIENT_SECRET = process.env.HUBOT_DRIVE_CLIENT_SECRET,
    REDIRECT_URL = process.env.HUBOT_DRIVE_REDIRECT_URL,
    SCOPES = 'https://www.googleapis.com/auth/drive';

var LATE_FILE_ID = cs10.LATE_ADD_DRIVE_ID;

/**
 * Downloads a file from the given links and places it into a temporary file.
 * Returns the path to the temporary file.
 *
 * @param  link  the download link
 * @param  cb    the callback which is called with the path to the file
 */
var downloadFromLink = function(link, cb) {
    var filePath = `./temp-late-add.csv`,
        stream = request.get(link)
        .auth(null, null, true, auth.getTokens().token)
        .on('error', function(err) {
            cb({
                err: err,
                msg: 'Download Error: failed to download file'
            });
        })
        .pipe(fs.createWriteStream(filePath));

    stream.on('finish', function() {
        cb(null, filePath);
    });
}

/**
 * Reads from the late add spreadsheet and makes the appropriate updates to bcourses
 *
 * @param  cb  the callback function (err, resp)
 */
function updateLateData(cb) {
    var mimeType = 'text/csv';
    auth.google.drive('v2').files.get({
        fileId: LATE_FILE_ID
    }, function(err, resp) {
        if (err) {
            console.log(err);
            return cb({
                err: err,
                msg: `API Error: Problem downloading late add file`
            });
        }

        var links = resp.exportLinks;

        if (!links || !links[mimeType]) {
            cb({
                err: null,
                msg: `File Type Error: No export link found for mimeType: ${mimeType}`
            });
            return;
        }

        downloadFromLink(links[mimeType], function(err, resp) {
            if (err) {
                return cb(err);
            }

            robot.logger.info(resp);

            fs.readFile(resp, function(err, data) {
                if (err) {
                    return cb({
                        err: null,
                        msg: 'File Read Error: could not read from file: ' + resp
                    });
                }

                var fileStr = data.toString('utf8');

                robot.logger.info(fileStr);
            });
        });
    });
}

module.exports = function(robot) {

    auth = new HubotGoogleAuth('HUBOT_DRIVE', CLIENT_ID, CLIENT_SECRET, REDIRECT_URL, SCOPES, robot.brain);

    robot.respond(/refresh late\s*(add)? data/i, {
        id: 'cs10.late-add-updater.refresh'
    }, function(msg) {
        msg.send('Attempting to update student late data in bcourses...');
        updateLateData(function(err, resp) {
            if (err) {
                msg.send(err.msg);
                return;
            }

            msg.send(resp.msg);
        });
    });

    robot.respond(/show late\s*(add)? data/i, {
        id: 'cs10.late-add-updater.show'
    }, function(msg) {

    });
}