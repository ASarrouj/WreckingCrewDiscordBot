const { applyFtbPoints } = require('../ftbTracker');
const { wait } = require('../../helpers/constants');
const { MessageEmbed } = require('discord.js');

const commands = [
    {
        message: '!archive',
        info: 'Use this to generate a poll to archive a message, post, or link to the archive channel (if one exists).'
    }
]

const thumbsUpEmoji = {
    emoji: '👍',
    text: ':thumbsup:',
}

const thumbsDownEmoji = {
    emoji: '👎',
    text: ':thumbsdown:',
}

const XEmoji = {
    emoji: '❌',
    text: ':x:'
}

module.exports = {
    commands,
    func: async (msg) => {
        if (msg.content.startsWith(commands[0].message)) {
            const author = msg.guild.members.cache.get(msg.author.id);
            let pollEmbed = {}, archiveContent = {};

            if (!msg.embeds[0])
                await wait(450);

            if (msg.attachments.size == 1) {
                pollEmbed = new MessageEmbed()
                    .setAuthor(author.displayName, author.user.avatarURL())
                    .setTitle("Should this be added to the archives?")
                    .setImage(msg.attachments.first().url)
                    .addFields([
                        { name: thumbsUpEmoji.text, value: "Yes", inline: true },
                        { name: thumbsDownEmoji.text, value: "No", inline: true },
                    ])
                    .setFooter("Poll Duration: 24 hours")

                archiveContent = pollEmbed.image.url;
            }
            else if (msg.embeds && msg.embeds[0].type == 'image') {
                pollEmbed = new MessageEmbed()
                .setAuthor(author.displayName, author.user.avatarURL())
                .setTitle("Should this be added to the archives?")
                .setImage(msg.embeds[0].url)
                .addFields([
                    { name: thumbsUpEmoji.text, value: "Yes", inline: true },
                    { name: thumbsDownEmoji.text, value: "No", inline: true },
                ])
                .setFooter("Poll Duration: 24 hours")

            archiveContent = msg.embeds[0].url;
            }
            else if (msg.embeds && msg.embeds[0].type == 'rich') {
                pollEmbed = new MessageEmbed()
                    .setTitle("Should this be added to the archives?")
                    .setURL(msg.embeds[0].url)
                    .setDescription(`${msg.embeds[0].author.name}\n
                                    ${msg.embeds[0].description}\n
                                    ------------------------------------------------`)
                    .setAuthor(author.displayName, author.user.avatarURL())
                    .setThumbnail(msg.embeds[0].footer.iconURL)
                    .setFooter("Poll Duration: 24 hours")
                    .addFields([
                        { name: thumbsUpEmoji.text, value: "Yes", count: 0, inline: true },
                        { name: thumbsDownEmoji.text, value: "No", count: 0, inline: true },
                    ]);
                archiveContent = pollEmbed.url;
            }
            else if (msg.embeds && msg.embeds[0].type == 'video') {
                pollEmbed = new MessageEmbed()
                    .setTitle("Should this be added to the archives? (Click to watch)")
                    .setURL(msg.embeds[0].url)
                    .setDescription(`${msg.embeds[0].author.name}\n
                                ${msg.embeds[0].title}\n
                                ------------------------------------------------`)
                    .setAuthor(author.displayName, author.user.avatarURL())
                    .setThumbnail("https://assets.stickpng.com/thumbs/580b57fcd9996e24bc43c545.png")
                    .setFooter("Poll Duration: 24 hours")
                    .addFields([
                        { name: thumbsUpEmoji.text, value: "Yes", count: 0, inline: true },
                        { name: thumbsDownEmoji.text, value: "No", count: 0, inline: true },
                    ]);
                archiveContent = pollEmbed.url;
            }
            else {
                msg.author.send("Nothing archivable detected. Currently supported content is tweets, youtube links, and images.");
                return;
            }

            const archiveChannel = msg.guild.channels.cache.find(channel => {
                return channel.name == "the-archives";
            });

            if (!archiveChannel){
                msg.author.send("There is no archive channel in this server. Please message an admin to see if one should be added.");
                return;
            } 
            const memberCount = msg.guild.members.cache.size - 1;
            const votedUsers = [];

            const sentMsg = await msg.channel.send(pollEmbed);
            await msg.delete();

            let yesCount = 0, noCount = 0;

            const filter = (reaction) => {
                return reaction.emoji.name == thumbsUpEmoji.emoji ||
                    reaction.emoji.name == thumbsDownEmoji.emoji ||
                    reaction.emoji.name == XEmoji.emoji;
            }
            const collector = sentMsg.createReactionCollector(filter, { maxUsers: memberCount, time: 86400000 });

            collector.on('collect', (reaction, user) => {
                if (user.id == author.id && reaction.emoji.name == XEmoji.emoji) {
                    collector.stop();
                    return;
                }
                if (votedUsers.includes(user.id)) {
                    user.send("Sorry, you cannot vote twice and your original vote cannot be changed.");
                    return;
                }

                if (reaction.emoji.name == thumbsUpEmoji.emoji) {
                    yesCount++;
                }
                else {
                    noCount++;
                }

                votedUsers.push(user.id);
            })

            collector.on('end', async collected => {
                pollEmbed.fields[0].name += `   ${yesCount} ${yesCount == 1 ? "vote" : "votes"}`;
                pollEmbed.fields[1].name += `   ${noCount} ${noCount == 1 ? "vote" : "votes"}`;
                if (collected.last().emoji.name == XEmoji.emoji) {
                    pollEmbed.fields.unshift({ name: "\u200b", value: "The poll was ended early by the author. Here were the collected results." })
                }
                else if (collected.size == memberCount) {
                    pollEmbed.fields.unshift({ name: "\u200b", value: "Everyone has voted. Here are the results of the poll." });
                }
                else {
                    pollEmbed.fields.unshift({ name: "\u200b", value: "The poll time has expired. Here are the results of the poll." });
                }

                if (yesCount > memberCount / 2) {
                    pollEmbed.fields.push({
                        name: "Vote Passed",
                        value: "A majority of the server has decided this was archive worthy, and thus it will be added to the archives." +
                            " The archiver has also been awarded 5 ftb points for his contribution."
                    });
                    await applyFtbPoints(author.id, 5, sentMsg.channel);
                    await archiveChannel.send(archiveContent);
                }
                else if (noCount > memberCount / 2) {
                    pollEmbed.fields.push({
                        name: "Vote Rejected",
                        value: "A majority of the server has decided this was very un-archive worthy, and thus it will not be added to the archives." +
                            " The archiver has also been deducted 5 ftb points for wasting the server's time."
                    });
                    await applyFtbPoints(author.id, -5, sentMsg.channel);
                }
                else {
                    pollEmbed.fields.push({
                        name: "Vote Failed",
                        value: "The poll failed to get enough votes to archive the content, and thus it will not be added to the archives."
                    });
                }
                await sentMsg.channel.send(pollEmbed);
            });
        }
    }
}