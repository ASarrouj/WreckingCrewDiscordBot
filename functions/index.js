path = require('path');
const axios = require('axios');

const botCommands = [
    ...require('./chatting'),
    require('./ftbTracker'),
    require('./imageSearch'),
    require('./polls'),
    require('./youtube')
]

const publicMsgCommands = [
    require('./imageSearch'),
    require('./chatFilter'),
    require('./archiver')
];
const editFunctions = [require('./chatFilter')];

module.exports = {
    init: (client) => {
        let memberCount, guild;

        client.on('ready', async () => {
            guild = client.guilds.cache.first();
            console.log(`Bot is online on server ${guild.name}`);

            try {
                const members = await guild.members.fetch();
                memberCount = await members.filter(member => {
                    return !member.user.bot
                }).size;
            }
            catch (error) {
                console.log(error);
                memberCount = 0;
            }
        });

        client.ws.on('INTERACTION_CREATE', async (interaction) => {
            const sentCommand = interaction.data.name.toLowerCase();

            const linkedCommand = botCommands.find(botCommand => {
                return botCommand.commandName === sentCommand;
            });

            if (linkedCommand) {
                await client.api.interactions(interaction.id, interaction.token).callback.post({
                    data: {
                        type: 4,
                        data: await linkedCommand.run(interaction, guild),
                    }
                });

                if (linkedCommand.followup) {
                    const appId = (await client.fetchApplication()).id;
                    const responseMsg = (await axios.get(`https://discord.com/api/v8/webhooks/${appId}/${interaction.token}/messages/@original`)).data;
                    const messageObject = client.guilds.cache.first().channels.cache.get(responseMsg.channel_id).messages.cache.get(responseMsg.id);
                    messageObject.interactionAuthor = responseMsg.interaction.user;

                    linkedCommand.followup(messageObject, memberCount);
                }
            }
            else {
                await client.api.interactions(interaction.id, interaction.token).callback.post({
                    data: {
                        type: 4,
                        data: {
                            content: 'The logic for this command has not yet been implemented.'
                        },
                        flags: 64,
                    },
                });
            }

        })

        client.on('message', msg => {
            if (msg.author.id != client.user.id) {
                publicMsgCommands.forEach((module) => {
                    module.func(msg, memberCount);
                });
            }
        })

        client.on('messageUpdate', (oldMsg, newMsg) => {
            if (oldMsg.author.id != client.user.id) {
                editFunctions.forEach((editFunc) => {
                    editFunc.func(newMsg);
                })
            }
        })
    },
}