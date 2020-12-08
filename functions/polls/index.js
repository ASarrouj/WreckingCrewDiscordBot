const moment = require('moment');
const commands = [
    {
        message: '!poll',
        info: 'Use this to generate a poll question. Use this format to create them: !poll Question [Option1] [Option2] ...etc. To vote on the polls, react to the poll with the numbered emoji of the option you are voting for'
    }
]

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
]

module.exports = {
    commands,
    func: async (msg) => {
        if (msg.content.startsWith(commands[0].message)) {
            const questionRegex = /(?<=!poll )[^[]+(?= \[)/;
            const optionsRegex = /(?<=\s\[)[^[]+(?=\])/g;

            const author = msg.guild.members.cache.get(msg.author.id);
            const memberCount = msg.guild.members.cache.size;
            const votedUsers = [];

            let question = msg.content.match(questionRegex);
            const options = msg.content.match(optionsRegex);
            const possibleReactions = numberEmojis.slice(0, options.length);

            if (question != null && options != null) {
                question = question[0];

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
                            text: `Poll ID: ${moment().format('X')}`,
                        }
                    }
                }
                const sentMsg = await msg.channel.send(pollEmbed);
                await msg.delete();

                const filter = (reaction) => {
                    return possibleReactions.find(possibleReaction => {
                        return possibleReaction.emoji == reaction.emoji.name;
                    });
                }
                const collector = sentMsg.createReactionCollector(filter, { maxUsers: memberCount - 1, time: 3600000 });

                collector.on('collect', (reaction, user) => {
                    if (votedUsers.includes(user.id)) {
                        user.send("Sorry, you cannot vote twice and your original vote cannot be changed.")
                    }
                    else {
                        const validReactionIndex = possibleReactions.findIndex(possibleReaction => {
                            return possibleReaction.emoji == reaction.emoji.name;
                        });

                        pollEmbed.embed.fields[validReactionIndex].count++;
                        votedUsers.push(user.id);
                    }
                })

                collector.on('end', async collected => {
                    if (collected.size == memberCount - 1) {
                        pollEmbed.embed.description = "Everyone has voted. Here are the results of the poll.";
                    }
                    else {
                        pollEmbed.embed.description = "The poll time has expired. Here are the results of the poll.";
                    }
                    pollEmbed.embed.fields = pollEmbed.embed.fields.sort((a, b) => {
                        return b.count - a.count;
                    })
                    pollEmbed.embed.fields = pollEmbed.embed.fields.map(field => {
                        field.name += `   ${field.count} vote(s)`;
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