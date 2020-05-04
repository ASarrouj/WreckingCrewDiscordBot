const functions = [require('./chatting'),require('./ftbTracker')];
module.exports = {
    init: (client) => {
        functions.forEach((module) => {
            module.func(client);
        })
        
        const commands = functions.reduce((acc, module) => {
            return acc.concat(module.commands);
        }, [])

        client.on('message', msg => {
            if (msg.content === '!help') {
                msg.channel.send(commands.reduce((accMsg, command) => {
                    return accMsg += `'${command.message}': ${command.info}\n`;
                }, "Commands:\n"))
            }
        })
    }
}