import { InteractionReplyOptions } from 'discord.js';
import { SlashCommand } from '../../types';

export class GoodBotCommand implements SlashCommand {
	static commandName = 'goodbot';
	DM = true;
	constructor() {	}

	async respond() : Promise<InteractionReplyOptions> {
		return {
			content: 'https://imgur.com/HaiJq9f',
		};
	}
}