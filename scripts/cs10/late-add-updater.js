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

var cs10 = require('./bcourses-config.js');
var cs10Cache = require('./caching.js');
var google = require('googleapis');
var drive = google.drive('v2');
var request = require('request');
var fs = require('fs');
var mime = require('mime');

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
        .auth(null, null, true, robot.brain.get(TOKEN_KEY))
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
 * Reads from the late add file and makes the appropriate updates to bcourses
 *
 * @param  cb  the callback function (err, resp)
 */
// function updateLateData(cb) {
//     drive.files.get({
//             fileId: fileId
//         }, function(err, resp) {
//             if (err) {
//                 cb({
//                     err: err,
//                     msg: `API Error: Problem downloading file: ${title}`
//                 });
//                 return;
//             }

//             var links = resp.exportLinks;

//                 if (!links || !links[mimeType]) {
//                     cb({
//                         err: err,
//                         msg: `File Type Error: No export link found for mimeType: ${mimeType}`
//                     });
//                     return;
//                 }
//         }
//     });
// }

module.exports = function(robot) {


    robot.respond(/refresh late data/i, {
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
}