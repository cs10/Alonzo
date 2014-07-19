# Description:
#   Random fun stuff for TAs
#
# Commands:
#   None
#

module.exports = (robot) ->

  robot.respond /this room/i, (msg) ->
    msg.send 'Room Info:'
    msg.send msg.message.room
    msg.send msg.user.room
    console.log msg
    
  robot.respond /testing!/, (msg) ->
    if msg.message.room != process.env.HUBOT_SECRET_ROOM
      msg.send 'Denied...'
    else
      msg.send 'Approved'