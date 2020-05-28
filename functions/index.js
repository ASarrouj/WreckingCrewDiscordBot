const fs = require('fs');
path = require('path');

const filename = path.join(__dirname,'./permissions/permissions.ign.json');
let permissionsDB = JSON.parse(fs.readFileSync(filename));

const publicCommands = [require('./chatting'),require('./ftbTracker'),require('./imageSearch'),require('./polls')];
const adminCommands = [];

const adminRoleID = `714862931652903032`;

module.exports = {
    init: (client) => {

        const pubCommandsStr = publicCommands.reduce((acc, module) => {
            return acc.concat(module.commands);
        }, []);

        const adminCommandsStr = adminCommands.reduce((acc, module) => {
            return acc.concat(module.commands);
        }, []);

        client.on('message', msg => {
            if (msg.author.id != client.user.id) {
                publicCommands.forEach((module) => {
                    module.func(msg);
                });

                const isAdmin = msg.guild.roles.cache.get(adminRoleID).members.has(msg.author.id);

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
    }
}