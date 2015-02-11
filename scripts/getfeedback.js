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
//   hubot update feedback – Copy relevant lab feedback forms as Github issues
//
// Notes:
//
//
// Author:
//   Michael Ball @cycomachead

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

    robot.respond( /update feedback/i, function(msg) {

        msg.send('Updating Feedback');
        msg.send('https://github.com/beautyjoy/bjc-r/labels/GetFeedback');
        // survey ID, page number, time, msg
        getResults(36448, 1, robot.brain.get('SURVEY_TIME'), msg, function(num) {
            msg.send(num + ' issues posted.');
            return;
        });
        // msg.send('Finished!');
        // Update the time for the next call
        SURVEY_TIME = (new Date()).toISOString();
        robot.brain.set('SURVEY_TIME', SURVEY_TIME);
    });

    // End Robot
    return;
};


var getResults = function(sid, page, time, msg, callback) {
    // Note per_page must be 30 due to API bug
    var query  = '?per_page=30&page=' + page + '&since=' + time;
    var GF_OPT = {
      hostname: 'api.getfeedback.com',
      port: 443,
      path: '/surveys/'+ sid + '/responses' + query,
      method: 'GET',
      headers: {
        'Authorization': 'Bearer ' + GF_KEY,
        'Accept': 'application/json',
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
          var len = gfResults(results).length;
          msg.send('Found ' + len + ' result' + (len == 1 ? '.' : 's.'));
          processResponse(results, time, msg, callback);
          var more = moreResponses(gfResults(results), 30);
          if (more) { // Handle pagination
              getResults(sid, page + 1, null, msg);
          }
      });
    });

    req.on('error', function(e) {
        console.log('GetFeedback Request Error');
        console.error(e);
        msg.send('Oh Dear! An error has occurred. I am most sorry.');
    });

    req.end();
};

/** Take in a GF response as a JS object and start checking responses
 *  to post issues to GitHub */
var processResponse = function(gfData, dateStr, msg, callback) {
    // Strip out the wrapper to get a response list
    var responses = gfResults(gfData);
    console.log('Processing Survey ' + responses.length + ' Responses');
    // Filter for finished submissions
    responses = responses.filter(function(item) {
        return isValidSubmission(item, dateStr);
    });
    // Filter for submissions worth of posting
    responses = responses.filter(isGitHubWorthy);
    if (!responses.length) {
        console.log('No responses to post.');
        return;
    }
    responses.forEach(function(response) {
        data = createGitHubIssue(response);
        // TODO -- logging of errors needed!!
        github.post('/repos/beautyjoy/bjc-r/issues', data, function(issue) {});
        return;
    });
    var s = responses.length === 1 ? '' : 's';
    msg.send('Posted ' + responses.length + ' issue' + s + ' to Github bjc-r.');
    callback(responses.length);
    return;
};

/** Check the submission to see if it should be posted to github
 * Returns true IFF
 * Rating: <= 3 (of 5)
 * Feedback: Exists and is > 10 characters
 */
var isGitHubWorthy = function(gfItem) {
    // Iterate over answers -- check type and content
    var ratingMatches, contentMatches,
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
    return {
        title: createIssueTitle(gfSubmission),
        assignee: 'cycomachead', // FIXME -- for now
        body: createIssueBody(gfSubmission),
        labels: createIssueLabels(gfSubmission)
    };
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

var responseURL = function(gfSubmission) {
    return gfSubmission['merge_map']['url'];
};

var createIssueBody = function(gfSubmission) {
    var body;
    body  = '## GetFeedback Submission \n';
    body += '##### RATING: ' + answerRating(gfSubmission) + '\n';
    body += '##### Submission Time: ' + gfSubmission['updated_at'] + '\n';
    body += '##### Page: ' + responsePage(gfSubmission) + '\n';
    body += '##### Course: ' + responseCourse(gfSubmission) + '\n';
    body += '##### Topic: ' + responseTopic(gfSubmission) + '\n';
    if (responseURL(gfSubmission)) {
        body += '#### [View the Page here](' + responseURL(gfSubmission) + ')\n';
    }
    body += '\n---\n\n';
    body += answerContent(gfSubmission);
    return body;
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
    // TODO: If since parameter is working we don't need the second check...
    return isSurveySubmitted(gfItem); // & isValidTime(gfItem, dateObj);
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
var isValidTime = function(gfResponse, dateStr) {
    return new Date(submissionTime(gfResponse)) >= new Date(dateStr);
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
 * handle multiple surveys
************/