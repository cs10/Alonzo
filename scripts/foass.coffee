# Description:
#   Basic interface for FOAAS.com
#
# Commands
#   fu <object> - tells <object> to f off with random response from FOASS
#
# Dependencies:
#   None
#
# Author:
#   zacechola

options = [
  'off',
  'you',
  'donut',
  'shakespeare',
  'linus',
  'king',
  'chainsaw',
  'gobo'
]

module.exports = (robot) ->
  robot.hear /^fu (.\w*)/i, (msg) ->
    if msg.message.room != process.env.HUBOT_SECRET_ROOM
      return
    to    = msg.match[1]
    from  = msg.message.user.name
    random_fu = msg.random options

    msg.http("http://foaas.com/#{random_fu}/#{to}/#{from}/")
      .headers(Accept: 'application/json')
      .get() (err, res, body) ->
        try
          json = JSON.parse body
          msg.send json.message
          msg.send json.subtitle
        catch error
          msg.send "Fuck this error!"

