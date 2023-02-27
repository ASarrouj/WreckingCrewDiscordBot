import {
	EmbedField,
	Guild,
	InteractionReplyOptions,
	Message, ActionRowBuilder,
	ButtonBuilder,
	EmbedBuilder,
	ButtonStyle,
	MessageActionRowComponentBuilder,
	ChatInputCommandInteraction,
	ComponentType,
	ActionRow,
	MessageActionRowComponent,
	ButtonComponent,
	APIEmbed
} from 'discord.js';
import { SlashCommand } from '../types';

const numberEmojis = [
	{
		emoji: '1️⃣',
		text: ':one:',
	},
	{
		emoji: '2️⃣',
		text: ':two:',
	},
	{
		emoji: '3️⃣',
		text: ':three:',
	},
	{
		emoji: '4️⃣',
		text: ':four:',
	},
	{
		emoji: '5️⃣',
		text: ':five:',
	},
	{
		emoji: '6️⃣',
		text: ':six:',
	},
	{
		emoji: '7️⃣',
		text: ':seven:',
	},
	{
		emoji: '8️⃣',
		text: ':eight:',
	},
];

const XEmoji = {
	emoji: '✖️',
	text: ':heavy_multiplication_x:'
};

export class PollCommand implements SlashCommand {
	static commandName = 'poll';
	private pollHours = 1;
	private pollVotes: { [key: string]: string[] } = {};
	private choices: string[] = ["Option1", "Option2"];
	async respond(payload: ChatInputCommandInteraction, guild: Guild): Promise<InteractionReplyOptions> {
		let question = payload.options.getString('question', true);
		this.choices = payload.options.data.filter(option => {
			return option.name.includes('choice');
		}).map(option => {
			return option.value;
		}) as string[];

		const timeOption = payload.options.getInteger('time');
		this.pollHours = timeOption ? timeOption : this.pollHours;

		const author = guild.members.cache.get(payload.member!.user.id)!;

		question = question.slice(0, 255);
		if (this.pollHours < 1) {
			this.pollHours = 1;
		}
		else if (this.pollHours > 48) {
			this.pollHours = 48;
		}

		this.pollVotes = this.choices.reduce((acc, cur, index) => {
			acc[numberEmojis[index].emoji] = [];
			return acc;
		}, {} as { [key: string]: string[] });

		const pollEmbed = {
			author: {
				name: author.displayName,
				iconURL: author.user.avatarURL()!,
			},
			title: question,
			description: 'Vote on this poll by clicking on the button of the option you want to vote for.',
			footer: {
				text: `Poll Duration: ${this.pollHours} ${this.pollHours == 1 ? 'hour' : 'hours'}`,
			}
		};

		const rows: ActionRowBuilder<MessageActionRowComponentBuilder>[] = [];
		let curRow;
		for (let i = 0; i < this.choices.length; i++) {
			if (i % 5 == 0) {
				curRow = new ActionRowBuilder<MessageActionRowComponentBuilder>();
				rows.push(curRow);
			}
			curRow?.addComponents(new ButtonBuilder({
				customId: `poll-button-${i}`,
				style: ButtonStyle.Primary,
				emoji: numberEmojis[i].emoji,
			}));
		}

		if (this.choices.length % 5 === 0) {
			curRow = new ActionRowBuilder<MessageActionRowComponentBuilder>();
			rows.push(curRow);
		}
		curRow?.addComponents(new ButtonBuilder({
			customId: `${PollCommand.commandName}-button`,
			style: ButtonStyle.Danger,
			emoji: XEmoji.emoji,
		}));

		return {
			embeds: [
				this.updateResponseEmbed(pollEmbed, guild),
			],
			components: rows,
		};
	}

	async followup(responseMsg: Message): Promise<void> {
		const pollDuration = this.pollHours * 60 * 60 * 1000;

		const collector = responseMsg.createMessageComponentCollector({ componentType: ComponentType.Button, time: pollDuration });

		collector.on('collect', async interaction => {
			if ((interaction.component as ButtonComponent).emoji!.name != XEmoji.emoji) {
				for (const key in this.pollVotes) {
					const optionVoters = this.pollVotes[key];
					if (optionVoters.includes(interaction.user.id)) {
						const index = optionVoters.indexOf(interaction.user.id);
						optionVoters.splice(index, 1);
					}
				}

				this.pollVotes[(interaction.component as ButtonComponent).emoji!.name!].push(interaction.user.id);

				const clonedEmbeds = this.updateResponseEmbed(new EmbedBuilder(interaction.message.embeds[0].toJSON()).data, interaction.guild!);

				await interaction.update({
					embeds: [clonedEmbeds],
					components: interaction.message.components as ActionRow<MessageActionRowComponent>[]
				});
				return;
			}
			if (interaction.user.id == responseMsg.interaction!.user.id) {
				await interaction.deferUpdate();
				collector.stop();
				return;
			}
			await interaction.reply({
				content: 'You must be the author of this poll to cancel it',
				ephemeral: true,
			});
		});

		collector.on('end', async (collected, reason) => {
			if (reason !== 'messageDelete') {
				const embedClone = new EmbedBuilder(responseMsg.embeds[0].data);
				const lastButtonPress = collected.last();

				if (lastButtonPress && (lastButtonPress.component as ButtonComponent).emoji!.name == XEmoji.emoji && lastButtonPress.user.id === responseMsg.interaction!.user.id) {
					embedClone.setDescription('The poll was ended early by the author. These are the final results.');
				}
				else {
					embedClone.setDescription('The poll time has expired. Here are the results of the poll.');
				}

				await responseMsg.edit({
					embeds: [embedClone.data],
					components: [],
				});

				await responseMsg.reply('This poll has concluded');
			}
		});
	}

	private updateResponseEmbed(embed: APIEmbed, guild: Guild): APIEmbed {
		embed.fields = this.choices.reduce((acc, cur, index) => {
			const numVotes = this.pollVotes[numberEmojis[index].emoji].length;
			if (index % 3 == 2) {
				acc.push({
					name: '\u200b',
					value: '\u200b',
					inline: false
				});
			}
			acc.push({
				name: `${numberEmojis[index].text}  ${numVotes} ${numVotes === 1 ? 'vote' : 'votes'}` +
					`${numVotes === 0 ? '' : ` (${this.pollVotes[numberEmojis[index].emoji].map(id => {
						return guild.members.cache.get(id)!.displayName;
					}).join(',')})`}`,
				value: cur,
				inline: true
			});
			return acc
		}, [] as EmbedField[])
		return embed;
	}
}