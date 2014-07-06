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

  GF_KEY = process.env.HUBOT_GETFEEDBACK_KEY

  if !GF_KEY
    console.log "Warning: Configuration HUBOT_GETFEEDBACK_KEY is not defined."
    return

 survey_time = robot.brain

