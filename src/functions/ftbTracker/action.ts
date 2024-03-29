import {
	ChatInputCommandInteraction,
	Guild,
	GuildMember,
	InteractionReplyOptions,
	Message,
	ActionRowBuilder,
	ButtonBuilder,
	EmbedBuilder,
	ButtonStyle,
	MessageActionRowComponentBuilder,
	ComponentType,
} from 'discord.js';
import { getFtbSums, storeFtbTransaction } from '../../db/queries';
import { SlashCommand } from '../types';

export class FtbShowAndEditCommand implements SlashCommand {
	static commandName = 'ftb';
	pointAmt = 0;
	author?: GuildMember;
	recipient?: GuildMember;
	reason?: string;
	subCommand?: string;
	async respond(payload: ChatInputCommandInteraction, guild: Guild): Promise<InteractionReplyOptions> {
		this.subCommand = payload.options.getSubcommand();
		if (this.subCommand === 'list') {
			const userSums = await getFtbSums();

			return {
				embeds: [
					{
						title: 'FTB Standings',
						description: userSums.filter(dbRow => {
							return guild.members.cache.has(dbRow.user_id);
						}).map(dbRow => {
							const user = guild.members.cache.get(dbRow.user_id);
							if (user)
								return `${user.displayName}: ${dbRow.total}`;
						}).join('\n')
					}
				]
			};
		}
		const authTemp = guild.members.cache.get(payload.user.id);
		if (authTemp === undefined) {
			throw 'Somehow the the FTB gifter is not defined';
		}
		const recTemp = guild.members.cache.get(payload.options.getUser('user', true).id);
		if (recTemp === undefined) {
			throw 'Somehow the the FTB receiver is not defined';
		}
		this.author = authTemp;
		this.recipient = recTemp;
		this.pointAmt = payload.options.getInteger('points', true);
		this.reason = payload.options.getString('reason') ?? undefined;

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

		const row = new ActionRowBuilder<MessageActionRowComponentBuilder>().addComponents(
			new ButtonBuilder({
				customId: `${FtbShowAndEditCommand.commandName}-approve`,
				label: 'Approve',
				style: ButtonStyle.Success
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
		const blocked = [this.recipient?.id, this.author?.id];
		const collector = responseMsg.createMessageComponentCollector({ componentType: ComponentType.Button, time: 60 * 60 * 1000 });

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
				if (this.recipient && lastButtonPress && !blocked.includes(lastButtonPress.user.id)) {
					await storeFtbTransaction(this.recipient.user.id, this.pointAmt, undefined, this.author?.user.id, this.reason);
					const newEmbed = new EmbedBuilder({
						title: `${this.recipient?.displayName} has received ${this.pointAmt} FTB points.`,
						description: `${this.author?.displayName}'s reason: ${this.reason ? this.reason : 'Not specified'}`,
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
						title: `${this.author?.displayName}'s transaction of ${this.pointAmt} to ${this.recipient?.displayName} was not approved and will not go through`,
						description: `Original Reason: ${this.reason ? this.reason : 'Not specified'}`
					}],
					components: [],
				});
			}
		});
	}
}