import { adminId } from '../../helpers/constants';
import { ArchiveContent, MemeReactionInfo } from './types';
import { Guild, Message, EmbedBuilder, MessageReaction, TextChannel, User, Collection, ActionRowBuilder, ButtonBuilder, GuildBasedChannel, ButtonStyle, ComponentType, MessageActionRowComponentBuilder, MessageFlags } from 'discord.js';
import moment from 'moment';
import { postMemeToTwitter } from './twitter';
import { getLastChannelMemeId, storeMeme } from '../../db/queries';

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

function calcFtbPoints(yesNum: number, noNum: number, memberCount: number) {
	if (yesNum === memberCount - 1) {
		return 10;
	}
	else if (yesNum + 1 >= memberCount / 2) {
		return 5;
	}
	else if (noNum > memberCount / 2) {
		return -5;
	}
	return 0;
}

async function postSuccessfulArchive(msg: Message, archiveContent: ArchiveContent, archiveChannel: TextChannel, yesNum: number, memberCount: number, cancelTwitPost: boolean) {
	const pollEmbed = new EmbedBuilder();
	let description;
	if (yesNum === memberCount - 1) {
		description = 'Everybody liked that. 10 ftb points have been awarded for this amazing contribution to the archives.';
	}
	else {
		description = 'A majority of the server has decided this was archive worthy, and thus it will be added to the archives.' +
			' The archiver has also been awarded 5 ftb points for his contribution.';
	}
	pollEmbed.setTitle('Meme Approved')
		.setDescription(description);
	const responseMsg = await archiveContent.createMsg()
	await archiveChannel.send(responseMsg);
	await msg.reply({ embeds: [pollEmbed], allowedMentions: { repliedUser: false }, flags: MessageFlags.SuppressNotifications });
	if (!cancelTwitPost && process.argv[2] === 'prod')
		await postMemeToTwitter(archiveContent);
}

async function postRejectedArchive(msg: Message) {
	const pollEmbed = new EmbedBuilder();
	pollEmbed.setTitle('Meme Shot Down')
		.setDescription('A majority of the server has decided this meme is terrible, and thus the author must pay the price.' +
			' The author has been deducted 5 ftb points for wasting the server\'s time.');
	await msg.reply({ embeds: [pollEmbed], allowedMentions: { repliedUser: false }, flags: MessageFlags.SuppressNotifications });
}

async function createArchiveVote(msg: Message, memberCount: number, memeInfo: MemeReactionInfo, archiveContent: ArchiveContent, time = dayInMs, poster = msg.member!) {
	const { yesVoters, noVoters } = memeInfo;
	let { cancelTwitPost } = memeInfo;
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
				reaction.emoji.name == XEmoji.emoji && (user.id == msg.author.id || user.id == adminId)) &&
				!user.bot;
		}, time, maxUsers: memberCount
	});

	collector.on('collect', (reaction, user) => {
		if (reaction.emoji.name == XEmoji.emoji) {
			cancelTwitPost = true;
			return;
		}

		if (user.id === msg.author.id) {
			return;
		}

		if (!(yesVoters.includes(user.id) || noVoters.includes(user.id))) {
			if (reaction.emoji.name == thumbsUpEmoji.emoji) {
				yesVoters.push(user.id);
			}
			else if (reaction.emoji.name == thumbsDownEmoji.emoji) {
				noVoters.push(user.id);
			}

			if (yesVoters.length + noVoters.length == memberCount - 1) {
				collector.stop('allVoted');
			}
		}
	});

	collector.on('end', async (collected, reason) => {
		if (reason !== 'messageDelete') {
			let points = calcFtbPoints(yesVoters.length, noVoters.length, memberCount)
			const success = await storeMeme(poster.user.id, msg, points, yesVoters, noVoters, memberCount);

			if (success) {
				if (points > 0) {
					await postSuccessfulArchive(msg, archiveContent!, archiveChannel as TextChannel, yesVoters.length, memberCount, cancelTwitPost);
				}
				else if (points < 0) {
					await postRejectedArchive(msg);
				}
			}
		}
	});
}

async function getMemeInfo(msg: Message) {
	let cancelTwitPost = false;

	const upVoteReaction = msg.reactions.cache.find(reaction => reaction.emoji.name === thumbsUpEmoji.emoji);
	const downVoteReaction = msg.reactions.cache.find(reaction => reaction.emoji.name === thumbsDownEmoji.emoji);
	const authorXEmoji = msg.reactions.cache.find(reaction => reaction.emoji.name === XEmoji.emoji);

	let yesUsers = new Collection<string, User>();
	try {
		yesUsers = await upVoteReaction?.users.fetch() ?? yesUsers;
	}
	catch {
		yesUsers = upVoteReaction?.users.cache ?? yesUsers;
	}

	const yesVoters = yesUsers?.filter(user => { return !user.bot && user.id !== msg.author.id; }).map(user => user.id) ?? [];

	if (yesUsers.size === yesVoters.length) {
		await msg.react(thumbsUpEmoji.emoji);
	}

	let noUsers;
	try {
		noUsers = await downVoteReaction?.users.fetch();
	}
	catch {
		noUsers = downVoteReaction?.users.cache;
	}
	const noVoters = noUsers?.map(user => {
		return user.id;
	}) ?? [];

	let xEmojiUsers;
	try {
		xEmojiUsers = await authorXEmoji?.users.fetch();
	}
	catch {
		xEmojiUsers = authorXEmoji?.users.cache;
	}
	cancelTwitPost = !!authorXEmoji && !!xEmojiUsers?.has(msg.author.id);

	return {
		yesVoters,
		noVoters,
		cancelTwitPost
	};
}

export class Archiver {
	static async archive(msg: Message, memberCount: number): Promise<void> {
		const channel = msg.channel as TextChannel;
		if (channel.topic?.includes('#archivable') && !(msg.content.includes(XEmoji.emoji) || msg.content.includes(XEmoji.text))) {
			const archiveContent = new ArchiveContent(msg);

			if (archiveContent.isMeme()) {
				await msg.react(thumbsUpEmoji.emoji);
				await createArchiveVote(msg, memberCount, {
					yesVoters: [],
					noVoters: [],
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
			await Promise.all(memeChannels.map(async channel => {
				let newMemes = new Collection<string, Message>();
				let lastId = await getLastChannelMemeId(channel.id);

				while (lastId && newMemes.size < 5000) {
					let msgBatch = await channel.messages.fetch({
						limit: 100,
						after: lastId,
					});
					msgBatch = msgBatch.sort((a, b) => a.createdTimestamp - b.createdTimestamp);
					newMemes = newMemes.concat(msgBatch);

					if (msgBatch.size !== 100) {
						break;
					}
					lastId = msgBatch.last()!.id;
				}

				await Promise.all(newMemes.map(async msg => {
					await Archiver.reloadMeme(msg, archiveChannel, memberCount);
				}));
			}));
		}
	}

	static async repostDeletedMeme(deletedMsg: Message, memberCount: number): Promise<void> {
		const archiveContent = new ArchiveContent(deletedMsg);
		if ((deletedMsg.channel as TextChannel).topic?.includes('#archivable') &&
			archiveContent.isMeme() && !deletedMsg.member?.user.bot &&
			!(deletedMsg.content.includes(XEmoji.emoji) || deletedMsg.content.includes(XEmoji.text)) &&
			moment(deletedMsg.createdTimestamp, 'x').isSameOrAfter(moment().subtract(1, 'days')) &&
			moment(deletedMsg.createdTimestamp, 'x').isSameOrBefore(moment().subtract(5, 'minutes'))) {
			const { yesVoters, noVoters, cancelTwitPost } = await getMemeInfo(deletedMsg);

			const admin = await deletedMsg.guild?.members.fetch(adminId);
			const adminMsg = await admin?.send({
				content: `${deletedMsg.member!.displayName} deleted a meme with ${yesVoters.length} upvotes and ${noVoters.length} downvotes. Repost? ${archiveContent.url}`,
				components: [new ActionRowBuilder<MessageActionRowComponentBuilder>().addComponents(
					new ButtonBuilder({
						customId: 'MemeRepost-Yes',
						label: 'Yes',
						style: ButtonStyle.Success
					}),
					new ButtonBuilder({
						customId: 'MemeRepost-No',
						label: 'No',
						style: ButtonStyle.Danger
					})
				)]
			});

			const collector = adminMsg?.createMessageComponentCollector({ componentType: ComponentType.Button, time: 60 * 60 * 1000, max: 1 });

			collector?.on('collect', async interaction => {
				await interaction.deferUpdate();

				if (interaction.customId == 'MemeRepost-Yes') {
					const repostedMsg = await (deletedMsg.channel as TextChannel).send({
						content: `${deletedMsg.member!.displayName} tried deleting this meme, but luckily I saved it! ` +
							`Previous upvotes and downvotes were recorded and the meme can still be voted on ${archiveContent.url}`
					});

					await createArchiveVote(repostedMsg, memberCount, { yesVoters, noVoters, cancelTwitPost }, archiveContent, 60 * 60 * 100, deletedMsg.member!);
				}
			});

			collector?.on('end', async (collected, reason) => {
				if (reason !== 'messageDelete') {
					await adminMsg?.delete();
				}
			});
		}
	}

	static async reloadMeme(msg: Message, archiveChannel: GuildBasedChannel, memberCount: number) {
		const archiveContent = new ArchiveContent(msg);
		if (!archiveContent.isMeme() || msg.member?.user.bot || msg.content.includes(XEmoji.emoji) || msg.content.includes(XEmoji.text))
			return;

		const { yesVoters, noVoters, cancelTwitPost } = await getMemeInfo(msg);

		const msgMoment = moment(msg.createdTimestamp, 'x');
		if (msgMoment.isSameOrBefore(moment().subtract(1, 'days')) && msg.member?.user) {
			let points = calcFtbPoints(yesVoters.length, noVoters.length, memberCount);
			const success = await storeMeme(msg.member?.user.id, msg, points, yesVoters, noVoters, memberCount);

			if (success) {
				if (points > 0) {
					const archiveContent = new ArchiveContent(msg);
					await postSuccessfulArchive(msg, archiveContent, archiveChannel as TextChannel, yesVoters.length, memberCount, cancelTwitPost);
				}
				else if (points < 0) {
					await postRejectedArchive(msg);
				}
			}
		}
		else {
			await createArchiveVote(msg, memberCount, { yesVoters, noVoters, cancelTwitPost }, archiveContent, dayInMs - moment().diff(msgMoment));
		}
	}
}
