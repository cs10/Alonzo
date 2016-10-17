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
    srcs = [(-> (msg.http("http://thecatapi.com/api/images/get")
              .get() (err, res, body) ->
                msg.send res.headers.location)),
            (-> (msg.http("http://random.cat/meow")
              .get() (err, res, body) ->
                msg.send JSON.parse(body).file)),
            (-> (msg.http("http://pugme.herokuapp.com/random")
              .get() (err, res, body) ->
                msg.send JSON.parse(body).pug))
           ]
    srcs[Math.floor(Math.random() * srcs.length)]()
