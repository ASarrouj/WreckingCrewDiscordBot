import {
	CommandInteraction,
	Guild,
	GuildMember,
	InteractionReplyOptions,
	Message,
	MessageActionRow,
	MessageButton,
	MessageEmbed
} from 'discord.js';
import { SlashCommand } from '../types';
import fs from 'fs';
import path from 'path';

const filename = path.join(__dirname, '..', '..', '..', 'data', 'ftbDatabase.ign.json');
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
	pointAmt = 0;
	author?: GuildMember;
	recipient?: GuildMember;
	reason?: string | null;
	subCommand?: string;
	async respond(payload: CommandInteraction, guild: Guild): Promise<InteractionReplyOptions> {
		this.subCommand = payload.options.getSubcommand();
		if (this.subCommand === 'list') {
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
		this.author = guild.members.cache.get(payload.member!.user.id)!;
		this.recipient = guild.members.cache.get(payload.options.getUser('user', true).id)!;
		this.pointAmt = payload.options.getInteger('points', true);
		this.reason = payload.options.getString('reason');

		if (this.recipient.id === this.author.id) {
			return {
				content: 'You cannot change your own FTB score.',
				ephemeral: true
			};
		}

		if (this.pointAmt < -20 || this.pointAmt > 20) {
			return {
				content: 'Point values must be between -20 and +20.',
				ephemeral: true
			};
		}
		if (this.pointAmt === 0) {
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
					title: `${this.author.displayName} would like to give ${this.recipient.displayName} ${this.pointAmt} FTB points`,
					description: `${this.reason ? `Reason: ${this.reason}\n` : ''}If you believe this is warranted, please approve the transaction below`,
					footer: { text: 'Time: 1 hour' }
				}
			],
			components: [row]
		};
	}
	async followup(responseMsg: Message): Promise<void> {
		if (this.subCommand === 'list') {
			return;
		}
		const blocked = [this.recipient!.id, this.author!.id];
		const collector = responseMsg.createMessageComponentCollector({ componentType: 'BUTTON', time: 60 * 60 * 1000 });

		collector.on('collect', async interaction => {
			if (blocked.includes(interaction.user.id)) {
				await interaction.reply({
					content: 'A third party must approve this transaction',
					ephemeral: true,
				});
				return;
			}
			await interaction.deferUpdate();
			collector.stop();
		});

		collector.on('end', async collected => {
			const lastButtonPress = collected.last();
			if (lastButtonPress && !blocked.includes(lastButtonPress.user.id)) {
				const newEmbed = new MessageEmbed({
					title: applyFtbPoints(this.recipient!, this.pointAmt),
					description: `${this.author!.displayName}'s reason: ${this.reason ? this.reason : 'Not specified'}`,
					footer: { text: `Approved by ${(lastButtonPress.member as GuildMember).displayName}` }
				});
				await responseMsg.edit({
					embeds: [newEmbed],
					components: [],
				});
				return;
			}

			await responseMsg.edit({
				embeds: [{
					title: `${this.author!.displayName}'s transaction of ${this.pointAmt} to ${this.recipient!.displayName} was not approved and will not go through`,
					description: `Original Reason: ${this.reason ? this.reason : 'Not specified'}`
				}],
				components: [],
			});
		});
	}
}