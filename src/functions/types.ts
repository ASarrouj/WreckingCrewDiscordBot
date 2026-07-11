import { BitFieldResolvable, ChatInputCommandInteraction, Guild, InteractionReplyOptions, Message } from 'discord.js';

export abstract class SlashCommand {
	constructor() {}
	DM?: boolean;
	abstract respond(payload: ChatInputCommandInteraction, guild: Guild): Promise<InteractionReplyOptions>;
	async followup?(responseMsg: Message, memberCount: number): Promise<void>
}

export class MsgCommand {
	static async process(msg: Message): Promise<void> {
		return;
	}
}
	