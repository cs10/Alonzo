// Description:
//   Our staff is too cheerful. They need to be sassed on occassion.
//   Everything here has only the intention of being funny, 
//   so try to relax a little if you feel mad bro ;)
//
// Dependencies:
//   N/A
//
// Configuration:
//   N/A
//
// Commands:
//   hubot <name> is a noob -- responds with the links for the chatbot commands
//
//  Listeners:
//    any words appearing in sheSaidKeywords will trigger a response
//
// Author:
//  Andrew Schmitt

module.exports = function(robot) {

    robot.respond(/([a-zA-Z]+) (\s*(is a)?\s*n(o0O)+b)/i, {
        id: 'fun.staff-sass.is-a-noob'
    }, function(msg) {
        var name = msg.match[1];
        msg.send(`@${name} you should check out the collection of chatbot commands:`);
        msg.send('http://alonzo.herokuapp.com/Alonzo/help');
        msg.send(`So you can stop being such a n${msg.match[2]}b....)`;
    });

    //add more terms here for alonzo to respond with '@user That's what she said'
    var sheSaidKeywords = ['huge', 'giant', 'girth',
        'diameter', 'pound', 'enormous', 'massive',
        'fast(er)?', 'push', 'fist', 'ride'
    ];
    robot.hear(new RegExp(`.*(${sheSaidKeywords.join('|')})`), {
        id: 'fun.staff-sass.what-she-said'
    }, function(msg) {
        msg.send(`@${msg.message.user.name} that's what she said... ${makeFeminist()}`);
    });
}

// Flips a coin to determine whether that's what she said should have the message:
// "And he respected it!" appended to the end. This is not meant to be offensive. Just funny
function makeFeminist() {
    return (Math.random() < .5) ? "" : "And he respected it!";
}