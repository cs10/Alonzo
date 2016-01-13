{Response} = require 'hubot'

class HipchatResponse extends Response

	sendFile: (file_info) ->
		@robot.adapter.sendFile(@envelope, options)

	sendHtml: (strings...) ->
		@robot.adapter.sendHtml(@envelope, strings...)

module.exports = HipchatResponse