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
var query = require('querystring');

module.exports = function(robot) {
    robot.router.get('/download-project', function(req, res) {
        var baseURL = 'https://snap.apps.miosoft.com/SnapCloudPublic?';
        var project = url.parse(request.url).query;
        // Get file from the URL query
        // Parse the encoded response
        // zip the project-text
        // respond w/ correct headers
        request.get(baseURL + url, function(error, response, body) {

        });
    });
}