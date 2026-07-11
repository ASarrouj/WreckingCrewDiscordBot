import { AttachmentBuilder, InteractionReplyOptions, Message, MessageFlags } from "discord.js";

export class MessageLogger {
	static async parseMessage(msg: Message): Promise<InteractionReplyOptions> {
		const files = [new AttachmentBuilder(Buffer.from(JSON.stringify(msg, null, 2)), {name: 'msg.json'})]
		if (msg.reference?.messageId){
			const messageReference = await msg.fetchReference()
			files.push(new AttachmentBuilder(Buffer.from(JSON.stringify(messageReference, null, 2)), {name: 'msgReference.json'}))
		}
		return {
			files,
			flags:[MessageFlags.Ephemeral],
		}
	}
}