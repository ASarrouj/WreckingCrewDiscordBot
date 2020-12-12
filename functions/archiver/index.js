const moment = require('moment');
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

            const author = msg.guild.members.cache.get(msg.author.id);
            const memberCount = msg.guild.members.cache.size;
            const votedUsers = [];

            if (question != null && options != null) {
                question = question[0];
                let pollHours = pollTime != null ? parseFloat(pollTime[0]) : 1.0;
                if (pollHours < 0.25){
                    pollHours = 0.25;
                }
                else if (pollHours > 48.0){
                    pollHours = 48.0;
                }
                let pollDuration = pollHours * 60 * 60 * 1000;
                console.log(pollHours);

                const pollEmbed = {
                    embed: {
                        author: {
                            name: author.displayName,
                            icon_url: author.user.avatarURL(),
                        },
                        title: question,
                        description: "Vote on this poll by reacting with the emoji of the option you want to vote for.",
                        fields: options.map((option, index) => {
                            return { name: numberEmojis[index].text, value: option, count: 0 };
                        }),
                        footer: {
                            text: `Poll Duration: ${pollHours} ${pollHours == 1 ? "hour" : "hours"}`,
                        }
                    }
                }
                const sentMsg = await msg.channel.send(pollEmbed);
                await msg.delete();

                const filter = (reaction) => {
                    return possibleReactions.find(possibleReaction => {
                        return possibleReaction.emoji == reaction.emoji.name;
                    }) || reaction.emoji.name == XEmoji.emoji;
                }
                const collector = sentMsg.createReactionCollector(filter, { maxUsers: memberCount - 1, time: pollDuration });

                collector.on('collect', (reaction, user) => {
                    if (user.id == author.id && reaction.emoji.name == XEmoji.emoji){
                        collector.stop();
                        return;
                    }
                    if (votedUsers.includes(user.id)) {
                        user.send("Sorry, you cannot vote twice and your original vote cannot be changed.");
                        return;
                    }
                    const validReactionIndex = possibleReactions.findIndex(possibleReaction => {
                        return possibleReaction.emoji == reaction.emoji.name;
                    });

                    pollEmbed.embed.fields[validReactionIndex].count++;
                    votedUsers.push(user.id);
                })

                collector.on('end', async collected => {
                    if (collected.last().emoji.name == XEmoji.emoji){
                        pollEmbed.embed.description = "The poll was ended early by the author. Here were the collected results."
                    }
                    else if (collected.size == memberCount - 1) {
                        pollEmbed.embed.description = "Everyone has voted. Here are the results of the poll.";
                    }
                    else {
                        pollEmbed.embed.description = "The poll time has expired. Here are the results of the poll.";
                    }
                    pollEmbed.embed.fields = pollEmbed.embed.fields.sort((a, b) => {
                        return b.count - a.count;
                    })
                    pollEmbed.embed.fields = pollEmbed.embed.fields.map(field => {
                        field.name += `   ${field.count} ${field.count == 1 ? "vote" : "votes"}`;
                        return field;
                    })
                    await sentMsg.channel.send(pollEmbed);
                });
            }
            else {
                msg.author.send("Sorry, that isn't a valid format for this command.\nThe correct format is \"!poll Question [Option1] [Option2]\".");
            }
        }
    }
}