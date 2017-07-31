# Description:
#   We are out of sweet rolls.
#
# Commands:
#   mention "sweet rolls"
#

# module.exports = (robot) ->
#   robot.respond /(sweet roll?s)/i, (msg) ->
#     msg.send 'We are out of sweet rolls.'

module.exports = (robot) ->
  robot.hear /(sweet rolls?)/i, (msg) ->
    msg.send 'we are out of sweet rolls.'
