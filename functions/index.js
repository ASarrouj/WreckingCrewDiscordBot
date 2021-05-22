const fs = require('fs');
path = require('path');
const axios = require('axios');

const botCommands = [
    ...require('./chatting'),
    require('./ftbTracker'),
    require('./imageSearch'),
    require('./polls'),
]

const publicMsgCommands = [
    require('./imageSearch'),
    require('./polls'),
    require('./chatFilter'),
    require('./archiver')
];
const editFunctions = [require('./chatFilter')];

const adminRoleID = `714862931652903032`;

module.exports = {
    init: (client) => {
        let memberCount, guild;

        const pubCommandsStr = publicMsgCommands.reduce((acc, module) => {
            if (module.commands) {
                return acc.concat(module.commands);
            }
            return acc;
        }, []);

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

            if (linkedCommand){
                await client.api.interactions(interaction.id, interaction.token).callback.post({
                    data: {
                        type: 4,
                        data: await linkedCommand.run(interaction, guild),
                    }
                });
                const appId = (await client.fetchApplication()).id;
    
                const responseMsg = (await axios.get(`https://discord.com/api/v8/webhooks/${appId}/${interaction.token}/messages/@original`)).data;
                const messageObject = client.guilds.cache.first().channels.cache.get(responseMsg.channel_id).messages.cache.get(responseMsg.id);
                messageObject.interactionAuthor = responseMsg.interaction.user;

                if (linkedCommand.followup){
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
                    },
                    flags: 64,
                });
            }

        })

        client.on('message', msg => {
            if (msg.author.id != client.user.id) {
                publicMsgCommands.forEach((module) => {
                    module.func(msg, memberCount);
                });

                const isAdmin = false;
                try {
                    isAdmin = msg.guild.roles.cache.get(adminRoleID).members.has(msg.author.id);
                }
                catch (e) { }

                if (isAdmin) {
                    adminCommands.forEach((module) => {
                        module.func(msg);
                    })
                }

                if (msg.content === '!info') {
                    let infoMessage = pubCommandsStr.reduce((accMsg, command) => {
                        return accMsg += `'${command.message}': ${command.info}\n`;
                    }, "Commands:\n");

                    if (isAdmin) {
                        infoMessage += '\n' + adminCommandsStr.reduce((accMsg, command) => {
                            return accMsg += `'${command.message}': ${command.info}\n`;
                        }, "Admin Commands:\n");
                    }

                    msg.author.send(infoMessage);
                }
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