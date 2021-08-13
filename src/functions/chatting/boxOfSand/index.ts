import { InteractionReplyOptions } from 'discord.js';
import { SlashCommand } from '../../types';

export class BoxOfSandCommand implements SlashCommand {
	static commandName = 'boxofsand';
	constructor() {}
	async respond() : Promise<InteractionReplyOptions> {
		return {
			content: 'GOOD ONE JOE <:boxofsand:672942967966662689>',
		};
	}
}