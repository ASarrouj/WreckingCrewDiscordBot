const fs = require('fs');
path = require('path');

const filename = path.join(__dirname,'./permissions/permissions.ign.json');
let permissionsDB = JSON.parse(fs.readFileSync(filename));

const publicMsgCommands = [
    require('./chatting'), 
    require('./ftbTracker'), 
    require('./imageSearch'), 
    require('./polls'), 
    require('./chatFilter'),
    require('./archiver')
];
const editFunctions = [require('./chatFilter')];
const adminCommands = [];

const adminRoleID = `714862931652903032`;

module.exports = {
    init: (client) => {

        let memberCount;
        const { amir } = require('./../helpers').admins;

        const pubCommandsStr = publicMsgCommands.reduce((acc, module) => {
            if (module.commands){
                return acc.concat(module.commands);
            }
            return acc;
        }, []);

        const adminCommandsStr = adminCommands.reduce((acc, module) => {
            return acc.concat(module.commands);
        }, []);

        client.on('ready', async () => {
            console.log(`Bot is online on server ${client.guilds.cache.first().name}`)

            try {
                const members = await client.guilds.cache.first().members.fetch();
                memberCount = await members.filter(member => {
                    return !member.user.bot
                }).size;
            }
            catch (error){
                console.log(error);
                memberCount = 0;
            }
        });

        client.on('message', msg => {
            if (msg.author.id != client.user.id) {
                publicMsgCommands.forEach((module) => {
                    module.func(msg, memberCount);
                });

                const isAdmin = false;
                try{
                    isAdmin = msg.guild.roles.cache.get(adminRoleID).members.has(msg.author.id);
                }
                catch(e){}

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
            if (oldMsg.author.id != client.user.id){
                editFunctions.forEach((editFunc) => {
                    editFunc.func(newMsg);
                })
            }
        })
    },
    fetchMembers: (client) => {
        console.log(client)
    }
}