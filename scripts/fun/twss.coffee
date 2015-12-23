# Description:
#   Hubot will respond to (in)appropriate lines with "That's what she said"
#
# Dependencies:
#   None
#
# Configuration:
#   None
#
# Commands:
#   hubot <anything related to size, speed, quality, specific body parts> - Hubot will "that's what she said" that ish
#
# Author:
#   dhchow

require './twss/unrepeat'
require './twss/tokenize'
require './twss/stop'
require './twss/stem'
require './twss/bigram'

SENSITIVITY = 30 # the lower this number, the more often it will trigger
module.exports = (robot) ->
  robot.hear /.*/i, (msg) ->
    natural = require 'natural'
    userName = msg.message.user.mention_name
    # path from the root of hubot --> had to change this for it to work
    natural.BayesClassifier.load './scripts/fun/twss/classifier-twss.json', null, (err, classifier) ->
      check = (grams) ->
        c = classifier.getClassifications(grams)
        cmp = {}
        cmp[c[0].label] = c[0].value
        cmp[c[1].label] = c[1].value
        perc = cmp['positive']/cmp['negative']
        if perc > SENSITIVITY 
          return 'positive'
        return false
      if check(msg.message.text.unrepeat().tokenize().stop().stem().bigram()) == 'positive'
        # s = ["that's what she said","said the actress to the bishop","she said that","said the girl to the soldier"]
        # i = Math.floor(Math.random()*s.length)
        # msg.send s[i]
        msg.send "@#{userName} that's what she said... #{makeFeminist()}"

# Flips a coin to determine whether that's what she said should have the
#  message: "And he respected it!" appended to the end.
#  This is not meant to be offensive. Just funny  
makeFeminist = () ->
  if Math.random() < 0.5 then '' else 'And he respected it!'
