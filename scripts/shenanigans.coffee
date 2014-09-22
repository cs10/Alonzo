# Description:
#    Random fun stuff for TAs
#
# Commands:
#    None
#
# Dependencies:
#    None
#

# TODO: Add some stuff....
fuResponses = [

]

module.exports = (robot) ->

  robot.respond /this room/i, (msg) ->
    msg.send 'Room Info:'
    msg.send msg.message.room
    msg.send msg.user.room
    console.log msg

  # For @ibirnam
  robot.respond /fuck you/i, (msg) ->
    if msg.message.room != process.env.HUBOT_SECRET_ROOM
      return
    msg.send "I'm here to serve you, #{msg.user.name}."
    
  robot.hear /(2|two)\s*(in)?\s*a\s*day/, (msg) ->
    if msg.message.room != process.env.HUBOT_SECRET_ROOM
      return
    msg.send