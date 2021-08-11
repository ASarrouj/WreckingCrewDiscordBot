let resetFtbPoints = require('./action').resetFtbPoints;

module.exports = {
	commandName: 'ftbreset',
	/**
	 *
	 * @param {import('discord.js').CommandInteraction} payload
	 * @param {import('discord.js').Guild} guild
	 * @returns {import('discord.js').InteractionReplyOptions}
	 */
	run: async (payload, guild) => {
		const userId = payload.options.get('user').value;
		const pointAmt = payload.options.get('points').value;
		const user = guild.members.cache.get(userId);

		const feedbackMessage = await resetFtbPoints(user, pointAmt);

		return {
			embeds: [
				{
					title: feedbackMessage,
				}
			]
		};
	},
};