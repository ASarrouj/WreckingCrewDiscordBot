const fs = require('fs');
path = require('path');

const filename = path.join(__dirname,'./permissions/permissions.ign.json');
let permissionsDB = JSON.parse(fs.readFileSync(filename));

const publicCommands = [require('./chatting'),require('./ftbTracker'),require('./imageSearch'),require('./polls')];
const adminCommands = [];

const adminRoleID = `714862931652903032`;

module.exports = {
    init: (client) => {
        const commands = publicCommands.reduce((acc, module) => {
            return acc.concat(module.commands);
        }, [])

        client.on('message', msg => {
            publicCommands.forEach((module) => {
                module.func(msg);
            });

            if (msg.guild.roles.cache.get(adminRoleID).members.has(msg.author.id)){
                adminCommands.forEach((module) => {
                    module.func(msg);
                })
            }

            if (msg.content === '!info') {
                msg.channel.send(commands.reduce((accMsg, command) => {
                    return accMsg += `'${command.message}': ${command.info}\n`;
                }, "Commands:\n"))
            }
        })
    }
}