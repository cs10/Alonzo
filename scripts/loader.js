// DESCRIPTION:
// Loads subdirectories in the scripts folder.
//
// AUTHOR:
// Michael Ball


var fs = require('fs');
var Path = require('path');

module.exports = function (robot) {
    var scriptsPath,
        dirs = fs.readdirSync('./scripts');

    dirs.forEach(function (dir) {
        if (dir.indexOf('.') == -1) {
            scriptsPath = Path.resolve(".", "scripts/", dir);
            console.log(scriptsPath);
            robot.load(scriptsPath);
        }
    });
};