import { Message } from "discord.js";
import { idRegex } from "../../helpers";

export class ArchiveContent {

	public url: string;
	public caption: string;
	public twitterCaption: string; // Sanitizes Discord Server Names

	constructor(msg: Message) {
		this.url = msg.attachments.first()?.url || msg.embeds[0]?.url!;
		this.caption = msg.content.split(this.url)[0]?.trim() || '';
		this.twitterCaption = this.caption.replace(idRegex, (userId) => {
			return msg.guild?.members.cache.get(/\d+/.exec(userId)![0])?.displayName!;
		});
	}

	public joinStrings = () => {
		return this.caption ? `${this.caption} ${this.url}` : this.url;
	}
}