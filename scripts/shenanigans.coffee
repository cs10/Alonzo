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

  # For @ibirnam
  robot.respond /fuck you/i, (msg) ->
    if msg.message.room != process.env.HUBOT_SECRET_ROOM
      return
    msg.send "I'm here to serve you, #{msg.user.name}."

  robot.hear /(2|two)\s*(in)?\s*a\s*day/, (msg) ->
    if msg.message.room != process.env.HUBOT_SECRET_ROOM
      return
    msg.send 'https://www.youtube.com/watch?v=ElxHoUShy1c'