import {
	CommandInteraction,
	Guild,
	GuildMember,
	InteractionReplyOptions,
	MessageActionRow,
	MessageButton
} from 'discord.js';
import { SlashCommand } from '../types';
import fs from 'fs';
import path from 'path';

const filename = path.join(__dirname, 'ftbDatabase.ign.json');
const ftbDatabase = JSON.parse(fs.readFileSync(filename, 'utf-8'));

export function applyFtbPoints(user: GuildMember, pointAmount: number): string {
	let logMsg;

	if (Object.keys(ftbDatabase).includes(user.id)) {
		ftbDatabase[user.id] += pointAmount;
		logMsg = `${user.displayName} now has ${ftbDatabase[user.id]} FTB points (${pointAmount}).`;
	}
	else {
		ftbDatabase[user.id] = pointAmount;
		logMsg = `User ${user.displayName} has now been created, starting with ${ftbDatabase[user.id]} FTB points.`;
	}
	fs.writeFileSync(filename, JSON.stringify(ftbDatabase));
	return logMsg;
}

export function resetFtbPoints(user: GuildMember, pointAmount: number): string {
	let logMsg;

	if (Object.keys(ftbDatabase).includes(user.id)) {
		ftbDatabase[user.id] = pointAmount;
		logMsg = `${user.displayName}'s FTB points have now been reset to ${ftbDatabase[user.id]}.`;
	}
	else {
		ftbDatabase[user.id] = pointAmount;
		logMsg = `User ${user.displayName} has now been created, starting with ${ftbDatabase[user.id]} FTB points.`;
	}
	fs.writeFileSync(filename, JSON.stringify(ftbDatabase));
	return logMsg;
}

export class FtbShowAndEditCommand implements SlashCommand {
	static commandName = 'ftb';
	async respond(payload: CommandInteraction, guild: Guild): Promise<InteractionReplyOptions> {
		if (payload.options.getSubcommand() === 'list') {
			return {
				embeds: [
					{
						title: 'FTB Standings',
						description: Object.entries(ftbDatabase).filter(ftbEntry => {
							return guild.members.cache.has(ftbEntry[0]);
						}).map((ftbEntry) => {
							const user = guild.members.cache.get(ftbEntry[0]);
							return `${user!.displayName}: ${ftbEntry[1]}`;
						}).join('\n')
					}
				]
			};
		}
		const author = guild.members.cache.get(payload.member!.user.id)!;
		const recipient = guild.members.cache.get(payload.options.getUser('user', true).id)!;
		const pointAmt = payload.options.getInteger('points', true);
		const reason = payload.options.getString('reason');

		if (recipient.id === author.id) {
			return {
				content: 'You cannot change your own FTB score.',
				ephemeral: true
			};
		}

		if (pointAmt < -20 || pointAmt > 20) {
			return {
				content: 'Point values must be between -20 and +20.',
				ephemeral: true
			};
		}
		if (pointAmt === 0) {
			return {
				content: 'Point value cannot be 0.',
				ephemeral: true
			};
		}

		const row = new MessageActionRow().addComponents(
			new MessageButton({
				customId: `${FtbShowAndEditCommand.commandName}-approve`,
				label: 'Approve',
				style: 'SUCCESS'
			})
		);

		return {
			embeds: [
				{
					title: `${author.displayName} would like to give ${recipient.displayName} ${pointAmt} FTB points`,
					description: `${reason ? `Reason: ${reason}\n` : ''}If you believe this is warranted, please approve the transaction below`
				}
			],
			components: [row]
		};

		const feedbackMessage = await applyFtbPoints(recipient, pointAmt);

		return {
			embeds: [
				{
					title: feedbackMessage,
				}
			]
		};
	}
}