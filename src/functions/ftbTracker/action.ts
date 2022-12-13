import {
	CommandInteraction,
	Guild,
	GuildMember,
	InteractionReplyOptions,
	Message,
	MessageActionRow,
	MessageButton,
	MessageEmbed,
	TextChannel
} from 'discord.js';
import { SlashCommand } from '../types';
import { pool } from '../../db/index';
import { DbChannel, DbUser } from '../../db/types';
import { PoolClient } from 'pg';

export async function storeFtbTransaction(user: GuildMember, pointAmount: number): Promise<string> {
	const client = await pool.connect();
	await getUser(client, user);

	await client.query();

	client.release();
	return `${user.displayName} now has ${ftbDatabase[user.id].ftbPoints} FTB points (${pointAmount}).`;
}

export function resetFtbPoints(user: GuildMember, pointAmount: number): string {
	return 'This command is currently disabled.';
}

export async function storeMeme(user: GuildMember, msg: Message, pointAmount: number, yesCount: number, noCount: number) {
	const client = await pool.connect();

	const userId = await getUser(client, user);
	const channelId = await getChannel(client, msg.channel as TextChannel);

	await client.query('INSERT INTO memes (msg_id, author, channel, date_created, upvotes, downvotes) ' +
		`VALUES(${msg.id}, ${userId}, ${channelId}, ${msg.createdTimestamp}, ${yesCount - 1}, ${noCount})`);
	client.release();

	storeFtbTransaction(user, pointAmount);
}

export async function getUser(client: PoolClient, user: GuildMember) {
	await client.query<DbUser>(`IF NOT EXISTS (SELECT id FROM users WHERE user_id = ${user.id}) ` +
	'INSERT INTO users (user_id, recipient, date_created) ' +
	`VALUES(${user.id}) ` +
	`ELSE SELECT * FROM users WHERE user_id = ${user.id}`);
}

export async function getChannel(client: PoolClient, channel: TextChannel) {
	await client.query<DbChannel>(`IF NOT EXISTS (SELECT id FROM channels WHERE channel_id = ${channel.id}) ` +
	'INSERT INTO channels (channel_id, name, server) ' +
	`VALUES(${channel.id}, ${channel.name}, ${channel.guild.id}) ` +
	`ELSE SELECT * FROM channels WHERE channel_id = ${channel.id}`);
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
						}).map(ftbEntry => {
							const user = guild.members.cache.get(ftbEntry[0]);
							return `${user!.displayName}: ${ftbEntry[1].ftbPoints}`;
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

		collector.on('end', async (collected, reason) => {
			if (reason !== 'messageDelete') {
				const lastButtonPress = collected.last();
				if (lastButtonPress && !blocked.includes(lastButtonPress.user.id)) {
					const newEmbed = new MessageEmbed({
						title: await storeFtbTransaction(this.recipient!, this.pointAmt),
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
			}
		});
	}
}