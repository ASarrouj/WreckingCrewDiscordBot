const msgFunctions = [require('./chatting'),require('./ftbTracker')];
module.exports = {
    init: (client) => {
                
        const commands = msgFunctions.reduce((acc, module) => {
            return acc.concat(module.commands);
        }, [])

        client.on('message', msg => {
            msgFunctions.forEach((module) => {
                module.func(msg);
            })

            if (msg.content === '!help') {
                msg.channel.send(commands.reduce((accMsg, command) => {
                    return accMsg += `'${command.message}': ${command.info}\n`;
                }, "Commands:\n"))
            }
        })
    }
}