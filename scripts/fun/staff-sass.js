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
// LISTENERS:
//    any words appearing in sheSaidKeywords will trigger a response
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
        resp.send(`So you can stop being such a n${msg.match[3]}b....`);
    });

    // Terms used for the bot to respond with
    // '@user That's what she said'
    var sheSaidKeywords = [
        'huge', 'giant', 'girth',
        'diameter', 'pound', 'enormous', 'massive',
        'fast(er)?', 'push', 'fist', 'ride'
    ],
        sheSaidRE = new RegExp(`.*\b${sheSaidKeywords.join('|\b')}`);

    robot.hear(sheSaidRE, {
        id: 'fun.staff-sass.what-she-said'
    }, function(resp) {
        if (resp.message.user.mention_name) {
            resp.send(`@${resp.message.user.mention_name} that's what she said... ${makeFeminist()}`);
        }
    });
};

// Flips a coin to determine whether that's what she said should have the
//  message: "And he respected it!" appended to the end.
//  This is not meant to be offensive. Just funny
function makeFeminist() {
    return (Math.random() < 0.5) ? '' : 'And he respected it!';
}
