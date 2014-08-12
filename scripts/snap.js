// Description:
//  snap.js extensions for integrating Snap! and Hubot
//  Snap! is at: snap.berkeley.edu
//
// Dependences:
//   githubot
//
// Commands:
//   snap issues [since N days|hours|weeks] -- show the titles of issues posted to the Snap! github repo
//   snap project user[name] NAME proj[ect] PROJECT_NAME -- give a cloud URL for the given project
//   make project  XML_DATA -- Given a Snap! XML content, create a link to the file. The data could be base64 econded.
//  snap project XML user[name] NAME proj[ect] PROJECT_NAME -- this returns a decoded XML for a public cloud project. Useful for debugging Snap!

module.exports = function(robot) {

    // snap issues [since N days|hours|weeks]
    robot.respond(/snap issues(\s*since (\d)+ (day|week|hour)(s)*)*/i,
    function(msg) {
        /*
0: snap issues
1:
2:
3:
0: snap issues since 1 week
1:  since 1 week
2: 1
3: week
0: snap issues since 2 hours
1:  since 2 hours
2: 2
3: hour
        */
        // Length is an int, period is the type specified in the command
        // The default is 24 hours or 1 day.
        var len, peroid;
        console.log('match!');
        // Determine length and period
        len = msg.match[2] || 1;
        period = msg.match[3] || 'day';
        console.log(len);
        console.log(period);
        // var github = require('githubot');
        // Grab snap issues
        var issues = [];
        // Push each issue to the list with the form:
        // <# (link)> Title
        var issue_s = issues.length == 1 ? '' : 's';
        var period_s = len == 1 ? '' : 's';
        msg.send('Found ' + issues.length + ' issue' + issue_s +
        ' in the past ' + len  + ' ' + period + per_s + '.');
    }); // end snap issues
}
