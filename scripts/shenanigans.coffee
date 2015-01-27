# Description:
#    Random fun stuff for TAs
#
# Commands:
#    locker
#
# Dependencies:
#    None
#

# TODO: Add some stuff....
fuResponses = [

]

gradingResponses = [
  'Bitch, patience please!',
  'What do you think?!',
  'Can I dock you points for that?!'
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

  robot.respond /locker/, (msg) ->
    msg.send '11-29-15'

  robot.hear /.*is it graded.*/i, (msg) ->
    msg.send msg.random gradingResponses