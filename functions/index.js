const axios = require('axios');

const slashCommands = [
	...require('./chatting'),
	...require('./ftbTracker'),
	require('./imageSearch'),
	require('./polls'),
	require('./youtube'),
	require('./coinFlip')
];

const msgFunctions = [
	require('./chatFilter'),
	require('./archiver')
];
const editFunctions = [require('./chatFilter')];

const extraGuildInfo = [];

module.exports = {
	/**
	 *
	 * @param {import('discord.js').Client} client
	 */
	init: (client) => {
		client.on('ready', async () => {
			await Promise.all(client.guilds.cache.map(async guild => {
				console.log(`Bot is online on server ${guild.name}`);
				try {
					const members = await guild.members.fetch();
					extraGuildInfo[guild.id] = {
						memberCount: await members.filter(member => {
							return !member.user.bot;
						}).size
					};
				}
				catch (error) {
					console.error(error);
					extraGuildInfo[guild.id] = {
						memberCount: 0,
					};
				}
			}));
		});

		client.on('interactionCreate', async (interaction) => {
			const sentCommand = interaction.commandName.toLowerCase();

			const linkedCommand = slashCommands.find(botCommand => {
				return botCommand.commandName === sentCommand;
			});

			const guild = client.guilds.cache.get(interaction.guildId);

			if (linkedCommand) {
				if (!interaction.user || linkedCommand.DM) {
					await interaction.reply(await linkedCommand.run(interaction, guild));

					// if (linkedCommand.followup) {
					// 	const appId = (await client.application).id;
					// 	const responseMsg = (await axios.get(`https://discord.com/api/v8/webhooks/${appId}/${interaction.token}/messages/@original`)).data;
					// 	const messageObject = client.guilds.cache.first().channels.cache.get(responseMsg.channel_id).messages.cache.get(responseMsg.id);
					// 	messageObject.interactionAuthor = responseMsg.interaction.user;

					// 	linkedCommand.followup(messageObject, extraGuildInfo[interaction.guild_id].memberCount);
					// }
				}
				else {
					await interaction.reply({
						content: 'This command can only be used in server channels.',
						ephemeral: true,
					});
				}
			}
			else {
				await interaction.reply({
					content: 'The logic for this command has not yet been implemented.',
					ephemeral: true,
				});
			}
		});

		client.on('messageCreate', msg => {
			if (msg.author.id != client.user.id) {
				msgFunctions.forEach((module) => {
					module.func(msg, extraGuildInfo[msg.guild.id].memberCount);
				});
			}
		});

		client.on('messageUpdate', (oldMsg, newMsg) => {
			if (oldMsg.author.id != client.user.id) {
				editFunctions.forEach((editFunc) => {
					editFunc.func(newMsg);
				});
			}
		});
	},
};