import { ChatInputCommandInteraction, InteractionReplyOptions } from 'discord.js';
import { google } from 'googleapis';
import { googleApiCreds } from '../../secureConstants.ign';
import { SlashCommand } from '../types';
const youtube = google.youtube('v3');
let engineIndex = 0;

export class YoutubeCommand implements SlashCommand {
	static commandName = 'youtube';
	DM = true;
	async respond(payload: ChatInputCommandInteraction): Promise<InteractionReplyOptions> {
		const query = payload.options.getString('query')!;

		const searchResponse = await youtube.search.list({
			key: googleApiCreds[engineIndex].apiKey,
			part: ['snippet'],
			q: query,
			maxResults: 3,
			type: ['video'],
		});

		const videoId = searchResponse.data.items![0].id!.videoId;
		engineIndex++;
		if (engineIndex == googleApiCreds.length) {
			engineIndex = 0;
		}

		return {
			content: `**${query} https://www.youtube.com/watch?v=${videoId}**`,
		};
	}
}