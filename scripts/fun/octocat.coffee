# Description:
#   Show random octocat
#
# Dependencies:
#   "xml2js": "0.1.14"
#
# Configuration:
#   None
#
# Commands:
#   hubot octocat me - a randomly selected octocat
#   hubot octocat bomb me <number> - octocat-splosion!
#
# Author:
#   joshuaflanagan

module.exports = (robot) ->
  robot.respond /octocat\s*(?:me)?$/i, (msg) ->
    show_octocats msg, 1

  robot.respond /octocat\s+(?:bomb)\s*(?:me)?\s*(\d+)?/i, (msg) ->
    count = msg.match[1] || 5
    show_octocats msg, count
show_octocats = (msg, count) ->
  msg.http('http://feeds.feedburner.com/Octocats')
    .query(format: 'xml')
    .get() (err, res, body) ->
        octocats = res.match(/(?:<img src="http:\/\/octodex.github.com\/images\/)(.*)(?:" \/>)/gi).map(s => s.replace('<img src="', '').replace('" />', ''));
        msg.send(msg.random(octocats)) for i in [1..count]