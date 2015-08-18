/**
 *  DESCRIPTION:
 *  Loads subdirectories in the scripts folder.
 *
 *  COMMANDS:
 *  None
 *
 *  URLs:
 *  None
 *
 *  DEPENDENCIES:
 *  None
 *
 *  AUTHOR:
 *  Michael Ball
 */

var fs = require('fs');
var Path = require('path');

module.exports = function (robot) {
    var scriptsPath,
        dirs = fs.readdirSync('./scripts');

    dirs.forEach(function (dir) {
        // TODO: Better checking of file needed.
        if (dir.indexOf('.') == -1) {
            scriptsPath = Path.resolve(".", "scripts/", dir)
            robot.load(scriptsPath);
        }
    });
}