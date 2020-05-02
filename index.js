const Discord = require('discord.js');
const client = new Discord.Client();
const functions = require('./functions');
const token = require('./token.ign.js');

client.on('ready', () => {
    console.log('Bot is online');
})

functions.init(client);

client.login(token);