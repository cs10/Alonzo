// Description:
//    Some handy bcrypt tools as a web endpoint.
//
// Dependencies:
//     bcrypt
//
// Configuration:
//      none
//
// Commands:
//
//
// Notes:
//
//
// Author:
//   Michael Ball @cycomachead

var bcrypt = require('bcrypt');

module.exports = function(robot) {

    robot.router.get('/hash/new/:item', function(req, res) {
        var item = req.params.item;

        res.type('text/plain');
        res.setHeader('Content-Type', 'text/plain');
        // Damn you CORS....
        res.setHeader('Access-Control-Allow-Origin', '*');
        res.setHeader('Access-Control-Allow-Credentials', true);
        res.setHeader('Access-Control-Allow-Methods', 'POST, GET');
        res.setHeader('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept');

        var hash = bcrypt.hashSync(item, 0);
        res.end(hash);
    });

    robot.router.get('/hash/verify/:item', function(req, res) {
        var item = req.params.item;
        // This sketches me out but is safer than using a standard parsed object
        var test = req._parsedOriginalUrl.query;
        res.type('text/plain');
        res.setHeader('Content-Type', 'text/plain');
        // Damn you CORS...
        res.setHeader('Access-Control-Allow-Origin', '*');
        res.setHeader('Access-Control-Allow-Credentials', true);
        res.setHeader('Access-Control-Allow-Methods', 'POST, GET');
        res.setHeader('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept');

        var result = bcrypt.compareSync(item, test);

        // Seriously...booleans aren't coreced to strings. wtf.
        res.end(result.toString());
    });

}