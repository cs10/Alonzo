# Description:
#   Random fun stuff for TAs
#
# Commands:
#   None
#

module.exports = (robot) ->

  robot.respond /this room/i, (msg) ->
    msg.send 'Room Info:'
    console.log msg
    msg.send msg.toString()
