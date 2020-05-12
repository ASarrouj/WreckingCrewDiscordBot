const keys = require('./searchKeys.ign.js');
const {MessageAttachment} = require('discord.js');
const imageSearch = require('image-search-google');
const engines = keys.map((key) => {return new imageSearch(key.cx, key.apiKey) });
const options = {safe:true};
var engineIndex = 0;

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
                    const [result] = await engines[engineIndex].search(searchQuery, options);
                    const attachment = new MessageAttachment(result.url);
                    msg.channel.send(attachment);
                }
                catch(e){
                    msg.channel.send('Sorry, something went wrong with that search. Amir will look into it');
                    console.log(e);
                }
                engineIndex++;
                if (engineIndex == engines.length){
                    engineIndex = 0;
                }
            }
            else{
                msg.channel.send('You need to include a term to actually search');
            }
        }
    }
}