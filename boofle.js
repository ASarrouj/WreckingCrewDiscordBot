const Discord = require('discord.js');
const functions = require('./functions');
const tokens = require('./token.ign.js');

for (let [server,token] of Object.entries(tokens)) {
    const client = new Discord.Client();
    client.on('ready', () => {
        console.log(`Bot is online on server ${server}`);
    })
    
    functions.init(client);
    
    client.login(token);
};