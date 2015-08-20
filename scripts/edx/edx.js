// Description:
//  BJC edX Tools and notifcations.
//  These require some edX server running, which has been built for CS10
//  https://github.com/cs10/edx-api-server
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

var edXAPI = 'https://bjcx-api.herokuapp.com';

module.exports = function(robot) {
    var courseIDs = [
        'BerkeleyX/BJC.1x/3T2015',
        'BerkeleyX/BJC.2x/3T2015',
        'BerkeleyX/BJC.3x/1T2016',
        'BerkeleyX/BJC.4x/1T2016'
    ];
    var query = 'course=' + courseIDs.join('&course=');
    var endpoint = '/course-enrollment-total?' + query;

    robot.respond(/edx\s+(?:enrollment\s*)?update/i, {id: 'edx.update'}, function(msg) {
        msg.send('Alright, checking BJCx enrollment...');
        robot.http(edXAPI + endpoint).get()(function(err, resp, body) {
            if (err) {
                msg.reply('Uh, oh! An error occurred: ', err);
                return;
            }
            body = JSON.parse(body);
            var text = 'Here are the latest enrollment numbers:\n';
            text += courseIDs.map(function(id) {
                var short = id.split('/')[1];
                return short + ':\t' + body[id];
            }).join('\n');
            msg.send(text);
        });
    });

};
