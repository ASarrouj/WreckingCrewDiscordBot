import { BoxOfSandCommand, ChasCommand, GoodBotCommand, PailOfWaterCommand } from './chatting';
import { Client, Message } from 'discord.js';
import { FtbResetCommand, FtbShowAndEditCommand } from './ftbTracker';
import { ImageSearchCommand } from './imageSearch';
import { PollCommand } from './polls';
import { YoutubeCommand } from './youtube';
import { CoinFlipCommand } from './coinFlip';
import { ChatFilter } from './chatFilter';
import { Archiver } from './archiver';
import { SlashCommand } from './types';
import { adminId } from '../helpers';
import { StatsCommand, AwardsCommand } from './stats';
import { getServerMemberCount, storeNewServers, storeNewUsers } from '../db/queries';
import { postMemeToTwitter } from './archiver/twitter'
import { ArchiveContent } from './archiver/types';

// eslint-disable-next-line @typescript-eslint/no-extra-parens
const slashCommands = new Map<string, () => SlashCommand>([
	[BoxOfSandCommand.commandName, () => { return new BoxOfSandCommand; }],
	[ChasCommand.commandName, () => { return new ChasCommand; }],
	[GoodBotCommand.commandName, () => { return new GoodBotCommand; }],
	[PailOfWaterCommand.commandName, () => { return new PailOfWaterCommand; }],
	[FtbResetCommand.commandName, () => { return new FtbResetCommand; }],
	[FtbShowAndEditCommand.commandName, () => { return new FtbShowAndEditCommand; }],
	[ImageSearchCommand.commandName, () => { return new ImageSearchCommand; }],
	[PollCommand.commandName, () => { return new PollCommand; }],
	[YoutubeCommand.commandName, () => { return new YoutubeCommand; }],
	[CoinFlipCommand.commandName, () => { return new CoinFlipCommand; }],
	[StatsCommand.commandName, () => { return new StatsCommand; }],
	[AwardsCommand.commandName, () => { return new AwardsCommand; }]
]);

const msgFunctions = [
	ChatFilter.respond,
	Archiver.archive
];
const editFunctions = [ChatFilter.respond];

const extraGuildInfo: { [key: string]: { memberCount: number } } = {};

export function init(client: Client): void {
	client.on('ready', async () => {
		await storeNewServers(client.guilds.cache);
		await Promise.all(client.guilds.cache.map(async guild => {
			try {
				const members = (await guild.members.fetch()).filter(member => !member.user.bot);
				extraGuildInfo[guild.id] = {
					memberCount: members.size
				};
				await storeNewUsers(Array.from(members.values()), guild.id);
			}
			catch (error) {
				console.error(error);
				extraGuildInfo[guild.id] = {
					memberCount: 0,
				};
			}
			await Archiver.reloadArchiveVotes(guild, extraGuildInfo[guild.id].memberCount);
			console.log(`Bot is online on server ${guild.name}`);
		}));
	});

	client.on('interactionCreate', async (interaction) => {
		let interactionName: string;
		if (interaction.isChatInputCommand()) {
			interactionName = interaction.commandName.toLowerCase();

			const linkedCommand = slashCommands.get(interactionName)!();

			if (linkedCommand) {
				if (interaction.member || linkedCommand.DM) {
					try {
						const guild = client.guilds.cache.get(interaction.guildId!)!;
						const interactionResponse = await linkedCommand.respond(interaction, guild);
						await interaction.reply(interactionResponse);

						if (linkedCommand.followup && !interactionResponse.ephemeral) {
							const responseMsg = (await interaction.fetchReply()) as Message;
							linkedCommand.followup(responseMsg, extraGuildInfo[interaction.guildId!].memberCount);
						}
					} catch (e) {
						console.error(`Error with slash command ${interactionName}\n`);
						console.error(e);
						client.users.fetch(adminId).then(user => {
							user.send(`Error with slash command ${interactionName}`);
						});
					}
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
		}
		else if (interaction.isMessageContextMenuCommand()) {
			interactionName = interaction.commandName.toLowerCase();

			try {
				switch (interactionName) {
					case 'create archive': {
						const archiveChannel = interaction.guild?.channels.cache.find(channel => {
							return channel.name == 'the-archives';
						});
						if (archiveChannel) {
							await Archiver.reloadMeme(interaction.targetMessage as Message, archiveChannel, extraGuildInfo[interaction.guildId ?? ''].memberCount);
							await interaction.reply({
								content: `Archiving has been initiated on message id ${interaction.targetMessage.id}.`,
								ephemeral: true
							});
						}
						else {
							await interaction.reply({
								content: 'This server has no archive channel.',
								ephemeral: true
							});
						}
						break;
					}
					case 'tweet meme': {
						const content = new ArchiveContent(interaction.targetMessage)
						await postMemeToTwitter(content);
						await interaction.reply({
							content: 'Meme has been tweeted',
							ephemeral: true
						});
						break;
					}
					default: {
						await interaction.reply({
							content: 'The logic for this context menu has not yet been implemented.',
							ephemeral: true,
						});
					}
				}
			}
			catch (e) {
				console.error(`Error with context menu ${interactionName}\n`);
				console.error(e);
				client.users.fetch(adminId).then(user => {
					user.send(`Error with context menu ${interactionName}`);
				});
			}
		}
	});

	client.on('messageCreate', msg => {
		if (msg.author.id != client.user!.id && msg.guild !== null) {
			try {
				msgFunctions.forEach((msgFunc) => {
					msgFunc(msg, extraGuildInfo[msg.guild!.id].memberCount);
				});
			}
			catch (e) {
				console.error('Error with msg function\n');
				console.error(e);
				client.users.fetch(adminId).then(user => {
					user.send('Error with msg function');
				});
			}
		}
	});

	client.on('messageUpdate', (oldMsg, newMsg) => {
		if (oldMsg.author!.id != client.user!.id) {
			editFunctions.forEach((editFunc) => {
				editFunc(newMsg as Message);
			});
		}
	});

	client.on('messageDelete', async msg => {
		if (msg.author?.id != client.user!.id && msg.guild !== null)
			await Archiver.repostDeletedMeme(msg as Message<boolean>, extraGuildInfo[msg.guild!.id].memberCount);
	});

	client.on('guildMemberAdd', async member => {
		await storeNewUsers([member], member.guild.id);
		extraGuildInfo[member.guild.id].memberCount = (await getServerMemberCount(member.guild.id))[0].count;
	});
}