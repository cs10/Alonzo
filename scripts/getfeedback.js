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

    // TODO make this a schedule
    robot.hear( /f/i, function(msg) {
        msg.send('Getting Feedback');
        // survey ID, page number, time, msg
        getResults(36448, 1, null, msg);
        msg.send("Thing??");
    });
    // TODO -- verify the time works and fix this
    // survey_time = robot.brain.get('survey_time') or new Date()

    // End Robot
    return;
};


var getResults = function(sid, page, time, msg) {
    // Note per_page must be 30 due to API bug
    var GF_OPT = {
      hostname: 'api.getfeedback.com',
      port: 443,
      path: '/surveys/'+ sid + '/responses?per_page=30&page=' + page + '&since=2014-07-12T04:22:46+08:00',
      method: 'GET',
      headers: {
        'Authorization': 'Bearer ' + GF_KEY,
        //'Accept': 'application/json',
      }
    };

    var req = https.get(GF_OPT, function(res) {
      var allData = '';
      res.on('data', function(chunk) {
          allData += chunk;
      });

      res.on('end', function(e) {
          // convert to object
          // check answers length
          // make new calls
          // send data to process
          console.log('end');
          var results = JSON.parse(allData.toString());
          var more = moreResponses(gfResults(results), 30);
          processResponse(results);
          // FIXME -- debugging!!
          if (more & false) {
\              console.log('Page: ' + (page + 1));
              getResults(sid, page + 1, null, msg);
          } else {
              console.log('no more results!! PAGE:  ' + page);
          }

      })
    }).end();

/**
    req.on('error', function(e) {
      console.error(e);
    }); */
};

/** Take in a GF response as a JS object and start checking responses
 *  to post issues to GitHub */
var processResponse = function(gf_data) {
    // Strip out the wrapper to get a response list
    var responses = gfResults(gf_data);
    // Filter for finished submissions
    responses = responses.filter(surveySubmitted);
    // Filter for submissions worth of posting
}

/** Check the submission to see if it should be posted to github
 * Returns true IFF
 * Rating: <= 3 (of 5)
 * Feedback: Exists and is > 10 characters
 */
var gitHubWorthy = function(gf_submission) {
    var ratingMatches, contentMatches,
        answers = responseAnswers(gf_submission);

    // Iterate over answers -- check type and content
    return ratingMatches & contentMatches
}


/***********************************************************************/
/************* GITHUB ISSUES FUNCTIONS *********************************/
/***********************************************************************/
var createGHIssue;
var createGHTags;
var responsePage;
var responseTopic;
var reponseCourse;
var createIssueBody;
var createIssueTitle;
/***********************************************************************/
/************* GET FEEDBACK RESPONSE FUNCTIONS *************************/
/***********************************************************************/

var isValidSubmission = function(gfResponse) {
    
}
/** Returns an array of survey response objects */
var gfResults = function(gfData) {
    return gfData['active_models'];
};

/** Given a response object from a single survey return the submitted status */
var surveySubmitted = function(gfResponse) {
    return gfResponse['status'] === 'completed';
}

/** Determine if there are more responses to be found */
var moreResponses = function(gfResults, pageSize) {
    return gfResults.length === pageSize;
}

/** Return true if the survey response is before the given time. */
var validTime = function(gfEesponse, time) {
    return gfEesponse['updated_at'] > time;
}

var responseAnswers = function(gfResponse) {
    return gfResponse['answers'];
}

/***********
 * schedule jobs to run
 * report / log errors
 * notify room of number of issues
 * notify of any pages with X many issues
 * handle multiple surveys
************/