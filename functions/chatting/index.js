 const commands = [
    {
        message: 'BOX OF SAND',
        reply: 'GOOD ONE JOE <:boxofsand:672942967966662689>',
        info: 'Drop this one if you want Boofle to recognize true comedy'
    },
    {
        message: 'PAIL OF WATER',
        reply: 'HUHUHUHUHU JOE YOU\'RE KILLING ME MAN <:boxofsand:672942967966662689>',
        info: 'Boofle recognizes this as one of the highest tier jokes, possibly second only to \"BOX OF SAND\"'
    },
    {
        message: 'PEPPERONI',
        reply: 'That wasn\'t funny chas.',
        info: 'Funniest pizza topping in existence'
    }
]
 module.exports = {
    commands,
    func: (client) => {
        client.on('message', msg => {
            commands.forEach((command) => {
                if (msg.content.toLowerCase() === command.message.toLowerCase()) {
                    msg.channel.send(command.reply)
                }
            })
        })
    }
}