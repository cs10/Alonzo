// * Some useful functions for working with the hipchat api
// * Uses information that can be easily obtained from a hubot to make api requests (i.e. the jabberId of a room)
// * Most hipchat api requests need the room Id not the jabberId of a room, however, 
//   a room can be uniquely identified by its jabberId
// * A jabberId looks something like: 7_development@conf.hipchat.com
//   it is often called the xmpp_jid by the hipchat api
// * All callback function are fomatted as (err, resp) more specifically:
//   ({err: {the error}, msg: 'some useful error message'}, resp)

var mime = require('mime');
var request = require('request');
var fs = require('fs');
var path = require('path');

/**
 * The HipchatV2 object. Create with a valid auth Token
 * Generate this by visiting hipchat's api docs
 * Admin tokens have access to everything
 *
 * @param  authToken  a valid auth token for the hipchat api (note that these have varying scope)
 */
var HipchatV2 = function(authToken) {
    this.authToken = authToken;
    this.roomEndPoint = 'http://www.hipchat.com/v2/room';
    this.okCode = 200;
};
/**
 * Make an authenticated get request to the hipchat api
 *
 * @param  url  the url to get from
 * @param  cb   the callback function
 */
HipchatV2.prototype.makeGetRequest = function(url, cb) {
    var self = this;
    return request({
        url: url,
        method: 'GET',
        auth: {
            'bearer': self.authToken
        },
        json: true
    }, function(err, resp, body) {
        if (err || (resp.statusCode !== self.okCode)) {
            cb({err: err, msg: 'API error'});
            return;
        }
        cb(null, body);
    });
}

/**
 * Gets metadata for a room given a room id or name
 *
 * @param  roomIdName  the api id or api name of a room (can be obtained from listRooms)
 * @param  cb          the callback function (err, {room object})
 */
HipchatV2.prototype.getRoom = function(roomIdName, cb) {
    var url = this.roomEndPoint + '/' + encodeURIComponent(roomIdName);
    var req = this.makeGetRequest(url, cb);
}

/**
 * Lists all of the rooms available to the current user.
 * TODO: Handle Paging via max_size
 *
 * @param  cb  the callback function (err, [array of rooms])
 */
HipchatV2.prototype.listRooms = function(cb) {
    var req = this.makeGetRequest(this.roomEndPoint, function(err, resp) {
        if (err) {
            cb(err);
            return;
        }

        cb(null, resp.items);
    });
}

/**
 * Returns an object mapping (jabberId : roomId) for use in hipchat api calls
 * This is useful because you can extract the jabberId from the 'msg' passed to a hubot function
 *
 * @param  jid  the jabberId of the room that you would like to receive the api id of
 * @param  cb   the callback function (err, {jabberId: roomId})
 */
HipchatV2.prototype.createRoomMapping = function(cb) {
    var self = this;
    self.listRooms(function(err, rooms) {
        if (err) {
            cb(err, null);
            return;
        }

        var roomFound = false,
            roomsChecked = 0,
            numRooms = rooms.length,
            map = {};
    

        //ugh rate limiting
        for (var i = 0; i < numRooms; i++) {
            setTimeout(function(id) {
                self.getRoom(id, function(err, resp) {

                    roomsChecked += 1;
                    if (err) {
                
                        if (roomsChecked === numRooms) {
                            cb({err: err, msg: 'API error'}, map);
                        }
                        return;
                    }
                    map[resp.xmpp_jid] = id;

                    if (roomsChecked === numRooms) {
                        cb(null, map);
                    }

                });
            }, i * 500, rooms[i].id);
        }
    });
}

/**
 * Shares a file to a hipchat room.
 *
 * @param  file        the file to be uploaded
 * @param  roomIdName  the id or name of the room to upload the file to, does not need to be uri encoded
 * @param  cb          the callback function (err, resp)
 */
HipchatV2.prototype.shareFileFromPath = function(filePath, roomIdName, cb) {
    var self = this,
        encodedId = encodeURIComponent(roomIdName);
        hipchatUrl = `http://www.hipchat.com/v2/room/${encodedId}/share/file`,
        ext = path.extname(filePath),
        fileName = path.basename(filePath, ext),
        mimeType = mime.lookup(ext);

    if (!mimeType) {
        cb({
            err: err,
            msg: `No mimeType found for extension: ${ext}`
        });
        return;
    }

    fs.readFile(filePath, function read(err, data) {

        if (err) {
            cb({
                err: err,
                msg: 'File Read Error: could not read from file'
            });
            return;
        }

        // Send a multipart/related structured request
        var req = request({
            method: 'POST',
            url: hipchatUrl,
            headers: {
                'Authorization': 'Bearer ' + self.authToken
            },
            multipart: [{
                'Content-Type': 'application/json; charset UTF-8',
                'Content-Disposition': 'attachment; name="metadata"',
                'body': JSON.stringify({
                    'message': ''
                })
            }, {
                'Content-Type': 'file/' + mimeType,
                'Content-Disposition': `attachment; name="file"; filename="${fileName + ext}"`,
                'body': data
            }]},
            function(err, resp, body) {
                if (err) {
                    cb({
                        err: err,
                        msg: 'Upload to hipchat failed'
                    });
                    return;
                }

                cb(null, resp);
            });
    });
}

module.exports = HipchatV2;