# Description:
#   Allows hubot to answer almost any question by asking Wolfram Alpha
#
# Dependencies:
#   "wolfram": "0.2.2"
#
# Configuration:
#   HUBOT_WOLFRAM_APPID - your AppID
#
# Commands:
#   hubot question <question> - Searches Wolfram Alpha for the answer to the question
#
# Notes:
#   This may not work with node 0.6.x
#
# Author:
#   dhorrigan
#   cycomachead (answer improvements)

Wolfram = require('wolfram').createClient(process.env.HUBOT_WOLFRAM_APPID)

module.exports = (robot) ->
  robot.respond /(?:question|wfa)\s*(image|img)*\s*(?:me)? (.*)$/i, (msg) ->
    Wolfram.query msg.match[2], (e, result) ->
      if result and result.length > 0
        primary = (item for item in result when item['primary'] == true)
        if primary and primary.length > 0
          obj = primary
        else
          obj = result
        msg.send obj[0]['subpods'][0]['value']
        if msg.match[1] and obj[0]['subpods'][0]['image']
          msg.send obj[0]['subpods'][0]['image']
      else
        msg.send 'Hmm...not sure'
