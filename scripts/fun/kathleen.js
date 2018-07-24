// DESCRIPTION:
//   Kathleen provided many memorable quotes for our summer
//   staff. In appreciation, we've written a chat repository
//   un her honor. :)
//
// DEPENDENCIES:
//   None
//
// CONFIGURATION:
//   None
//
// COMMANDS:
//   hubot kathleen quote — responds with a random Kathleen quote
//
// AUTHOR:
//  The CS10 Su18 Staff

module.exports = function (robot) {

    var kathleenQuotes = [
        "Here's the boiled turnip",
        "Maxson looks like a mushroom...or a squid",
        "My tummy hasn't been this full in a long time",
        "I've been trying to prove fisting by induction",
        "I just like the sound of the word lactation",
        "That one about the Hamming distance",
        "No puns are natural, they are all eyelash extensions and nosejobs",
        "The derivatives in calculus are like slicing ham and then I got hungry",
        "I'm sure you sang everything with grace and beauty",
        "I thought the Donner Party was a hockey team..."
    ];
    robot.respond(/kathleen quote/, {id: 'fun.kathleen-quote.kathleen'}, function(resp) {
    	resp.send(`@${resp.match[1]} ${resp.random(kathleenQuotes)}`);
    });
};