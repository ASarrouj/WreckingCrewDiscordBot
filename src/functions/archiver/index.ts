import { applyFtbPoints } from '../ftbTracker/action';
import { wait } from '../../helpers/constants';
import { Guild, Message, MessageEmbed, MessageReaction, TextChannel, User, Collection } from 'discord.js';
import fs from 'fs';
import path from 'path';
import moment from 'moment';

const dayInMs = 86400000;

const thumbsUpEmoji = {
	emoji: '👍',
	text: ':thumbsup:',
};

const thumbsDownEmoji = {
	emoji: '👎',
	text: ':thumbsdown:',
};

const XEmoji = {
	emoji: '❌',
	text: ':x:'
};

const filename = path.join(__dirname, '..', '..', '..', 'data', 'lastMemeIds.ign.json');
const lastMessageIds = JSON.parse(fs.readFileSync(filename, 'utf-8'));

const postSuccessfulArchive = async (msg: Message, archiveContent: string, archiveChannel: TextChannel, yesCount: number, memberCount: number) => {
	const pollEmbed = new MessageEmbed();
	const description = yesCount === memberCount ? 'Everybody liked that. 10 ftb points have been awarded for this amazing contribution to the archives.'
		: 'A majority of the server has decided this was archive worthy, and thus it will be added to the archives.' +
		'The archiver has also been awarded 5 ftb points for his contribution.';
	pollEmbed.setTitle('Meme Approved')
		.setDescription(description);
	await applyFtbPoints(msg.member!,  yesCount === memberCount ? 10 : 5);
	await archiveChannel.send({ content: archiveContent });
	await msg.reply({ embeds: [pollEmbed], allowedMentions: { repliedUser: false } });
	lastMessageIds[msg.guildId!] = msg.id;
	fs.writeFileSync(filename, JSON.stringify(lastMessageIds));
};

const postRejectedArchive = async (msg: Message) => {
	const pollEmbed = new MessageEmbed();
	pollEmbed.setTitle('Meme Shot Down')
		.setDescription('A majority of the server has decided this meme is terrible, and thus the author must pay the price.' +
					' The author has been deducted 5 ftb points for wasting the server\'s time.');
	await applyFtbPoints(msg.member!, -5);
	await msg.reply({ embeds: [pollEmbed], allowedMentions: { repliedUser: false } });
};

const createArchiveVote = async (msg: Message, memberCount: number, yesCount = 1, noCount = 0, votedUsers = [msg.member?.user.id], time = dayInMs) => {
	const archiveContent = msg.attachments.first()?.url || msg.embeds[0]?.url;
	const archiveChannel = msg.guild!.channels.cache.find(channel => {
		return channel.name == 'the-archives';
	});

	if (!archiveChannel) {
		return;
	}

	const collector = msg.createReactionCollector({ filter: (reaction: MessageReaction, user: User) => {
		return (reaction.emoji.name == thumbsUpEmoji.emoji ||
			reaction.emoji.name == thumbsDownEmoji.emoji ||
			reaction.emoji.name == XEmoji.emoji) &&
			!user.bot && !votedUsers.includes(user.id);
	}, maxUsers: memberCount - votedUsers.length, time });

	collector.on('collect', (reaction, user) => {
		if (votedUsers.includes(user.id)) {
			user.send('Sorry, you cannot vote twice and your original vote cannot be changed.');
			return;
		}

		if (reaction.emoji.name == thumbsUpEmoji.emoji) {
			yesCount++;
		}
		else {
			noCount++;
		}
		votedUsers.push(user.id);
	});

	collector.on('end', async () => {
		if (yesCount > memberCount / 2) {
			postSuccessfulArchive(msg, archiveContent!, archiveChannel as TextChannel, yesCount, memberCount);
		}
		else if (noCount > memberCount / 2) {
			postRejectedArchive(msg);
		}
	});
};

export class Archiver {
	static async archive(msg: Message, memberCount: number): Promise<void> {
		const channel = msg.channel as TextChannel;
		if (channel.topic?.includes('#archivable')) {
			if (!msg.embeds[0])
				await wait(2000);

			if (msg.embeds[0] || msg.attachments.first()) {
				await msg.react(thumbsUpEmoji.emoji);
				await createArchiveVote(msg, memberCount);
			}
		}
	}

	static async reloadArchiveVotes(guild: Guild, memberCount: number): Promise<void> {
		const memesChannel = guild.channels.cache.find(channel => {
			return channel.name === 'memes' && !!(channel as TextChannel).topic?.includes('#archivable');
		}) as TextChannel;
		const archiveChannel = guild!.channels.cache.find(channel => {
			return channel.name === 'the-archives';
		});

		if (memesChannel && archiveChannel && lastMessageIds[guild.id]) {
			let yesCount = 0, noCount = 0;
			let newMemes = new Collection<string, Message>();
			let lastId = lastMessageIds[guild.id];
			while (newMemes.size < 5000) {
				const msgBatch = await memesChannel.messages.fetch({
					limit: 100,
					after: lastId,
				});
				newMemes = newMemes.concat(msgBatch);
				lastId = msgBatch.last();
				if (msgBatch.size !== 100) {
					break;
				}
			}
			newMemes = newMemes.filter(msg => {
				return (msg.embeds[0] || msg.attachments.first()) && !msg.member?.user.bot;
			});

			await Promise.all(newMemes.map(async msg => {
				let votedUsers: string[] = [msg.author.id];

				const upVoteReaction = msg.reactions.cache.find(reaction => reaction.emoji.name === thumbsUpEmoji.emoji);
				const downVoteReaction = msg.reactions.cache.find(reaction => reaction.emoji.name === thumbsDownEmoji.emoji);

				if (upVoteReaction) {
					const yesUsers = await upVoteReaction.users.fetch();
					const selfUpvote = yesUsers.find(user => user.id === msg.author.id);
					const botUpvote = yesUsers.find(user => user.bot);
					votedUsers = votedUsers.concat(yesUsers.map(user => user.id));
					yesCount = yesUsers.size;
					if (botUpvote && selfUpvote) {
						yesCount--;
					}
					else if (!botUpvote && !selfUpvote) {
						await msg.react(thumbsUpEmoji.emoji);
						yesCount++;
					}
				}
				else {
					await msg.react(thumbsUpEmoji.emoji);
					yesCount++;
				}

				if (downVoteReaction) {
					const noUsers = (await downVoteReaction.users.fetch()).map(user => {
						return user.id;
					});
					votedUsers = votedUsers.concat(noUsers);
					noCount = noUsers.length;
				}

				const msgMoment = moment(msg.createdTimestamp, 'x');
				if (msgMoment.isSameOrBefore(moment().subtract(1, 'days'))) {
					if (yesCount > memberCount / 2) {
						await postSuccessfulArchive(msg, (msg.attachments.first()?.url || msg.embeds[0]?.url)!, archiveChannel as TextChannel, yesCount, memberCount);
					}
					else if (noCount > memberCount / 2) {
						await postRejectedArchive(msg);
					}
				}
				else {
					await createArchiveVote(msg, memberCount, yesCount, noCount, votedUsers, dayInMs - moment().diff(msgMoment));
				}
			}));
		}
	}
}