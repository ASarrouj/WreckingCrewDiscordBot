import {
	CommandInteraction,
	Guild,
	InteractionReplyOptions,
	Message, MessageActionRow,
	MessageButton,
	MessageEmbed,
	MessageEmbedOptions
} from 'discord.js';
import lodash from 'lodash';
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
	private choices: string[] = [];
	async respond(payload: CommandInteraction, guild: Guild): Promise<InteractionReplyOptions> {
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

		const rows: MessageActionRow[] = [];
		let curRow;
		for (let i = 0; i < this.choices.length; i++) {
			if (i % 5 == 0) {
				curRow = new MessageActionRow();
				rows.push(curRow);
			}
			curRow?.addComponents(new MessageButton({
				customId: `poll-button-${i}`,
				style: 'PRIMARY',
				emoji: numberEmojis[i].emoji,
			}));
		}

		if (this.choices.length % 5 === 0) {
			curRow = new MessageActionRow();
			rows.push(curRow);
		}
		curRow?.addComponents(new MessageButton({
			customId: `${PollCommand.commandName}-button`,
			style: 'DANGER',
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

		const collector = responseMsg.createMessageComponentCollector({ componentType: 'BUTTON', time: pollDuration });

		collector.on('collect', async interaction => {
			if ((interaction.component as MessageButton).emoji!.name != XEmoji.emoji) {
				for (const key in this.pollVotes) {
					const optionVoters = this.pollVotes[key];
					if (optionVoters.includes(interaction.user.id)) {
						const index = optionVoters.indexOf(interaction.user.id);
						optionVoters.splice(index, 1);
					}
				}

				this.pollVotes[(interaction.component as MessageButton).emoji!.name!].push(interaction.user.id);

				const clonedEmbeds = this.updateResponseEmbed(lodash.cloneDeep(interaction.message.embeds[0]) as MessageEmbed, interaction.guild!);

				await interaction.update({
					embeds: [clonedEmbeds],
					components: interaction.message.components as MessageActionRow[]
				});
				return;
			}
			if (interaction.user.id == responseMsg.interaction!.user.id) {
				await interaction.deferUpdate();
				collector.stop();
			}
		});

		collector.on('end', async collected => {
			const embedClone = lodash.cloneDeep(responseMsg.embeds) as MessageEmbed[];
			const lastButtonPress = collected.last();

			if (lastButtonPress && (lastButtonPress.component as MessageButton).emoji!.name == XEmoji.emoji && lastButtonPress.user.id === responseMsg.interaction!.user.id) {
				embedClone[0].description = 'The poll was ended early by the author. These are the final results.';
			}
			else {
				embedClone[0].description = 'The poll time has expired. Here are the results of the poll.';
			}

			await responseMsg.edit({
				embeds: embedClone,
				components: [],
			});

			await responseMsg.reply('This poll has concluded');
		});
	}

	private updateResponseEmbed(embed: MessageEmbedOptions | MessageEmbed, guild: Guild): MessageEmbedOptions | MessageEmbed {
		embed.fields = (() => {
			const fields = [];
			for (let i = 0; i < this.choices.length; i++) {
				const numVotes = this.pollVotes[numberEmojis[i].emoji].length;
				if (i % 3 == 2) {
					fields.push({
						name: '\u200b',
						value: '\u200b',
					});
				}
				fields.push({
					name: `${numberEmojis[i].text}  ${numVotes} ${numVotes === 1 ? 'vote' : 'votes'}` +
						`${numVotes === 0 ? '' : ` (${this.pollVotes[numberEmojis[i].emoji].map(id => {
							return guild.members.cache.get(id)!.displayName;
						}).join(',')})`}`,
					value: this.choices[i],
					inline: true
				});
			}
			return fields;
		})();
		return embed;
	}
}