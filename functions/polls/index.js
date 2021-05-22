const lodash = require('lodash');

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

const XEmoji = {
    emoji: '❌',
    text: ':x:'
}

module.exports = {
    commands,
    func: async (msg, memberCount) => {
        if (msg.content.startsWith(commands[0].message)) {
            const questionRegex = /(?<=!poll )[^[]+(?= \[)/;
            const optionsRegex = /(?<=\s\[)[^[]+(?=\])/g;
            const timeRegex = /(?<=\s)[\d\.]+(?=h)/;

            const author = msg.guild.members.cache.get(msg.author.id);
            const votedUsers = [];

            let question = msg.content.match(questionRegex);
            const options = msg.content.match(optionsRegex);
            const possibleReactions = numberEmojis.slice(0, options.length);
            const pollTime = msg.content.match(timeRegex);

            if (question != null || options != null) {
                question = question[0].slice(0, 255);
                let pollHours = pollTime != null ? parseFloat(pollTime[0]) : 1.0;
                if (pollHours < 0.25) {
                    pollHours = 0.25;
                }
                else if (pollHours > 48.0) {
                    pollHours = 48.0;
                }
                let pollDuration = pollHours * 60 * 60 * 1000;

                const pollEmbed = {
                    embed: {
                        author: {
                            name: author.displayName,
                            icon_url: author.user.avatarURL(),
                        },
                        title: question,
                        description: "Vote on this poll by reacting with the emoji of the option you want to vote for.",
                        fields: (() => {
                            let fields = [];
                            for (let i = 0; i < options.length; i++) {
                                if (i % 3 == 2) {
                                    fields.push({
                                        name: '\u200b',
                                        value: '\u200b',
                                    });
                                }
                                fields.push({ name: numberEmojis[i].text, value: options[i], count: 0, inline: true });
                            }
                            return fields;
                        })(),
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
                const collector = sentMsg.createReactionCollector(filter, { maxUsers: memberCount, time: pollDuration });

                collector.on('collect', (reaction, user) => {
                    if (user.id == author.id && reaction.emoji.name == XEmoji.emoji) {
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
                    if (collected.last().emoji.name == XEmoji.emoji) {
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
    },
    commandName: 'poll',
    run: async (payload, guild) => {
        let question = payload.data.options.find(option => {
            return option.name === 'question';
        }).value;
        const choices = payload.data.options.filter(option => {
            return option.name.includes('choice');
        }).map(option => {
            return option.value;
        });

        const timeOption = payload.data.options.find(option => {
            return option.name === 'time';
        });
        const pollHours = timeOption ? timeOption.value : 1;

        const author = guild.members.cache.get(payload.member.user.id);

        question = question.slice(0, 255);
        if (pollHours < 1) {
            pollHours = 1;
        }
        else if (pollHours > 48) {
            pollHours = 48;
        }

        const pollEmbed = {
            author: {
                name: author.displayName,
                icon_url: author.user.avatarURL(),
            },
            title: question,
            description: "Vote on this poll by reacting with the emoji of the option you want to vote for.",
            fields: (() => {
                let fields = [];
                for (let i = 0; i < choices.length; i++) {
                    if (i % 3 == 2) {
                        fields.push({
                            name: '\u200b',
                            value: '\u200b',
                        });
                    }
                    fields.push({ name: numberEmojis[i].text, value: choices[i], inline: true });
                }
                return fields;
            })(),
            footer: {
                text: `Poll Duration: ${pollHours} ${pollHours == 1 ? "hour" : "hours"}`,
            }
        }
        return {
            embeds: [
                pollEmbed
            ],
        }
    },
    followup: async (messageObject, memberCount) => {
        const pollEmbed = lodash.cloneDeep(messageObject.embeds[0]);
        pollEmbed.fields = pollEmbed.fields.map(field => {
            field.count = 0;
            return field;
        });
        const possibleReactions = numberEmojis.slice(0, pollEmbed.fields.filter(field => {
            return field.inline;
        }).length);
        const pollDuration = parseInt(pollEmbed.footer.text.match(/\d+/)) * 60 * 60 * 1000;
        const votedUsers = [];

        const filter = (reaction) => {
            return possibleReactions.find(possibleReaction => {
                return possibleReaction.emoji == reaction.emoji.name;
            }) || reaction.emoji.name == XEmoji.emoji;
        }
        const collector = messageObject.createReactionCollector(filter, { maxUsers: memberCount, time: pollDuration });

        collector.on('collect', (reaction, user) => {
            if (user.id == messageObject.interactionAuthor.id && reaction.emoji.name == XEmoji.emoji) {
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

            pollEmbed.fields[validReactionIndex].count++;
            votedUsers.push(user.id);
        })

        collector.on('end', async collected => {
            if (collected.last().emoji.name == XEmoji.emoji) {
                pollEmbed.description = "The poll was ended early by the author. Here were the collected results."
            }
            else if (collected.size == memberCount) {
                pollEmbed.description = "Everyone has voted. Here are the results of the poll.";
            }
            else {
                pollEmbed.description = "The poll time has expired. Here are the results of the poll.";
            }
            pollEmbed.fields = pollEmbed.fields.sort((a, b) => {
                return b.count - a.count;
            })
            pollEmbed.fields = pollEmbed.fields.map(field => {
                field.name += `   ${field.count} ${field.count == 1 ? "vote" : "votes"}`;
                return field;
            })
            await messageObject.channel.send(pollEmbed);
        });
    }
}