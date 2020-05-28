const keys = require('./searchKeys.ign.js');
const {MessageAttachment} = require('discord.js');
const imageSearch = require('image-search-google');
const engines = keys.map((key) => {return new imageSearch(key.cx, key.apiKey) });
const options = {safe:true};
var engineIndex = 0;

commands = [
    {
        message: '!showMe',
        info: `This command will Google search whatever comes after the \"!showMe\". Boofle will return the first image result of the search`
    }
]
const command = commands[0].message.toLowerCase();

module.exports = {
    commands,
    func: async (msg) => {
        if (msg.content.startsWith(command)) {
            const regexMatch = new RegExp(`(?<=${command} ).+`).exec(msg.content);
            if (regexMatch !== null) {
                const searchQuery = regexMatch[0];
                try {
                    const results = await engines[engineIndex].search(searchQuery, options);
                    const result = results.find((response) => {
                        return /\.(jpg|jpeg|png|svg|pdf|gif|tiff|img)$/.test(response.url)
                    });
                    console.log(result)
                    const attachment = new MessageAttachment(result.url);
                    msg.channel.send(attachment);
                }
                catch(e){
                    switch (e.message) {
                        case "Response code 429 (Too Many Requests)":
                            msg.channel.send(`Too many requests have been made to search engine ${engineIndex}. If this issue persists we should look into adding more engines.`);
                            break;
                        default:
                            msg.channel.send('Sorry, something went wrong with that search. Amir will look into it');
                    }
                        
                    console.log(e.message);
                }
                engineIndex++;
                if (engineIndex == engines.length){
                    engineIndex = 0;
                }
            }
            else{
                msg.author.send('You need to include a term to actually search');
            }
        }
    }
}