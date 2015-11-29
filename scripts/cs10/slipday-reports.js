// Description
//  Upload a CSV of Slip Days
//
// Author
//  Michael Ball

var cs10 = require('./bcourses-config.js');

module.exports = function (robot) {

}

/*
var request = require('request'), //ezmode
  fs = require('fs');

var uploadFileName = 'tit.jpg';

fs.readFile('./' + uploadFileName, function read(err, data) {
  // hipchat appears to expect the file as a byte array
  // and does not support Content-Transfer-Encoding at the time of this gist's creation
  request.post({
    'url': 'https://api.hipchat.com/v2/room/{ID_OR_NAME}/share/file',
    'headers': {
      'Authorization': 'Bearer {auth_token}'
    },
    'multipart': [{
      'Content-Type': 'application/json; charset=UTF-8',
      'Content-Disposition': 'attachment; name="metadata"',
      'body': JSON.stringify({
        'message': "this whole object is optional"
      })
    }, {
      'Content-Type': '{file/mimetype}',
      'Content-Disposition': 'attachment; name="file"; filename="{filename.extension}"',
      'body': data
    }]
  }, function (err, results) {
    if (!err) {
      console.log(results);
    } else {
      console.error(err, results);
      console.error('---error');
    }
  });
});
*/

