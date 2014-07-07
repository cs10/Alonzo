# Description:
#   Collects GetFeedback survey results and posts github issues
#   TODO: Will eventually support queries for survey stats
#
# Dependencies:
#
#
# Configuration:
#   HUBOT_GETFEEDBACK_KEY
#   Github keys... TODO
#
# Commands:
#   None
#
# Notes:
#
#
# Author:
#   Michael Ball @cycomachead

# _ = require 'underscore'

module.exports = (robot) ->
  robot.hear /feedback/i, (msg) ->
    msg.send 'Getting Feedback'
    thing = getResults(36448, null, null, msg)
    msg.send "Thing?? #{thing}"
    msg.send 'Results called'
  
  # FIXME -- development
  GF_KEY = process.env.HUBOT_GETFEEDBACK_KEY || '52e5f268428245785c337cdc00be7541'
  console.log 'GF_KEY   ' + GF_KEY

  if !GF_KEY
    console.log "Warning: Configuration HUBOT_GETFEEDBACK_KEY is not defined."
    return

  # TODO -- verify the time works and fix this
  # survey_time = robot.brain.get('survey_time') or new Date()

  # Note this needs a survey ID, which will be provided.
  getFeedbackURL = 'https://api.getfeedback.com/surveys/:survey_id/responses'

  getResults = (sid, time, page, msg) ->
    url = getFeedbackURL.replace /:survey_id/g, sid
    console.log 'Getting Results'
    console.log(url)
    console.log('COFFEE HEADER: ' + 'Bearer ' + GF_KEY)
   
    msg.robot.http(url)
      .headers('Authorization', "Bearer " + GF_KEY)
      .headers('Accept', 'application/json')
      .get() (err, res, body) ->
        console.log 'GET CALLED'
        if err
          console.log "Ugh Error! #{err}"
          return

        if res.statusCode isnt 200
          console.log "Request didn't come back HTTP 200 :("
          return

        if response.getHeader('Content-Type') isnt 'application/json'
          console.log "Didn't get back JSON :("
          return

        data = null
        try
          data = JSON.parse(body)
          console.log data.keys()
          return
        catch error
          console.log "Ran into an error parsing JSON :("
          return
        return 'DAMN IT'
    # End getResults
    return
  
  # End Robot
  return
