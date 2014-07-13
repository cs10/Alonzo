// Description:
//   Collects GetFeedback survey results and posts github issues
//   TODO: Will eventually support queries for survey stats
//
// Dependencies:
//
//
// Configuration:
//   HUBOT_GETFEEDBACK_KEY
//   Github keys... TODO
//
// Commands:
//   None
//
// Notes:
//
//
// Author:
//   Michael Ball @cycomachead

// _ = require 'underscore'

var https = require('https');

// FIXME -- development
var GF_KEY = process.env.HUBOT_GETFEEDBACK_KEY || '52e5f268428245785c337cdc00be7541';
console.log('GF_KEY   ' + GF_KEY);

module.exports = function(robot) {
    if (!GF_KEY) {
        console.log("Warning: Configuration HUBOT_GETFEEDBACK_KEY is not defined.");
        return;
    }

    robot.hear( /f/i, function(msg) {
        msg.send('Getting Feedback');
        getResults(36448, null, null, msg);
        msg.send("Thing??");
    });
    // TODO -- verify the time works and fix this
    // survey_time = robot.brain.get('survey_time') or new Date()

    // End Robot
    return;
};


// Note this needs a survey ID, which will be provided.
var GF_OPT = {
  hostname: 'api.getfeedback.com',
  port: 443,
  path: '/surveys/36448/responses',
  method: 'GET',
  headers: {
    'Authorization': 'Bearer ' + GF_KEY,
    'Accept': 'application/json',
    'Content-Type': 'application/json; charset=UTF-8'
  }
};

// TODO -- build the query string

var getResults = function(sid, time, page, msg) {
    console.log('Results Called');
    var req = https.get(GF_OPT, function(res) {
      console.log("statusCode: ", res.statusCode);
      console.log("headers: ", res.headers);
      var data = '';
      res.on('data', function(d) {
          console.log('data');
          // convert to object
          // check answers length
          // make new calls
          // send data to process
          console.log(data.length);
          data += d.toString();
          console.log(data.length);
      });

      res.on('end', function(e) {
          console.log('end');
          console.log(e);
          console.log('data');
          console.log(data);
          console.log(gfResults(JSON.parse(data)).length);
      })
    }).end();
    req.on('error', function(e) {
      console.error(e);
    });
};

/** Returns an array of survey response objects */
var gfResults = function(gf_data) {
    return gf_data['active_models'];
};

/** Given a response object from a single survey return the submitted status */
var surveySubmitted = function(gf_response) {
    return gf_response['submitted'] === 'completed';
}

/** */
var moreReponses = function(gf_results, page_size) {
    return gf_results.length === page_size;
}

/** */
var validTime = function(gf_response, time) {

}

/** */
var shouldBeSubmitted = function(gf_response) {

}

var responseAnswers = function(gf_response) {

}

var createGHIssue;
var createGHTags;
var responsePage;
var responseTopic;
var reponseCourse;
var filterCompletions;
var createIssueBody;
var createIssueTitle;

/***********
 * schedule jobs to run
 * report / log errors
 * notify room of number of issues
 * notify of any pages with X many issues
 * handle multiple surveys
************/