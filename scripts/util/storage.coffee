# Description:
#   Inspect the data in redis easily
#
# Commands:
#   hubot show users - Display all users that hubot knows about
#   hubot show storage - Display the contents that are persisted in the brain


Util = require "util"

module.exports = (robot) ->
  robot.respond /show storage$/i, (msg) ->
    msg.send('Showing a list of values to inspect.',
             'Use @Alonzo show storage <item> to view that item\'s value.')
    output = Util.inspect Object.keys robot.brain.data 
    msg.send output

  robot.respond /show users$/i, (msg) ->
    response = ""

    for own key, user of robot.brain.data.users
      response += "#{user.id} #{user.name}"
      response += " <#{user.email_address}>" if user.email_address
      response += "\n"

    msg.send response

  robot.respond /show storage (.*)/i, (msg) ->
    data = robot.brain.data
    item = msg.match[1]
    if item == '_private'
      msg.send 'Showing Keys to Private Storage, use _private.X to get data.'
      output = Util.inspect Object.keys data[item]
    else if item.indexOf('_private.') != -1
      item = item.slice('_private.'.length) # trim the item strig to find.
      output = Util.inspect data._private[item], false, 4
      msg.send 'You will get a private message with your answer!'
      # Note - send if supposed to take a user ID, but this doesn't work?
      robot.send user: msg.message.user.id, output
      return
    else
      output = Util.inspect data[item], false, 4
    msg.send output
    