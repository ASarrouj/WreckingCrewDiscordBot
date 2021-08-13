const { idRegex } = require('./../../helpers').constants;

function muteText(userId, time) {

}

const commands = [
	{
		message: '!mute',
		info: 'Use the format \'!mute @User X\' to mute that user for that many minutes.'
	}
];

module.exports = {
	commands,
	func: (msg) => {
		if (msg.content.startsWith(commands[0].message)) {
			if (idRegex.test(msg.content) && /\s+\d+\s+/.test(msg.content)) {
				// not implemented
			}
			else {
				msg.author.send('Sorry, that isn\'t a valid format for this command.\nThe command requires tagging a user and containing a number of minutes to mute them for.');
			}
		}
	}
};