const { applyFtbPoints }= require('../ftbTracker')

const commands = [
    {
        message: '!archive',
        info: 'Use this to generate a poll to archive a message, post, or link to the archive channel (if one exists).'
    }
]

const thumbsUpEmoji = {
    emoji: '👍',
    text: 'thumbsup',
}

const thumbsDownEmoji = {
    emoji: '👎',
    text: 'thumbsdown',
}

const XEmoji = {
    emoji: '❌',
    text: ':x:'
}

module.exports = {
    commands,
    func: async (msg) => {
        if (msg.content.startsWith(commands[0].message)) {
            console.log(msg);
            const author = msg.guild.members.cache.get(msg.author.id);
            console.log(author)
            const memberCount = msg.guild.members.cache.size - 1;
            const votedUsers = [];

            if (false) {
                question = question[0];

                const pollEmbed = {
                    embed: {
                        author: {
                            name: author.displayName,
                            icon_url: author.user.avatarURL(),
                        },
                        title: question,
                        description: "Should we archive this?",
                        fields: [
                            { name: thumbsUpEmoji.text, value: "Yes", count: 0 },
                            { name: thumbsDownEmoji.text, value: "No", count: 0 },
                        ],
                        footer: {
                            text: "Poll Duration: 24 hours",
                        }
                    }
                }
                const sentMsg = await msg.channel.send(pollEmbed);
                await msg.delete();

                const filter = (reaction) => {
                    return reaction.emoji.name == thumbsUpEmoji.emoji ||
                           reaction.emoji.name == thumbsDownEmoji.emoji ||
                           reaction.emoji.name == XEmoji.emoji;
                }
                const collector = sentMsg.createReactionCollector(filter, { maxUsers: memberCount, time: 86400000 });

                collector.on('collect', (reaction, user) => {
                    if (user.id == author.id && reaction.emoji.name == XEmoji.emoji){
                        collector.stop();
                        return;
                    }
                    if (votedUsers.includes(user.id)) {
                        user.send("Sorry, you cannot vote twice and your original vote cannot be changed.");
                        return;
                    }
                    
                    if (reaction.emoji.name == thumbsUpEmoji.emoji){
                        pollEmbed.embed.fields[0].count++;
                    }
                    else{
                        pollEmbed.embed.fields[1].count++;
                    }

                    votedUsers.push(user.id);
                })

                collector.on('end', async collected => {
                    if (collected.last().emoji.name == XEmoji.emoji){
                        pollEmbed.embed.description = "The poll was ended early by the author. Here were the collected results."
                    }
                    else if (collected.size == memberCount) {
                        pollEmbed.embed.description = "Everyone has voted. Here are the results of the poll.";
                    }
                    else {
                        pollEmbed.embed.description = "The poll time has expired. Here are the results of the poll.";
                    }
                    pollEmbed.embed.fields = pollEmbed.embed.fields.sort((a, b) => {
                        return b.count - a.count;
                    });
                    pollEmbed.embed.fields = pollEmbed.embed.fields.map(field => {
                        field.name += `   ${field.count} ${field.count == 1 ? "vote" : "votes"}`;
                        return field;
                    });

                    if (pollEmbed.embed.fields[0].count > memberCount / 2) {
                        pollEmbed.embed.fields.push({
                            name: "Vote Passed",
                            value: "A majority of the server has decided this was archive worthy, and thus it will be added to the archives." + 
                            " The archiver has also been awarded 5 ftb points for his contribution."
                        });
                        await applyFtbPoints(author.id, 5, sentMsg.channel);
                    }
                    else if (pollEmbed.embed.fields[1].count > memberCount / 2) {
                        pollEmbed.embed.fields.push({
                            name: "Vote Rejected",
                            value: "A majority of the server has decided this was very un-archive worthy, and thus it will not be added to the archives." + 
                            " The archiver has also been deducted 5 ftb points for wasting the server's time."
                        });
                        await applyFtbPoints(author.id, -5, sentMsg.channel);
                    }
                    else {
                        pollEmbed.embed.fields.push({
                            name: "Vote Failed",
                            value: "The poll failed to get enough votes to archive the content, and thus it will not be added to the archives."
                        });
                    }
                    await sentMsg.channel.send(pollEmbed);
                });
            }
            else {
                msg.author.send("You must either attach media to the archive command, or the message must be an external link or a link to another discord message.");
            }
        }
    }
}