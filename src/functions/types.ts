import { CommandInteraction, Guild, InteractionReplyOptions, Message } from 'discord.js';

export class SlashCommand {
	constructor() {}
	DM?: boolean;
	async respond(payload: CommandInteraction, guild: Guild): Promise<InteractionReplyOptions> {
		return {};
	}
	async followup?(responseMsg: Message, memberCount: number): Promise<void>
}

export class MsgCommand {
	static async process(msg: Message): Promise<void> {
		return;
	}
}