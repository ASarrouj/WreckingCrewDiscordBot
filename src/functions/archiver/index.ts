import { applyFtbPoints } from '../ftbTracker/action';
import { wait } from '../../helpers/constants';
import { Guild, Message, MessageEmbed, MessageReaction, TextChannel, User } from 'discord.js';
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

const filename = path.join(__dirname, 'lastMemeID.txt');

const filter = (reaction: MessageReaction, user: User) => {
	return (reaction.emoji.name == thumbsUpEmoji.emoji ||
		reaction.emoji.name == thumbsDownEmoji.emoji ||
		reaction.emoji.name == XEmoji.emoji) &&
		!user.bot;
};

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
	fs.writeFileSync(filename, msg.id, 'utf-8');
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
	let archiveContent: string;
	if (msg.attachments.first()) {
		archiveContent = msg.attachments.first()!.url;
	}
	else if (msg.embeds[0]) {
		archiveContent = msg.embeds[0].url!;
	}
	else {
		return;
	}
	const archiveChannel = msg.guild!.channels.cache.find(channel => {
		return channel.name == 'the-archives';
	});

	if (!archiveChannel) {
		msg.author.send('There is no archive channel in this server. Please message an admin to see if one should be added.');
		return;
	}
	await msg.react(thumbsUpEmoji.emoji);

	const collector = msg.createReactionCollector({ filter, maxUsers: memberCount, time });

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
			postSuccessfulArchive(msg, archiveContent, archiveChannel as TextChannel, yesCount, memberCount);
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

			await createArchiveVote(msg, memberCount);
		}
	}

	static async reloadArchiveVotes(guild: Guild, memberCount: number): Promise<void> {
		const lastMessageId = fs.readFileSync(filename, 'utf-8');
		const memesChannel = guild.channels.cache.find(channel => {
			return channel.name === 'test' && (channel as TextChannel).topic!.includes('#archivable');
		}) as TextChannel;

		if (memesChannel) {
			let yesCount = 0, noCount = 0;
			const newMemes = (await memesChannel.messages.fetch({
				after: lastMessageId
			})).filter(msg => {
				return (msg.embeds[0] || msg.attachments.first()) && !msg.member?.user.bot;
			});

			await Promise.all(newMemes.map(async msg => {
				let votedUsers: string[] = [msg.author.id];
				console.log(msg.reactions.cache);

				await Promise.all(msg.reactions.cache.map(async reaction => {
					if (reaction.emoji.name === thumbsUpEmoji.emoji) {
						const yesUsers = (await reaction.users.fetch()).map(user => {
							return user.id;
						});
						votedUsers = votedUsers.concat(yesUsers);
						yesCount = yesUsers.length;
					}
					else if (reaction.emoji.name === thumbsDownEmoji.emoji) {
						const noUsers = (await reaction.users.fetch()).map(user => {
							return user.id;
						});
						votedUsers = votedUsers.concat(noUsers);
						noCount = noUsers.length;
					}
				}));
				const msgMoment = moment(msg.createdTimestamp, 'x');
				if (msgMoment.isSameOrBefore(moment().subtract(1, 'days'))) {
					if (yesCount > memberCount / 2) {
						const archiveChannel = guild!.channels.cache.find(channel => {
							return channel.name == 'test';
						});
						postSuccessfulArchive(msg, (msg.attachments.first()!.url || msg.embeds[0].url)!, archiveChannel as TextChannel, yesCount, memberCount);
					}
					else if (noCount > memberCount / 2) {
						postRejectedArchive(msg);
					}
				}
				else {
					createArchiveVote(msg, memberCount, yesCount, noCount, votedUsers, dayInMs - moment().diff(msgMoment));
				}
			}));
		}
	}
}