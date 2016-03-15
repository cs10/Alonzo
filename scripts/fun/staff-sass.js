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
//   hubot sass <name> - responds with a sassy comment directed at <name>
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
        "Remember when I asked for your opinion? Me neither...",
        "Do you mean to mumble, or is your mouth just full of BS!",
        "Your life must be so sad if you've got nothing better to do than annoy me...",
        "To be honest I don't even know why you keep trying because I honestly don't even care.",
        "Anyone who told you to be yourself couldn't have given you worse advice.",
        "Calling you stupid would be an insult to stupid people.",
        "I'd like to see things from your point of view, but I can't seem to get my head that far up my butt.",
        "I'll never forget the first time we met - although I'll keep trying.",
        "If ignorance is bliss, you must be the happiest person alive!",
        "Someday you will find yourself - and wish you hadn't."
    ];
    robot.respond(/sass (.+)/i, {id: 'fun.staff-sass.sass'}, function(resp) {
    	resp.send(`@${resp.match[1]} ${resp.random(sassResponses)}`);
    });
};