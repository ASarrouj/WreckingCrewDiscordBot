import {
	CommandInteraction,
	InteractionReplyOptions,
	MessageEmbed,
} from 'discord.js';
import { SlashCommand } from '../types';
import { getMemeStats } from '../../db/queries';

export class StatsCommand implements SlashCommand {
	static commandName = 'stats';
	DM = false;
	async respond(payload: CommandInteraction): Promise<InteractionReplyOptions> {
		const user = payload.options.getUser('user');

		const memeData = await getMemeStats(user?.id);

		return {
			embeds: memeData.map(userData => {
				const user = payload.guild?.members.cache.get(userData.user_id);

				return new MessageEmbed({
					author: {
						name: user?.displayName ?? '',
						iconURL: user?.user.avatarURL() ?? undefined
					},
					fields: [
						{
							name: 'Memes Posted',
							value: userData.memes_posted.toString(),
							inline: true
						},
						{
							name: 'Memes Archived',
							value: userData.memes_archived.toString(),
							inline: true
						},
						{
							name: 'Memes Rejected',
							value: userData.memes_rejected.toString(),
							inline: true
						},
						{
							name: 'Meme Archive Rate',
							value: `${(userData.memes_archived / userData.memes_posted * 100).toFixed(2)}%`,
							inline: true
						},
						{
							name: 'Avg Upvotes',
							value: userData.avg_upvotes.toFixed(2),
							inline: true
						}
					]
				});
			})
		};
	}
}