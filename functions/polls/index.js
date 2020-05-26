const { MessageEmbed } = require('discord.js');

const commands = [
    {
        message: '!poll',
        info: 'Use this to generate a poll question. Use this format to create them: !poll Question [Option1] [Option2] ...etc. To vote on the polls, react to the poll with the numbered emoji of the option you are voting for'
    }
]

const numberEmojis = [
    ':one:',
    ':two:',
    ':three:',
    ':four:',
    ':five:',
    ':six:',
    ':seven:',
    ':eight:',
    ':nine:',
    ':keycap_ten:',
]

module.exports = {
    commands,
    func: async (msg) => {
        if (msg.content.includes(commands[0].message) && msg.author.username !== "Boofle") {
            const questionRegex = /(?<=!poll )[^[]+(?= \[)/;
            const optionsRegex = /(?<=\s\[)[^[]+(?=\])/g;

            const author = msg.guild.members.cache.get(msg.author.id);

            let question = msg.content.match(questionRegex);
            const options = msg.content.match(optionsRegex);

            if (question != null && options != null){
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
                            return {name: numberEmojis[index], value: option}
                        })
                    }
                }
                await msg.channel.send(pollEmbed);
                await msg.delete();
            }
            else{
                msg.channel.send("Sorry, that isn't a valid format for this command.\nThe correct format is \"!poll Question [Option1] [Option2]\".");
            }
        }
    }
}