module.exports = {
    init: (client) => {
        require('./chatting')(client),
        require('./ftbTracker')(client)
    }
}