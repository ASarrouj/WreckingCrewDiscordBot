import { InteractionReplyOptions } from 'discord.js';
import { SlashCommand } from '../../types';

export class PailOfWaterCommand implements SlashCommand {
	static commandName = 'pailofwater';
	constructor() {	}

	async respond() : Promise<InteractionReplyOptions> {
		return {
			content: 'HUHUHUHUHU JOE YOU\'RE KILLING ME MAN <:boxofsand:672942967966662689>',
		};
	}
}