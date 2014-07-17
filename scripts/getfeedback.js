// Description:
//   Collects GetFeedback survey results and posts github issues
//   TODO: Will eventually support queries for survey stats
//
// Dependencies:
//     githubot
//
// Configuration:
//   HUBOT_GETFEEDBACK_KEY
//   HUBOT_GITHUB_TOKEN
//
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

var https = require('https'),
    github = require('githubot');
    
var GF_KEY = process.env.HUBOT_GETFEEDBACK_KEY;
var GH_KEY = process.env.HUBOT_GITHUB_TOKEN;

module.exports = function(robot) {
    if (!GF_KEY) {
        robot.logger.warning("Configuration HUBOT_GETFEEDBACK_KEY is not defined.");
        // exit because we can't get any surveys
        return;
    }

    if (!GH_KEY) {
        robot.logger.warning("Configuration HUBOT_GITHUB_KEY is not defined.");
        // don't exist because we can post to a chatroom
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
          var results = JSON.parse(allData.toString());
          var more = moreResponses(gfResults(results), 30);
          processResponse(results, new Date());
          if (more & false) {
              getResults(sid, page + 1, null, msg);
          } else {
              console.log('no more results!! PAGE:  ' + page);
          }

      });
    })
    
    req.on('error', function(e) {
        console.log('GetFeedback Request Error');
        console.error(e);
    });
    
    req.end();
    
};

/** Take in a GF response as a JS object and start checking responses
 *  to post issues to GitHub */
var processResponse = function(gfData, dateObj) {
    // Strip out the wrapper to get a response list
    var responses = gfResults(gfData);
    console.log('Responses Length: Prefilter: ' + responses.length);
    // Filter for finished submissions
    responses = responses.filter(function(item) {
        return isValidSubmission(item, dateObj);
    });
    console.log('Responses Length: Filter 1: ' + responses.length);
    // Filter for submissions worth of posting
    responses = responses.filter(isGitHubWorthy);
    console.log('Responses Length: Filter 2: ' + responses.length);
    var i = 353;
    responses.forEach(function(response) {
        data = createGitHubIssue(response);
        github.patch('/repos/beautyjoy/bjc-r/issues/' + i, data, function(issue) {
           console.log('issue posted!');
        });
        i += 1;
    });
};

/** Check the submission to see if it should be posted to github
 * Returns true IFF
 * Rating: <= 3 (of 5)
 * Feedback: Exists and is > 10 characters
 */
var isGitHubWorthy = function(gfItem) {
    // Iterate over answers -- check type and content
    var ratingMatches, contentMatches
        answers = responseAnswers(gfItem);
    answers.forEach(function(ans) {
        if (answerType(ans) === 'ShortAnswer') {
            contentMatches = ans['text'].length >= 10;
        } else if (answerType(ans) === 'Rating') {
            ratingMatches = ans['number'] <= 3;
        }
    });
    return ratingMatches & contentMatches;
};
 
/** Check the rating on "Scale" questions and make sure it's lower than 3
 *  3 works fine for now because the scale is out of 5.
 *  TODO: Eventually, this should be a % threshold
 */
var answerContent = function(gfSubmission) {
    var answers = responseAnswers(gfSubmission);
    // forEach sucks and can't be broken out of
    var i = 0;
    for(; i < answers.length; i += 1) {
        if (answerType(answers[i]) === 'ShortAnswer') {
            return answers[i]['text'];
        }
    }
    console.log('no shortAnswer item found');
    return false;
};

/** Check to make sure the text entered is at least 10 characters */
var answerRating = function(gfSubmission) {
    var answers = responseAnswers(gfSubmission);
    var i = 0;
    for(; i < answers.length; i += 1) {
        if (answerType(answers[i]) === 'Rating') {
            return answers[i]['number'];
        }
    }
    console.log('no rating answer found');
    return false;
};
/***********************************************************************/
/************* GITHUB ISSUES FUNCTIONS *********************************/
/***********************************************************************/

// Create the JSON map to use as the POST data
var createGitHubIssue = function(gfSubmission) {
    var issue = {
        title: createIssueTitle(gfSubmission),
        assignee: 'cycomachead', // FIXME -- for now
        body: createIssueBody(gfSubmission),
        labels: createIssueLabels(gfSubmission)
    };
    return issue;
};

/** Create a list of tags to use on GitHub */
var createIssueLabels = function(gfSubmission) {
    // Currently a static list but we can eventually improve this!
    var labels = ['GetFeedback', 'Needs Review'],
        topic  = responseTopic(gfSubmission),
        rating = answerRating(gfSubmission);
    // add a rating label (the bjc-r scheme)
    labels.push('Rating - ' + rating);
    
    // FIXME -- YAY for shitty list of conditionals.
    // captures recur and recursion sub dirs.
    if (topic.indexOf('recur') !== -1) {
        labels.push('Lab - Recursion');
    }
    if (topic.indexOf('intro') !== -1) {
        // TODO
    }
    if (topic.indexOf('python') !== -1) {
        labels.push('Lab - Besides Blocks');
    }
    if (topic.indexOf('list') !== -1) {
        labels.push('Lab - Lists');
    }
    return labels;
};

var responsePage = function(gfSubmission) {
    return gfSubmission['merge_map']['page'];
};

var responseTopic = function(gfSubmission) {
    return gfSubmission['merge_map']['topic'];
};

var responseCourse = function(gfSubmission) {
    return gfSubmission['merge_map']['course'];
};

var createIssueBody = function(gfSubmission) {
    var body;
    body  = '## GetFeedback Submission \n';
    body += '##### RATING: ' + answerRating(gfSubmission) + '\n';
    body += '##### Submission Time: ' + gfSubmission['updated_at'] + '\n';
    body += '##### Page: ' + responsePage(gfSubmission) + '\n';
    body += '##### Course: ' + responseCourse(gfSubmission) + '\n';
    body += '##### Topic: ' + responseTopic(gfSubmission) + '\n';
    //body += '#### [View the Page here](' + responseURL(url) + ')\n';
    body += '\n---\n\n';
    body += answerContent(gfSubmission);
    return body
};

var createIssueTitle = function(gfSubmission) {
    var topic = responseTopic(gfSubmission),
        strip = topic.lastIndexOf('/');
        topic = topic.slice(strip + 1, topic.length - 6);
    return 'Feedback: ' + responsePage(gfSubmission) + ' (' + topic + ')';
};

/***********************************************************************/
/************* GET FEEDBACK RESPONSE FUNCTIONS *************************/
/***********************************************************************/

/** Returns true if a submission is complete and the time is more recent 
 *  than submissionTime */
var isValidSubmission = function(gfItem, dateObj) {
    return isSurveySubmitted(gfItem) & isValidTime(gfItem, dateObj);
};

/** Returns an array of survey response objects */
var gfResults = function(gfData) {
    return gfData['active_models'];
};

/** Given a response object from a single survey return the submitted status */
var isSurveySubmitted = function(gfResponse) {
    return gfResponse['status'] === 'completed';
};

/** Determine if there are more responses to be found */
var moreResponses = function(gfResults, pageSize) {
    return gfResults.length === pageSize;
};

/** Return true if the survey response is before the given time. */
var isValidTime = function(gfResponse, dateObj) {
    return new Date(submissionTime(gfResponse)) <= dateObj;
};

var responseAnswers = function(gfResponse) {
    return gfResponse['answers'];
};

var answerType = function(gfAnswer) {
    return gfAnswer['type'];
};

var submissionTime = function(gfSubmission) {
    return gfSubmission['updated_at'];
};
/***********
 * schedule jobs to run
 * report / log errors
 * notify room of number of issues
 * notify of any pages with X many issues
 * handle multiple surveys
************/