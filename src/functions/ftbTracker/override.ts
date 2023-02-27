import { ChatInputCommandInteraction, Guild, InteractionReplyOptions } from 'discord.js';
import { SlashCommand } from '../types';
import { resetFtbPoints } from '../../db/queries';

export class FtbResetCommand implements SlashCommand {
	static commandName = 'ftbreset';
	async respond(payload: ChatInputCommandInteraction, guild: Guild): Promise<InteractionReplyOptions> {
		const user = guild.members.cache.get(payload.options.getUser('user', true).id)!;
		const pointAmt = payload.options.getInteger('points', true);
		const feedbackMessage = await resetFtbPoints(user, pointAmt);

		return {
			embeds: [
				{
					title: feedbackMessage,
				}
			]
		};
	}
}