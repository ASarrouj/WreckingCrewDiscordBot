path = require('path');
const axios = require('axios');

const slashCommands = [
    ...require('./chatting'),
    ...require('./ftbTracker'),
    require('./imageSearch'),
    require('./polls'),
    require('./youtube'),
    require('./coinFlip')
]

const msgFunctions = [
    require('./imageSearch'),
    require('./chatFilter'),
    require('./archiver')
];
const editFunctions = [require('./chatFilter')];

const extraGuildInfo = [];

module.exports = {
    init: (client) => {
        client.on('ready', async () => {
            await Promise.all(client.guilds.cache.map(async guild => {
                console.log(`Bot is online on server ${guild.name}`);
                try {
                    const members = await guild.members.fetch();
                    extraGuildInfo[guild.id] = {
                        memberCount: await members.filter(member => {
                            return !member.user.bot
                        }).size
                    }
                }
                catch (error) {
                    console.error(error);
                    extraGuildInfo[guild.id] = {
                        memberCount: 0,
                    }
                }
            }))
        });

        client.ws.on('INTERACTION_CREATE', async (interaction) => {
            const sentCommand = interaction.data.name.toLowerCase();

            const linkedCommand = slashCommands.find(botCommand => {
                return botCommand.commandName === sentCommand;
            });

            const guild = client.guilds.cache.get(interaction.guild_id)

            if (linkedCommand) {
                if (!interaction.user || linkedCommand.DM){
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
    
                        linkedCommand.followup(messageObject, extraGuildInfo[interaction.guild_id].memberCount);
                    }
                }
                else {
                    await client.api.interactions(interaction.id, interaction.token).callback.post({
                        data: {
                            type: 4,
                            data: {
                                content: 'This command can only be used in server channels.',
                                flags: 64,
                            },
                        },
                    });
                }

            }
            else {
                await client.api.interactions(interaction.id, interaction.token).callback.post({
                    data: {
                        type: 4,
                        data: {
                            content: 'The logic for this command has not yet been implemented.',
                            flags: 64,
                        },
                    },
                });
            }
        })

        client.on('message', msg => {
            if (msg.author.id != client.user.id) {
                msgFunctions.forEach((module) => {
                    module.func(msg, extraGuildInfo[msg.guild.id].memberCount);
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