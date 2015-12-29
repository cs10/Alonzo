// var cs10 = require('./bcourses-config.js');
// var cs10Cache = require('./caching.js');
// var drive = require('../drive/drive.js');

// This changes each semester
var LATE_ADD_FILE_ID='1HDNEOf3ZRlP_s3qEsVFa8PgXwmwEfCAGxpBi1hOaxdI';

/**
 * Reads from the late add file and makes the appropriate updates to bcourses
 */
// function updateLateData() {

// }

// module.exports = function(robot) {

//     robot.respond(/upload file/i, {id: 'cs10.drive.get-file'}, function(msg) {

//         var cb = function(err, resp) {
//             if (err != null) {
//                 msg.send(err.msg);
//                 return;
//             }
//             msg.send(resp);
//             msg.send('file downloaded');
//         };
//         var args = [LATE_ADD_FILE_ID, downloadSpreadSheet, cb];

//         validateToken(function(err,resp) {
//             if (err) {
//                 msg.send(err.msg);
//                 return;
//             }

//             getFile.apply(null, args);
//         });
//     });
// }