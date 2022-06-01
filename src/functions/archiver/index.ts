import { recordMemeStats } from '../ftbTracker/action';
import { wait } from '../../helpers/constants';
import { ArchiveContent } from './types';
import { Guild, Message, MessageEmbed, MessageReaction, TextChannel, User, Collection } from 'discord.js';
import fs from 'fs';
import path from 'path';
import moment from 'moment';
import { postMemeToTwitter } from './twitter';

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

const postSuccessfulArchive = async (msg: Message, archiveContent: ArchiveContent, archiveChannel: TextChannel, yesCount: number, memberCount: number, endedEarly: boolean) => {
	const pollEmbed = new MessageEmbed();
	let description, addedPoints;
	if (yesCount === memberCount) {
		description = 'Everybody liked that. 10 ftb points have been awarded for this amazing contribution to the archives.';
		addedPoints = 10;
	}
	else {
		description = 'A majority of the server has decided this was archive worthy, and thus it will be added to the archives.' +
			'The archiver has also been awarded 5 ftb points for his contribution.';
		addedPoints = 5;
	}
	pollEmbed.setTitle('Meme Approved')
		.setDescription(description);
	await archiveChannel.send({ content: archiveContent.joinStrings() });
	await msg.reply({ embeds: [pollEmbed], allowedMentions: { repliedUser: false } });
	await postMemeToTwitter(archiveContent);

	if (endedEarly) {
		lastMessageIds[msg.guildId!][msg.channelId].ignore.push(msg.id);
		fs.writeFileSync(filename, JSON.stringify(lastMessageIds));
	}
	else {
		lastMessageIds[msg.guildId!][msg.channelId].lastMessage = msg.id;
		lastMessageIds[msg.guildId!][msg.channelId].ignore = [];
		fs.writeFileSync(filename, JSON.stringify(lastMessageIds));
	}
	return addedPoints;
};

const postRejectedArchive = async (msg: Message, endedEarly: boolean) => {
	const pollEmbed = new MessageEmbed();
	pollEmbed.setTitle('Meme Shot Down')
		.setDescription('A majority of the server has decided this meme is terrible, and thus the author must pay the price.' +
			' The author has been deducted 5 ftb points for wasting the server\'s time.');
	await msg.reply({ embeds: [pollEmbed], allowedMentions: { repliedUser: false } });

	if (endedEarly) {
		lastMessageIds[msg.guildId!][msg.channelId].ignore.push(msg.id);
		fs.writeFileSync(filename, JSON.stringify(lastMessageIds));
	}
	else {
		lastMessageIds[msg.guildId!][msg.channelId].lastMessage = msg.id;
		lastMessageIds[msg.guildId!][msg.channelId].ignore = [];
		fs.writeFileSync(filename, JSON.stringify(lastMessageIds));
	}

	return -5;
};

const createArchiveVote = async (msg: Message, memberCount: number, yesCount = 1, noCount = 0, votedUsers = [msg.member?.user.id], time = dayInMs) => {
	let archiveContent = new ArchiveContent(msg);
	const archiveChannel = msg.guild!.channels.cache.find(channel => {
		return channel.name == 'the-archives';
	});

	if (!archiveChannel) {
		return;
	}

	const collector = msg.createReactionCollector({
		filter: (reaction: MessageReaction, user: User) => {
			return (reaction.emoji.name == thumbsUpEmoji.emoji ||
				reaction.emoji.name == thumbsDownEmoji.emoji) &&
				!user.bot && !votedUsers.includes(user.id);
		}, maxUsers: memberCount - votedUsers.length, time
	});

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
		let endedEarly = yesCount + noCount == memberCount;
		let points = 0;
		if (yesCount >= memberCount / 2) {
			points = await postSuccessfulArchive(msg, archiveContent!, archiveChannel as TextChannel, yesCount, memberCount, endedEarly);
		}
		else if (noCount > memberCount / 2) {
			points = await postRejectedArchive(msg, endedEarly);
		}
		recordMemeStats(msg.member!, points, yesCount, noCount)
	});
};

export class Archiver {
	static async archive(msg: Message, memberCount: number): Promise<void> {
		const channel = msg.channel as TextChannel;
		if (channel.topic?.includes('#archivable')) {
			await wait(5000);

			if (msg.embeds[0] || msg.attachments.first()) {
				await msg.react(thumbsUpEmoji.emoji);
				await createArchiveVote(msg, memberCount);
			}
		}
	}

	static async reloadArchiveVotes(guild: Guild, memberCount: number): Promise<void> {
		const memeChannels = guild.channels.cache.filter(channel => {
			return !!(channel as TextChannel).topic?.includes('#archivable');
		}) as Collection<string, TextChannel>;
		const archiveChannel = guild!.channels.cache.find(channel => {
			return channel.name === 'the-archives';
		});

		if (archiveChannel) {
			lastMessageIds[guild.id] = lastMessageIds[guild.id] || {}
			await Promise.all(memeChannels.map(async channel => {
				lastMessageIds[guild.id][channel.id] = lastMessageIds[guild.id][channel.id] || {name: channel.name}
				let newMemes = new Collection<string, Message>();
				let lastId = lastMessageIds[guild.id][channel.id].lastMessage;
				
				while (newMemes.size < 5000) {
					let msgBatch = await channel.messages.fetch({
						limit: 100,
						after: lastId,
					});
					msgBatch = msgBatch.sort((a, b) => a.createdTimestamp - b.createdTimestamp)
					newMemes = newMemes.concat(msgBatch);
					
					if (msgBatch.size !== 100) {
						break;
					}
					lastId = msgBatch.last()!.id;
				}
				newMemes = newMemes.filter(msg => {
					return (msg.embeds[0] || msg.attachments.first()) && !msg.member?.user.bot && !lastMessageIds[guild.id][channel.id].ignore?.includes(msg.id);
				});

				await Promise.all(newMemes.map(async msg => {
					let yesCount = 0, noCount = 0;
					let votedUsers: string[] = [msg.author.id];

					const upVoteReaction = msg.reactions.cache.find(reaction => reaction.emoji.name === thumbsUpEmoji.emoji);
					const downVoteReaction = msg.reactions.cache.find(reaction => reaction.emoji.name === thumbsDownEmoji.emoji);

					if (upVoteReaction) {
						const yesUsers = await upVoteReaction.users.fetch();
						const selfUpvote = yesUsers.find(user => user.id === msg.author.id);
						const botUpvote = yesUsers.find(user => user.bot);
						votedUsers = votedUsers.concat(yesUsers.filter(user => !user.bot).map(user => user.id));
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
						if (yesCount >= memberCount / 2) {
							const archiveContent = new ArchiveContent(msg);
							await postSuccessfulArchive(msg, archiveContent, archiveChannel as TextChannel, yesCount, memberCount, false);
						}
						else if (noCount > memberCount / 2) {
							await postRejectedArchive(msg, false);
						}
					}
					else {
						await createArchiveVote(msg, memberCount, yesCount, noCount, votedUsers, dayInMs - moment().diff(msgMoment));
					}
				}));
			}))
		}
	}
}
