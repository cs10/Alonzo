# Description:
#   Aww yourself to bliss
#
# Dependencies:
#   None
#
# Configuration:
#   None
#
# Commands:
#   hubot aww - Get a cute animal

module.exports = (robot) ->

  robot.respond /aww/i, (msg) ->
    msg.http("http://thecatapi.com/api/images/get")
      .get() (err, res, body) ->
        msg.send res.headers.location
