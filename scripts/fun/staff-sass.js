// DESCRIPTION:
//   Our staff is too cheerful. They need to be sassed on occassion.
//   Everything here has only the intention of being funny,
//   so try to relax a little if you feel mad bro ;)
//
// DEPENDENCIES:
//   None
//
// CONFIGURATION:
//   None
//
// COMMANDS:
//   hubot <name> is a noob — responds with links to the chatbot commands
//
// AUTHOR:
//  Andrew Schmitt
//  Michael Ball

module.exports = function (robot) {

    robot.respond(/([a-zA-Z]+) (\s*(?:is a)?\s*n([o0O]+)b)/i, {
        id: 'fun.staff-sass.is-a-noob'
    }, function(resp) {
        var name = resp.match[1];
        resp.send(`@${name} you should check out the collection of chatbot commands:`);
        // TODO: Config this URL?
        resp.send('http://alonzo.herokuapp.com/Alonzo/help');
        resp.send(`So you can stop being such a n${resp.match[3]}b....`);
    });

    var sassResponses = [
    	""
    ];
    robot.respond(/sass (.+)/i, {id: 'fun.staff-sass.sass'}, function(resp) {
    	resp.send(`@${resp.match[1]} ${resp.random(sassResponses)}`);
    });
};