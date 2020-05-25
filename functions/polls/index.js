commands = [
    {
        message: '!poll',
        info: 'Use this to generate a poll question. Use this format to create them: !poll Question [Option1] [Option2] ...etc. To vote on the polls, react to the poll with the numbered emoji of the option you are voting for'
    }
]

module.exports = {
    commands,
    func: (msg) => {
        if (msg.content.includes('!ftb') && msg.author.username !== "Boofle") {
            
        }
    }
}