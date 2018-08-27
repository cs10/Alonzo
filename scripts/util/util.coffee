# Description:
#   Handy utilties
#
# Dependencies:
#   None
#
# Configuration:
#   None
#
# Commands:
#   hubot calendar (me) - Display the current month's calendar
#   hubout room name - Display the current room name
#


child_process = require('child_process')
module.exports = (robot) ->
  robot.respond /calendar( me)?/i, (msg) ->
    child_process.exec 'cal -h', (error, stdout, stderr) ->
      msg.send(stdout)

  robot.respond /count char(?:acter)?s? (.*)/i, (resp) ->
    resp.send resp.match[1].length + ' characters'

  robot.respond /room name/i, (msg) ->
    msg.send msg.message.room

  robot.hear /@channel/i, (msg) ->
    msg.reply('Please be careful when using `@ channel`.')
