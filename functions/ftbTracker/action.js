const fs = require('fs');
const path = require('path');

const filename = path.join(__dirname, 'ftbDatabase.ign.json');
let ftbDatabase = JSON.parse(fs.readFileSync(filename));

const applyFtbPoints = async (user, pointAmount) => {
	let logMsg;

	if (Object.keys(ftbDatabase).includes(user.id)) {
		ftbDatabase[user.id] += parseInt(pointAmount);
		logMsg = `${user.displayName} now has ${ftbDatabase[user.id]} FTB points (${pointAmount}).`;
	}
	else {
		ftbDatabase[user.id] = parseInt(pointAmount);
		logMsg = `User ${user.displayName} has now been created, starting with ${ftbDatabase[user.id]} FTB points.`;
	}
	fs.writeFileSync(filename, JSON.stringify(ftbDatabase));
	return logMsg;
};

const resetFtbPoints = async (user, pointAmount) => {
	let logMsg;

	if (Object.keys(ftbDatabase).includes(user.id)) {
		ftbDatabase[user.id] = parseInt(pointAmount);
		logMsg = `${user.displayName}'s FTB points have now been reset to ${ftbDatabase[user.id]}.`;
	}
	else {
		ftbDatabase[user.id] = parseInt(pointAmount);
		logMsg = `User ${user.displayName} has now been created, starting with ${ftbDatabase[user.id]} FTB points.`;
	}
	fs.writeFileSync(filename, JSON.stringify(ftbDatabase));
	return logMsg;
};

module.exports = {
	commandName: 'ftb',
	run: async (payload, guild) => {
		const subCommandOption = payload.data.options[0];

		if (subCommandOption.name === 'list') {
			return {
				embeds: [
					{
						title: 'FTB Standings',
						description: Object.entries(ftbDatabase).filter(ftbEntry => {
							return guild.members.cache.has(ftbEntry[0]);
						}).map((ftbEntry) => {
							let user = guild.members.cache.get(ftbEntry[0]);
							return `${user.displayName}: ${ftbEntry[1]}`;
						}).join('\n')
					}
				]
			};
		}
		else if (subCommandOption.name === 'edit') {
			const userId = subCommandOption.options.find(option => {
				return option.name == 'user';
			}).value;
			const pointAmt = subCommandOption.options.find(option => {
				return option.name == 'points';
			}).value;
			const user = guild.members.cache.get(userId);

			if (userId === payload.member.user.id){
				return {
					content: 'You cannot change your own FTB score.',
					flags: 64, // Means only sender can see this
				};
			}

			if (pointAmt < -20 || pointAmt > 20) {
				return {
					content: 'Point values must be between -20 and +20.',
					flags: 64, // Means only sender can see this
				};
			}
			if (pointAmt === 0) {
				return {
					content: 'Point value cannot be 0.',
					flags: 64, // Means only sender can see this
				};
			}

			const feedbackMessage = await applyFtbPoints(user, pointAmt);

			return {
				embeds: [
					{
						title: feedbackMessage,
					}
				]
			};
		}
	},
	applyFtbPoints,
	resetFtbPoints,
};