import { Client, GatewayIntentBits } from 'discord.js';
import { init } from './functions';
import { loginTokens } from './secureConstants.ign';

const client = new Client({
	intents: [
		GatewayIntentBits.Guilds,
		GatewayIntentBits.GuildMembers,
		GatewayIntentBits.GuildMessages,
		GatewayIntentBits.DirectMessages,
		GatewayIntentBits.GuildMessageReactions
	]
});

init(client);

client.login(loginTokens[process.argv[2]]);