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
#



child_process = require('child_process')
module.exports = (robot) ->
  robot.respond /calendar( me)?/i, (msg) ->
    child_process.exec 'cal -h', (error, stdout, stderr) ->
      msg.send(stdout)

  robot.respond /room name/i, (msg) ->
    msg.send msg.message.room

  robot.hear /@all/i, (msg) ->
    room = msg.message.room
    # TODO: Get users in a room.
    msg.reply('Please be careful when using @all.',
              'Perhaps you want to message a group like readers or TAs?')