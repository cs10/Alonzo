// Description:
//  Report the Requester's IP address 
//
// Dependencies:
//   none
//
// URLs:
//   /ip-address
//
// Commands:
//  none
//
// Author:
//  Michael Ball

var edXAPI = 'https://bjcx-api.herokuapp.com';

module.exports = function(robot) {
    robot.router.get('/ip-address', function(req, res) {
        res.setHeader('Content-Type', 'text/plain');
        // Damn you, CORS...
        res.setHeader('Access-Control-Allow-Origin', '*');
        res.setHeader('Access-Control-Allow-Credentials', true);
        res.setHeader('Access-Control-Allow-Methods', 'POST, GET');
        res.setHeader('Access-Control-Allow-Headers',
                    'Origin, X-Requested-With, Content-Type, Accept');
        
        var ip = req.headers['x-forwarded-for'] || req.connection.remoteAddress;
        
        res.end(ip)
    });
};
