fs = require 'fs'

module.exports = (robot) ->

  robot.respond /adapter test (sendfile|send file)/i, 'id': 'test.sendFile', (msg) ->
    msg.send 'Testing send file....'

    # Create a file
    testPath = './adapterTest.text'
    fs.writeFile testPath, 'This is a test for the hipchat adapter\'s sendFile Method', (err, resp) ->

      if err
        return robot.logger.info "File Wrtie Error: #{err}"

      # If the file already exists then just look below for how to send it

      # Send file from path
      file_info1 = 
        name: 'adapter test\: sendFile from path'
        path: testPath
        type: 'text'

      msg.sendFile file_info1

      # Send byte stream
      file_info2 = 
        name: 'adapter test\: sendFile from data'
        data: fs.readFileSync('./scripts/test_scripts/Recursion.pdf')
        type: 'pdf'
        msg: 'A PDF just for you ;)'

      msg.sendFile file_info2

  robot.respond /adapter test (sendHtml|send html)/i, 'id' : 'test.sendHtml', (msg) ->
    msg.send 'Testing send html...'

    # This is a hyperlink
    html1 = '<a href="https://www.hipchat.com">hipchat site</a>'
    msg.sendHtml html1

    # This is a table
    html2 = '<table style="width:100%"><tr><td>Jill</td><td>Smith</td><td>50</td></tr><tr><td>Eve</td><td>Jackson</td><td>94</td></tr></table>'
    msg.sendHtml html2


