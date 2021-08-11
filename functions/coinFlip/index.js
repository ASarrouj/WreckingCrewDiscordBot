module.exports = {
	commandName: 'coinflip',
	DM: true,
	/**
	 *
	 @returns {import('discord.js').InteractionReplyOptions}
	 */
	run: async () => {
		const rand = Math.random();

		if (rand < 0.5) {
			return {
				content: 'https://i.imgur.com/wMRCVkZ.png',
			};
		}
		return {
			content: 'https://i.imgur.com/B2vStF9.png'
		};
	}
};