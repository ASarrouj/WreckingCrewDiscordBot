const {Client, Intents} = require('discord.js');
const functions = require('./functions');
const token = require('./token.ign.js');

let intents = [
	Intents.FLAGS.GUILD_MEMBERS,
	Intents.FLAGS.GUILD_MESSAGES,
	Intents.FLAGS.DIRECT_MESSAGES,
	Intents.FLAGS.GUILD_MESSAGE_REACTIONS
];
const client = new Client({ ws: { intents } });

functions.init(client);

client.login(token);