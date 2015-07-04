// Description:
//  BJC edX Tools and notifcations.
//
// Dependencies:
//   none
//
// Configuration:
//   none
//
// Commands:
//   hubot edx (enrollment)? update - show the status of BJC enrollment.
//
// Author:
//  Michael Ball

module.exports = function(robot) {
    var courseIDs = [
        
    ];
    var edXAPI = 'https://bjcx-api.herokuapp.com/course-enrollment-total?course=BerkeleyX/BJC.1x/3T2015&course=BerkeleyX/BJC.2x/3T2015&course=BerkeleyX/BJC.3x/1T2016&course=BerkeleyX/BJC.4x/1T2016';
    robot.respond(/edx\s+(?:enrollment\s*)?update/, function(msg) {
        msg.send('Checking BJCx Enrollment')
        robot.http(edXAPI).get()(function(err, resp, body) {
            if (err) {
                msg.reply('Uh, oh! An error occurred: ', err);
                return;
            }
            console.log(body);
        })
    })
}