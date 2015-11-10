# Description:
#    Random fun stuff for TAs
#
# Commands:
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
  'Can I dock you points for that?!',
  'It will get graded faster if you shut up'
]

module.exports = (robot) ->

  # For @ibirnam
  robot.respond /fuck you/i, {id: 'secret.fu'}, (msg) ->
    if msg.message.room != process.env.HUBOT_SECRET_ROOM
      return
    msg.send "I'm here to serve you, #{msg.user.name}."

  robot.hear /(2|two)\s*(in)?\s*a\s*day/, {id: 'secret.2day'}, (msg) ->
    if msg.message.room != process.env.HUBOT_SECRET_ROOM
      return
    msg.send 'https://www.youtube.com/watch?v=ElxHoUShy1c'

  robot.hear /.*is it graded.*/i, {id: 'secret.grading'}, (msg) ->
    msg.send msg.random gradingResponses