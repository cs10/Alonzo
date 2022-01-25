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
#   hubout room name - Display the current room name
#

module.exports = (robot) ->
  robot.respond /room name/i, (msg) ->
    msg.send msg.message.room
