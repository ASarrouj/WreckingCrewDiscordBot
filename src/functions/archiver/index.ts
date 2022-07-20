import { recordMemeStats } from '../ftbTracker/action';
import { adminId, wait } from '../../helpers/constants';
import { ArchiveContent, MemeReactionInfo } from './types';
import { Guild, Message, MessageEmbed, MessageReaction, TextChannel, User, Collection, MessageActionRow, MessageButton } from 'discord.js';
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

async function postSuccessfulArchive(msg: Message, archiveContent: ArchiveContent, archiveChannel: TextChannel, yesCount: number, memberCount: number, endedEarly: boolean, cancelTwitPost: boolean) {
	const pollEmbed = new MessageEmbed();
	let description, addedPoints;
	if (yesCount === memberCount) {
		description = 'Everybody liked that. 10 ftb points have been awarded for this amazing contribution to the archives.';
		addedPoints = 10;
	}
	else {
		description = 'A majority of the server has decided this was archive worthy, and thus it will be added to the archives.' +
			' The archiver has also been awarded 5 ftb points for his contribution.';
		addedPoints = 5;
	}
	pollEmbed.setTitle('Meme Approved')
		.setDescription(description);
	await archiveChannel.send({ content: archiveContent.joinStrings() });
	await msg.reply({ embeds: [pollEmbed], allowedMentions: { repliedUser: false } });
	if (!cancelTwitPost)
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

async function postRejectedArchive(msg: Message, endedEarly: boolean) {
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

async function createArchiveVote(msg: Message, memberCount: number, memeInfo: MemeReactionInfo, archiveContent: ArchiveContent, time = dayInMs, poster = msg.member!) {
	let { yesCount, noCount, votedUsers, cancelTwitPost } = memeInfo
	const archiveChannel = msg.guild!.channels.cache.find(channel => {
		return channel.name == 'the-archives';
	});

	if (!archiveChannel) {
		return;
	}

	const collector = msg.createReactionCollector({
		filter: (reaction: MessageReaction, user: User) => {
			return (reaction.emoji.name == thumbsUpEmoji.emoji ||
				reaction.emoji.name == thumbsDownEmoji.emoji ||
				reaction.emoji.name == XEmoji.emoji && user.id == msg.author.id) &&
				!user.bot;
		}, maxUsers: memberCount - votedUsers.length, time
	});

	collector.on('collect', (reaction, user) => {
		if (reaction.emoji.name == XEmoji.emoji) {
			cancelTwitPost = true;
			return;
		}
		if (votedUsers.includes(user.id)) {
			user.send('Sorry, you cannot vote twice and your original vote cannot be changed.');
			return;
		}

		if (reaction.emoji.name == thumbsUpEmoji.emoji) {
			yesCount++;
		}
		else if (reaction.emoji.name == thumbsDownEmoji.emoji) {
			noCount++;
		}
		votedUsers.push(user.id);
	});

	collector.on('end', async () => {
		let endedEarly = yesCount + noCount == memberCount;
		let points = 0;
		if (yesCount >= memberCount / 2) {
			points = await postSuccessfulArchive(msg, archiveContent!, archiveChannel as TextChannel, yesCount, memberCount, endedEarly, cancelTwitPost);
		}
		else if (noCount > memberCount / 2) {
			points = await postRejectedArchive(msg, endedEarly);
		}
		recordMemeStats(poster, points, yesCount, noCount)
	});
};

async function getMemeInfo(msg: Message) {
	let yesCount = 0, noCount = 0;
	let votedUsers: string[] = [msg.author.id];
	let cancelTwitPost = false;

	const upVoteReaction = msg.reactions.cache.find(reaction => reaction.emoji.name === thumbsUpEmoji.emoji);
	const downVoteReaction = msg.reactions.cache.find(reaction => reaction.emoji.name === thumbsDownEmoji.emoji);
	const authorXEmoji = msg.reactions.cache.find(reaction => reaction.emoji.name === XEmoji.emoji);

	if (upVoteReaction) {
		let yesUsers;
		try {
			yesUsers = await upVoteReaction.users.fetch();
		}
		catch {
			yesUsers = upVoteReaction.users.cache
		}
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
		let noUsers;
		try {
			noUsers = await downVoteReaction.users.fetch();
		}
		catch {
			noUsers = downVoteReaction.users.cache;
		}
		const noUsersString = noUsers.map(user => {
			return user.id;
		});
		votedUsers = votedUsers.concat(noUsersString);
		noCount = noUsersString.length;
	}

	let xEmojiUsers;
	try {
		xEmojiUsers = await authorXEmoji?.users.fetch()
	}
	catch {
		xEmojiUsers = authorXEmoji?.users.cache
	}
	cancelTwitPost = !!authorXEmoji && !!xEmojiUsers?.has(msg.author.id)

	return {
		yesCount,
		noCount,
		votedUsers,
		cancelTwitPost
	}
}

export class Archiver {
	static async archive(msg: Message, memberCount: number): Promise<void> {
		const channel = msg.channel as TextChannel;
		if (channel.topic?.includes('#archivable') && !(msg.content.includes(XEmoji.emoji) || msg.content.includes(XEmoji.text))) {
			const archiveContent = new ArchiveContent(msg)

			if (archiveContent.isMeme()) {
				await msg.react(thumbsUpEmoji.emoji);
				await createArchiveVote(msg, memberCount, {
					yesCount: 1,
					noCount: 0,
					votedUsers: [msg.author.id],
					cancelTwitPost: false
				}, archiveContent);
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
				lastMessageIds[guild.id][channel.id] = lastMessageIds[guild.id][channel.id] || { name: channel.name }
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

				await Promise.all(newMemes.map(async msg => {
					const archiveContent = new ArchiveContent(msg)
					if (!archiveContent.isMeme() || msg.member?.user.bot || lastMessageIds[guild.id][channel.id].ignore?.includes(msg.id))
						return;

					const { yesCount, noCount, votedUsers, cancelTwitPost } = await getMemeInfo(msg)

					const msgMoment = moment(msg.createdTimestamp, 'x');
					if (msgMoment.isSameOrBefore(moment().subtract(1, 'days'))) {
						let points = 0
						if (yesCount >= memberCount / 2) {
							const archiveContent = new ArchiveContent(msg);
							points = await postSuccessfulArchive(msg, archiveContent, archiveChannel as TextChannel, yesCount, memberCount, false, cancelTwitPost);
						}
						else if (noCount > memberCount / 2) {
							points = await postRejectedArchive(msg, false);
						}
						await recordMemeStats(msg.member!, points, yesCount, noCount)
					}
					else {
						await createArchiveVote(msg, memberCount, { yesCount, noCount, votedUsers, cancelTwitPost }, archiveContent, dayInMs - moment().diff(msgMoment));
					}
				}));
			}))
		}
	}

	static async repostDeletedMeme(msg: Message, memberCount: number): Promise<void> {
		const archiveContent = new ArchiveContent(msg)
		if ((msg.channel as TextChannel).topic?.includes('#archivable') &&
			archiveContent.isMeme() && !msg.member?.user.bot &&
			!(msg.content.includes(XEmoji.emoji) || msg.content.includes(XEmoji.text)) &&
			moment(msg.createdTimestamp, 'x').isSameOrAfter(moment().subtract(1, 'days'))) {

			const { yesCount, noCount, votedUsers, cancelTwitPost } = await getMemeInfo(msg)

			const admin = await msg.guild?.members.fetch(adminId)!
			const adminMsg = await admin.send({
				content: `${msg.member!.displayName} deleted a meme with ${yesCount} upvotes and ${noCount} downvotes. Repost? ${archiveContent.url}`,
				components: [new MessageActionRow().addComponents(
					new MessageButton({
						customId: `MemeRepost-Yes`,
						label: 'Yes',
						style: 'SUCCESS'
					}),
					new MessageButton({
						customId: `MemeRepost-No`,
						label: 'No',
						style: 'DANGER'
					})
				)]
			})

			const collector = adminMsg.createMessageComponentCollector({ componentType: 'BUTTON', time: 60 * 60 * 1000, max: 1 });

			collector.on('collect', async interaction => {
				await interaction.deferUpdate();

				if (interaction.customId == 'MemeRepost-Yes') {
					const repostedMsg = await msg.channel.send({
						content: `${msg.member!.displayName} tried deleting this meme, but luckily I saved it! ` +
							`Previous upvotes and downvotes were recorded and the meme can still be voted on ${archiveContent.url}`
					})

					await createArchiveVote(repostedMsg, memberCount, { yesCount, noCount, votedUsers, cancelTwitPost }, archiveContent, 60 * 60 * 100, msg.member!)
				}
			})

			collector.on('end', async collected => {
				await adminMsg.delete()
			})
		}
	}
}
