# Description:
#    Random fun stuff for TAs
#
# Commands:
#    None
#
# Dependencies:
#    None
#

module.exports = (robot) ->

  robot.respond /this room/i, (msg) ->
    msg.send 'Room Info:'
    msg.send msg.message.room
    msg.send msg.user.room
    console.log msg

  robot.respond /fuck you/i, (msg) ->
    if msg.message.room != process.env.HUBOT_SECRET_ROOM
      return
    msg.send "I'm here to serve you, #{msg.user.name}."