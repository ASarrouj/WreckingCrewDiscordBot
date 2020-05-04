const functions = [require('./chatting'),require('./ftbTracker')];
module.exports = {
    init: (client) => {
        functions.forEach((module) => {
            module.func(client);
        })
        
        const commands = functions.reduce((acc, module) => {
            acc.push(module.commands)
        }, [])

        client.on('message', msg => {
            if (msg.content === '!help') {
                msg.channel.send(commands.reduce((accMsg, command) => {
                    return accMsg += `'${command.message}': ${command.info}\n`;
                }, "messages:\n"))
            }
        })
    }
}