const listeners = [
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
]
module.exports = (client) => {
    client.on('message', msg => {
        listeners.forEach((listener) => {
            if (msg.content.toLowerCase() === listener.message.toLowerCase()){
                msg.channel.send(listener.reply)
            }
        })

        if (msg.content === '!help'){
            msg.channel.send(listeners.reduce((accMsg, listener) => {
                return accMsg += `'${listener.message}': ${listener.info}\n`;
            }, "Commands:\n"))
        }
    })
}