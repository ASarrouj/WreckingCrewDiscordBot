const Discord = require('discord.js');
const functions = require('./functions');
const tokens = require('./token.ign.js');

for (let [server,token] of Object.entries(tokens)) {
    let intents = new Discord.Intents(Discord.Intents.ALL);
    intents.remove('GUILD_PRESENCES');
    const client = new Discord.Client({ws: {intents}});
    
    functions.init(client);
    
    client.login(token);
};