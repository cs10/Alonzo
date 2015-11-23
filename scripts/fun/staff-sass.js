module.exports = function(robot) {

	robot.respond(/([a-zA-Z]+) (?=\s*(is a)?\s*noob)/i, {id: "fun.staff-sass.is-a-noob"}, function(msg) {
		var name = msg.match[1];
		msg.send(`@${name} you should check out the collection of chatbot commands:`);
		msg.send('http://alonzo.herokuapp.com/Alonzo/help');
		msg.send('So you can stop being such a noob....');
	});
}