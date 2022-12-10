import { Client, Intents } from 'discord.js';
import { init } from './functions';
import { loginTokens } from './secureConstants.ign';

const client = new Client({
	intents: [
		Intents.FLAGS.GUILDS,
		Intents.FLAGS.GUILD_MEMBERS,
		Intents.FLAGS.GUILD_MESSAGES,
		Intents.FLAGS.DIRECT_MESSAGES,
		Intents.FLAGS.GUILD_MESSAGE_REACTIONS
	]
});

init(client);

client.login(loginTokens[process.argv[2]]);