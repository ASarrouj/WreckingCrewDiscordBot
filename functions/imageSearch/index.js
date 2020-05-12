const {MessageAttachment} = require('discord.js')
const imageSearch = require('image-search-google');
const google = new imageSearch('006750375323684879005:suqbjlmbbdh', 'AIzaSyD0a61XJErUdof14CNo6xan_f5jc4zu9hw');
const options = {safe:true};

commands = [
    {
        message: '!showMe',
        info: 'This command will Google search whatever comes after the \"!showMe\". Boofle will return the first image result of the search'
    }
]

module.exports = {
    commands,
    func: async (msg) => {
        if (msg.content.includes('!showMe') && msg.author.username !== "Boofle") {
            const regexMatch = /(?<=!showMe ).+/.exec(msg.content);
            if (regexMatch !== null) {
                const searchQuery = regexMatch[0];
                try {
                    const [result] = await google.search(searchQuery, options);
                    const attachment = new MessageAttachment(result.url);
                    msg.channel.send(attachment);
                }
                catch(e){
                    msg.channel.send('Sorry, something went wrong with that search. Amir will look into it');
                    console.log(e);
                }
            }
            else{
                msg.channel.send('You need to include a term to actually search');
            }
        }
    }
}