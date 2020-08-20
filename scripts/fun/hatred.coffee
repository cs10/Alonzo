# Description:
#   We are out of sweet rolls.
#
# Commands:
#   mention "sweet rolls"
#

# module.exports = (robot) ->
#   robot.respond /(\w* hates? you)/i, (msg) ->
#     msg.send 'We are out of sweet rolls.'

module.exports = (robot) ->
  robot.hear /(\w* hates? you)/i, (msg) ->
    msg.send 'I am so sorry to hear that. I, on the other hand, have nothing but love, respect, and affection for you.
    It is my deepest desire for you to get past these feelings of jealousy. I do not mean to be better than you; I simpy am.
    The sooner you accept this, the sooner we can be friends.'