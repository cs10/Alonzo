// Description:
//   Setup using the chatbot as a slightly more generic web server
//
// Dependencies:
//   zip
//   request
//
// Configuration:
//
//
// Author:
//  Michael Ball

var request = require('request');
var url = require('url');
var qs = require('querystring');
var zip = require('node-native-zip');

module.exports = function(robot) {
    robot.router.get('/download-project', function(req, res) {
        var baseURL = 'https://snap.apps.miosoft.com/SnapCloudPublic?';
        var query = url.parse(req.url).query;
        var qObj = qs.parse(query);

        // Get file from the URL query
        // Parse the encoded response
        // zip the project-text
        // respond w/ correct headers

        request.get(baseURL + query, function(error, response, body) {
            var data = qs.parse(body);
            var fileName = qObj['Username'] + '--' + data['ProjectName'] +
            '--' + data['Updated'];
            var archive = new zip();
            archive.add(fileName + '.xml', new Buffer(data['SourceCode'], 'utf-8'));
            res.setHeader('Content-disposition',
                          'attachment; filename=' + fileName + '.zip');
            res.type('application/zip');
            var buff = archive.toBuffer();
            res.setHeader('Content-Length', buff.length);
            res.write(buff);
            res.status(200).end();
        });

    });
}