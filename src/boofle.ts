import { Client, Intents } from 'discord.js';
import { init } from './functions';
import { loginToken } from './secureConstants.ign';

const intents = [
	Intents.FLAGS.GUILD_MEMBERS,
	Intents.FLAGS.GUILD_MESSAGES,
	Intents.FLAGS.DIRECT_MESSAGES,
	Intents.FLAGS.GUILD_MESSAGE_REACTIONS
];
const client = new Client( { intents } );

init(client);

client.login(loginToken);