fs = require 'fs'
util = require 'util'

# function to encode file data to base64 encoded string
base64_encode = (file) ->
    bitmap = fs.readFileSync(file)
    return new Buffer(bitmap).toString('base64')

module.exports = (robot) ->

	robot.respond /adapter test (sendfile|send file)/i, 'id': 'test.sendFile', (msg) ->
		msg.send 'Testing send file....'

		# Create a file
		testPath = './adapterTest.text'
		fs.writeFile testPath, 'This is a test for the hipchat adapter\'s sendFile Method', (err, resp) ->

			robot.logger.info 'Wrote to file'

			if err
				return robot.logger.info 'File Wrtie Error: #{err}'

			# If the file already exists then just look below for how to send it

			# Send file from path
			file_info1 = 
				name: 'adapter test: sendFile(1/2) from path'
				path: testPath
				type: 'text'

			msg.send '/file', file_info1

			# Send byte stream
			file_info2 = 
				name: 'adapter test: sendFile(2/2) from data'
				data: fs.readFileSync(testPath)
				type: 'text'

			msg.send(file_info2.data.toString())
			msg.send '/file', file_info2

	robot.respond /adapter test (sendHtml|send html)/i, 'id' : 'test.sendHtml', (msg) ->
		msg.send 'Testing send html...'

		# This is a hyperlink
		html = '<a href="https://www.hipchat.com">hipchat site</a>'
		msg.send '/html', html

		# This is a table
		html = '<table style="width:100%"><tr><td>Jill</td><td>Smith</td><td>50</td></tr><tr><td>Eve</td><td>Jackson</td><td>94</td></tr></table>'
		msg.send '/html', html


