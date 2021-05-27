module.exports = {
    commandName: 'coinflip',
    run: async () => {
        const rand = Math.random();

        if (rand < 0.5){
            return {
                content: 'https://i.imgur.com/wMRCVkZ.png',
            }
        }
        return {
            content: 'https://i.imgur.com/B2vStF9.png'
        }
    }
}