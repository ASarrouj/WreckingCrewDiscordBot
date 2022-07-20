import {
	CommandInteraction,
	GuildMember,
	InteractionReplyOptions,
	MessageEmbed,
} from 'discord.js';
import { SlashCommand } from '../types';
import { createOrGetFtbEntry } from '../ftbTracker';

export class StatsCommand implements SlashCommand {
	static commandName = 'stats';
	DM = false;
	async respond(payload: CommandInteraction): Promise<InteractionReplyOptions> {
		const user = payload.options.getUser('user');

		const embeds:MessageEmbed[] = []
		if (user) {
			embeds.push(createStatEmbed(payload.guild!.members.cache.get(user.id)!));
		}
		else {
			payload.guild!.members.cache.filter(member => !member.user.bot).each(member => {
				embeds.push(createStatEmbed(member))
			})
		}

		return {
			embeds
		};
	}
}

function createStatEmbed(user: GuildMember) {
	const ftbEntry = createOrGetFtbEntry(user)
	return new MessageEmbed({
		author: {
			name: user.displayName,
			iconURL: user.user.avatarURL()!
		},
		fields: [
			{
				name: 'Memes Posted',
				value: String(ftbEntry.memesPosted),
				inline: true
			},
			{
				name: 'Memes Archived',
				value: String(ftbEntry.memesArchived),
				inline: true
			},
			{
				name: 'Memes Rejected',
				value: String(ftbEntry.memesRejected),
				inline: true
			},
			{
				name: 'Meme Archive Rate',
				value: `${String(((ftbEntry.memesArchived / ftbEntry.memesPosted) * 100).toFixed(2))}%`,
				inline: true
			},
			{
				name: 'Avg Upvotes',
				value: String((ftbEntry.upVotes / ftbEntry.memesPosted).toFixed(2)),
				inline: true
			}
		]
	})
}