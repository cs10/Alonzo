var google = require('googleapis');
var driveAPI = google.drive('v2');
var GoogleSpreadsheet = require("google-spreadsheet");
var request = require('request');
var fs = require('fs');
var mime = require('mime');

var TOKEN_KEY = 'DRIVE_AUTH_TOKEN',
    REFRESH_KEY = 'DRIVE_REFRESH_TOKEN',
    EXPIRY_KEY = 'DRIVE_EXPIRE_TIME',
    GOOGLE_DOCS_URL = 'docs.google.com';

var CLIENT_ID = process.env.DRIVE_CLIENT_ID,
    CLIENT_SECRET = process.env.DRIVE_CLIENT_SECRET,
    REDIRECT_URL = process.env.DRIVE_REDIRECT_URL; 

// The drive object. Exports some functionality
var drive = {};

// Initialize the oauthClient
var OAuth2 = google.auth.OAuth2;
var oauthClient = new OAuth2(CLIENT_ID, CLIENT_SECRET, REDIRECT_URL);
google.options({ auth: oauthClient });
/**
 * HIPCHAT ONLY
 * Uploads a completed file to hipchat.
 *
 * @param  file      the file to be uploaded
 * @param  fileName  the name of the file
 * @param  mimeType  the mimeType of the file
 * @param  roomName  the name of the room to upload the file to
 * @param  cb        the callback function (err, resp)
 */
function uploadToHipchat(filePath, fileName, mimeType, roomName, cb) {
    request({
        method: 'PUT',
        preambleCRLF: true,
        postambleCRLF: true,
        uri: 'http://www.hipchat.com/v2/room/${room_name}/share/file',
        multipart: [
          {
            'Content-Type': 'application/json',
            'charset': 'UTF-8',
            'Content-Disposition': 'attachment; name="metadata"',
            body: {'message': 'File uploaded from google drive:'}
          },
          { 'Content-Type' : mimeType,
            'Content-Disposition': 'attachment; name="file"; filename="${fileName}"',
            body: fs.createReadStream(filePath)
          },
        ], 
        function(err, resp) {
            if (err) {
                cb({err: err, msg: 'Upload to hipchat failed'});
                return;
            }    

            cb(null);
        }
    });
}
/**
 * HIPCHAT ONLY
 * Attempts to uploads a file from google drive to the current hipchat room
 * Chooses the first file from the list by default
 * 
 * @param  fileName  the name of the file
 * @param  mimeType  the mimeType of the file
 * @param  cb        the callback function (err, resp)
 */
drive.uploadFileToHipchat = function(fileName, mimeType, roomName, cb) {
    fileName.replace("'", "\'");
    var queryString = `title='${fileName}'`; /** and mimeType='${mimeType}`;*/

    validateToken(function(err, resp) {
        if (err) {
            cb({err: err, msg: err.msg});
            return;
        }

        driveAPI.files.list({q: queryString}, function(err, resp) {
            if (err) {
                cb({err: err, msg: 'Authentication Error: failed to get a list of files for: ${fileName}'});
                return;
            }

            var files = resp['files'];

            if (!files || (files.length < 1)) {
                cb({err: err, msg: 'File Name Error: Failed to list files with given name: ${fileName}'});
                return;
            }

            var fileId = files[0]['id'],
                name = files[0]['name'],
                filePath = './temp-${name}',
                file = fs.createWriteStream(filePath);

            file.on('finish', function() {
                uploadToHipchat(filePath, fileName, mimeType, roomName, function(err, resp) {
                    if (err) {
                        cb(err);
                        return;
                    }

                    cb(null);
                });
            });

            driveAPI.files.get({alt: 'media', id: fileId}, function(err, resp) {
                if (err) {
                    cb({err: err, msg: 'API Error: Problem downloading file: ${name}'});
                    return;
                }
            }).pipe(file);
        });
    });
}
/**
 * Creates a new readable spreadsheet object from the given file id
 *
 * @param  fileId  the id of a file in google drive
 * @param  cb      the callback function (err,resp) which is called with a new spreadsheet object
 */
drive.createSpreadsheet = function(fileId, cb) {
    validateToken(function(err, resp) {
        if (err) {
            cb({err: err, msg:'error validating token for spreadsheet creation'});
            return;
        }

        cb(null, new GoogleSpreadsheet(fileId, oauthClient.access_token));
    });
}
/**
 * Stores the token and expire time into the robot brain and
 * Sets it in the oauthClient
 *
 * @param  token  the token object returned from google oauth2
 */
function storeToken(token) {
    oauthClient.setCredentials(token);
    robot.brain.set(TOKEN_KEY, token.access_token);
    if (token.refresh_token) {
        robot.brain.set(REFRESH_KEY, token.refresh_token);
    }
    robot.brain.set(EXPIRY_KEY, +token.expiry_date);
    robot.brain.save();
    robot.brain.resetSaveInterval(60);
}
/**
 * Initially tokens must be created from the command line.
 * This requires a user manually inputting a code so it cannot be done by the bot alone.
 * This generates the url where the code can be obtained
 */
function generateAuthUrl() {
    var scopes = [
        'https://www.googleapis.com/auth/drive'
    ];
    var authUrl = oauthClient.generateAuthUrl({
        access_type: 'offline',  //offline means that we get a refresh token
        scope: scopes
    });

    return authUrl;
}
/**
 * Used to set the code provided by the generated auth url. 
 * This code is generated for a user and is needed to initiate the oauth2 handshake.
 *
 * @param  code  the code obtained by a user from the auth url
 */
function setCode(code, cb) {
    oauthClient.getToken(code, function(err, token) {
        if (err) {
            console.log(err);
            cb({err: err, msg:'Error while trying to retrieve access token'});
            return;
        }
        console.log('tokens', token);
        storeToken(token);
        cb(null, "code successfully set");
    });
}
/**
 * Checks the current expire time and determines if the token is valid.
 * Refreshes the token if it is not valid.
 *
 * @param  cb  the callback function (err, resp), use this to make api calls
 */
function validateToken(cb) {
    var at = robot.brain.get(TOKEN_KEY),
        rt = robot.brain.get(REFRESH_KEY);

    if (at == null || rt == null) {
        robot.logger.info('tokens not set, must be set from terminal.');
            var authMsg = `Authorize this app by visiting this url:\n ${generateAuthUrl()}` +
                '\n\nThen use @Alonzo drive code <code>';

        cb({err: null, msg: authMsg});
        return;
    }

    var expirTime = robot.brain.get(EXPIRY_KEY),
        curTime = (new Date()) / 1000;
    if (expirTime < curTime) {
        oauthClient.refreshAccessToken(function(err, token) {
            if (err != null) {
                cb({err: err, msg: 'error refreshing token'}, null);
                return;
            }

            storeToken(token);
            cb(null);
        })
    }
}

// Export robot functions
var initialBrainLoad = true;
module.exports = function(robot) {

    var uploadRe = /drive\s+upload\s+([^\s].*)\s+(ext=\s*([^\s].*))?/i;

    robot.respond(uploadRe, {id: 'drive.upload-file'}, function(msg) {
        var fileName = msg.match[1],
            ext = msg.match[2];

        if (!ext) {
            msg.send('Missing Extension Type. \nThe upload command is of the form:\n @Alonzo drive upload <file-name> ext= <ext-type>');
            return;
        }

        var mimeType = mime.lookup(ext);

        if (!mimeType) {
            msg.send(`No valid mimeType found for provided extension: ${ext}`);
            return;
        }

        robot.logger.info('uploading file to hipchat');
        robot.logger.info(`fileName: ${fileName} mimeType: ${mimeType}`);
        drive.uploadFileToHipchat(fileName, mimeType, msg.jid, function(err, resp) {
            if (err) {
                msg.send(err.msg);
                return;
            }
        });
    });

    robot.respond(/drive\s+code\s+([^\s]+)/i, {id: 'drive.set-code'}, function(msg) {
        var code = msg.match[2];

        setCode(code, function(err,resp) {
            if (!err) {
                msg.send(resp);
                return;
            }

            msg.send(err.msg);
        });
    });

    robot.respond(/(show )?drive tokens/i, {id: 'drive.show-tokens'}, function(msg) {
        var tok = robot.brain.get(TOKEN_KEY),
            ref_tok = robot.brain.get(REFRESH_KEY),
            expire = robot.brain.get(EXPIRY_KEY);

        msg.send('token: ' + tok);
        msg.send('refresh token: ' + ref_tok);
        msg.send('expire date: ', expire);
    });

    // Set credentials on load. Does not validate/refresh tokens
    robot.brain.on('loaded', function() {
        if (!initialBrainLoad) {
            return;
        }

        initialBrainLoad = false;
        var at = robot.brain.get(TOKEN_KEY),
            rt = robot.brain.get(REFRESH_KEY);
        
        oauthClient.setCredentials({
            access_token: at,
            refresh_token: rt
        });

    });
}

// Export the drive module's functionality
for (var prop in drive) {
    if (drive.hasOwnProperty(prop)) {
        module.exports[prop] = drive[prop];
    }
}