fs = require 'fs'
util = require 'util'

# function to encode file data to base64 encoded string
base64_encode = (file) ->
    bitmap = fs.readFileSync(file)
    return new Buffer(bitmap).toString('base64')

module.exports = (robot) ->

	robot.respond /adapter test (sendfile|send file)/i, 'id': 'test.sendFile', (msg) ->

		# Create a file
		testPath = './adapterTest.text'
		fs.writeFile testPath, 'This is a test for the hipchat adapter\'s sendFile Method', (err, resp) ->
			if err
				return robot.logger.info('File Wrtie Error: #{err}')

			# If the file already exists then just look below for how to send it

			# Send file from path
			file_info1 = 
				name: 'adapter test: sendFile(1/2) from path'
				path: testPath
				type: 'text'

			msg.sendFile(file_info1)

			# Send base64 encoded byte stream
			file_info2 = 
				name: 'adapter test: sendFile(2/2) from base64 data'
				data: base64_encode(testPath)
				type: 'text'

			msg.sendFile(file_info2)

	robot.respond /adapter test (sendHtml|send html)/i, 'id' : 'test.sendHtml', (msg) ->

		# send a hyperlink
		html = '<a href="https://www.hipchat.com">hipchat site</a>'
		msg.sendHtml(html)

	robot.respond /adapter test features/i, 'id' : 'test.features', (msg) ->

		msg.send 'testing features'
		msg.send '/code\n #{util.inspect myObject, false, null}'
