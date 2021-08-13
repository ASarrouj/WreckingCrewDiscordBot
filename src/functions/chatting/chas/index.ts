import { InteractionReplyOptions } from 'discord.js';
import { SlashCommand } from '../../types';

export class ChasCommand implements SlashCommand {
	static commandName = 'chas';
	async respond() : Promise<InteractionReplyOptions> {
		return {
			content: '<:lmao:547089522790498315> CHAS DOES IT AGAIN <:lmao:547089522790498315>',
		};
	}
}