const keys = require('../../searchKeys.ign.js');
const { MessageAttachment } = require('discord.js');
const imageSearch = require('image-search-google');
const engines = keys.map((key) => { return new imageSearch(key.cx, key.apiKey) });
const options = { safe: "active" };
var engineIndex = 0;

const commands = [
    {
        message: '!showMe',
        info: `This command will Google search whatever comes after the \"!showMe\". Boofle will return the first image result of the search`
    },
    {
        message: '!sm',
        info: `Shorthand for !showMe`
    }
]

module.exports = {
    commands,
    func: async (msg) => {
        commands.forEach(async (command) => {
            command.message = command.message.toLowerCase();
            msg.content = msg.content.toLowerCase();
            if (msg.content.startsWith(command.message)) {
                const regexMatch = new RegExp(`(?<=${command.message} ).+`).exec(msg.content);
                if (regexMatch !== null) {
                    const searchQuery = regexMatch[0];
                    try {
                        const results = await engines[engineIndex].search(searchQuery, options);
                        var foundImage = false;
                        for (let i = 0; i < results.length; i++) {
                            var isCorrectMedia = false;
                            if (msg.content.includes('gif')) {
                                isCorrectMedia = /\.gif$/.test(results[i].url);
                            }
                            else {
                                isCorrectMedia = /\.(jpg|jpeg|png|svg|pdf|gif|tiff|img)$/.test(results[i].url);
                            }
                            if (isCorrectMedia) {
                                const attachment = new MessageAttachment(results[i].url);
                                const sentMsg = await msg.channel.send(attachment);
                                if (sentMsg.attachments.first().height != null) {
                                    foundImage = true;
                                    break;
                                }
                                else {
                                    sentMsg.delete();
                                }
                            }
                        };
                        if (!foundImage) {
                            msg.channel.send(`Sorry, no image could be found with that search query.`)
                        }
                    }
                    catch (e) {
                        switch (e.message) {
                            case "Response code 429 (Too Many Requests)":
                                msg.channel.send(`Too many requests have been made to search engine ${engineIndex}. If this issue persists we should look into adding more engines.`);
                                break;
                            default:
                                msg.channel.send('Sorry, something went wrong with that search. Amir will look into it');
                        }

                        console.log(e.message);
                    }
                    engineIndex++;
                    if (engineIndex == engines.length) {
                        engineIndex = 0;
                    }
                }
                else {
                    msg.author.send('You need to include a term to actually search');
                }
            }
        })
    },
    commandName: 'showme',
    run: async (payload, guild) => {
        let interactionResponse = {};
        const origQuery = payload.data.options.find(option => {
            return option.name === 'query';
        }).value;
        const gifOption = payload.data.options.find(option => {
            return option.name === 'gif';
        });
        const gifOnly = gifOption ? gifOption.value : false;
        const query = gifOnly ? `${origQuery} gif` : origQuery;
        const author = guild.members.cache.get(payload.member.user.id);

        try {
            const results = await engines[engineIndex].search(query, options);
            const firstResult = results.find(result => {
                if (gifOnly) {
                    return /^https:.*\.gif$/.test(result.url);
                }
                else {
                    return /^https:.*\.(jpg|jpeg|png|svg|pdf|gif|tiff|img)$/.test(result.url);
                }
            })

            if (firstResult) {
                interactionResponse = {
                    embeds: [
                        {
                            title: origQuery,
                            image: {
                                url: firstResult.url
                            },
                            author: {
                                name: author.displayName,
                                icon_url: author.user.avatarURL(),
                            },
                        }
                    ]
                }
            }
            else {
                interactionResponse = {
                    content: `Sorry, no image could be found with the search query \`${query}\`.`,
                }
            }

        }
        catch (e) {
            switch (e.message) {
                case "Response code 429 (Too Many Requests)":
                    interactionResponse = {
                        content: `Too many requests have been made to search engine ${engineIndex}. If this issue persists we should look into adding more engines.`
                    };
                    break;
                default:
                    interactionResponse = {
                        content: 'Sorry, something went wrong with that search. Amir will look into it'
                    }
            }

            console.log(e.message);
        }
        engineIndex++;
        if (engineIndex == engines.length) {
            engineIndex = 0;
        }

        return interactionResponse;

    }
}