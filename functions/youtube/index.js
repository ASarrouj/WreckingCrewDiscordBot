let { google } = require('googleapis');
let youtube = google.youtube('v3');
let engineIndex = 0;
const keys = require('../../searchKeys.ign.js');

module.exports = {
	commandName: 'youtube',
	DM: true,
	/**
	 *
	 * @param {import('discord.js').CommandInteraction} payload
	 * @returns {import('discord.js').InteractionReplyOptions}
	 */
	run: async (payload) => {
		const query = payload.data.options.find(option => {
			return option.name === 'query';
		}).value;

		const searchResponse = await youtube.search.list({
			key: keys[engineIndex].apiKey,
			part: 'snippet',
			q: query,
			maxResults: 3,
			type: 'video',
		});

		const videoId = searchResponse.data.items[0].id.videoId;
		engineIndex++;
		if (engineIndex == keys.length) {
			engineIndex = 0;
		}

		return {
			content: `**${query} https://www.youtube.com/watch?v=${videoId}**`,
		};
	},
	followup: async (messageObject) => {
		console.log(messageObject.embeds);
	}
};