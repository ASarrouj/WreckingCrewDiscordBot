const { applyFtbPoints } = require('../ftbTracker/action');
const { wait } = require('../../helpers/constants');
const { MessageEmbed } = require('discord.js');

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

module.exports = {
	func: async (msg, memberCount) => {
		if (msg.channel.topic && msg.channel.topic.includes('#archivable')) {
			let archiveContent;

			if (!msg.embeds[0])
				await wait(1000);

			if (msg.attachments.size == 1) {
				archiveContent = msg.attachments.first().url;
			}
			else if (msg.embeds[0]) {
				archiveContent = msg.embeds[0].url;
			}
			else {
				return;
			}

			const author = msg.guild.members.cache.get(msg.author.id);

			const archiveChannel = msg.guild.channels.cache.find(channel => {
				return channel.name == 'the-archives';
			});

			if (!archiveChannel) {
				msg.author.send('There is no archive channel in this server. Please message an admin to see if one should be added.');
				return;
			}
			const votedUsers = [author.id];
			await msg.react(thumbsUpEmoji.emoji);

			let yesCount = 1, noCount = 0;

			const filter = (reaction, user) => {
				return (reaction.emoji.name == thumbsUpEmoji.emoji ||
                    reaction.emoji.name == thumbsDownEmoji.emoji ||
                    reaction.emoji.name == XEmoji.emoji) &&
                    !user.bot;
			};
			const collector = msg.createReactionCollector(filter, { maxUsers: memberCount, time: 86400000 });

			collector.on('collect', (reaction, user) => {
				if (user.id == author.id && reaction.emoji.name == XEmoji.emoji) {
					collector.stop();
					return;
				}
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
					let pollEmbed = new MessageEmbed();
					pollEmbed.setURL(msg.url)
						.setTitle('Meme Approved')
						.setDescription('A majority of the server has decided this was archive worthy, and thus it will be added to the archives.' +
                            ' The archiver has also been awarded 5 ftb points for his contribution.');
					await applyFtbPoints(author, 5);
					await archiveChannel.send(archiveContent);
					await msg.channel.send(pollEmbed);
				}
				else if (noCount > memberCount / 2) {
					let pollEmbed = new MessageEmbed();
					pollEmbed.setURL(msg.url)
						.setTitle('Meme Shot Down')
						.setDescription('A majority of the server has decided this meme is terrible, and thus the author must pay the price.' +
                            ' The author has been deducted 5 ftb points for wasting the server\'s time.');
					await applyFtbPoints(author, -5);
					await msg.channel.send(pollEmbed);
				}
			});
		}
	}
};