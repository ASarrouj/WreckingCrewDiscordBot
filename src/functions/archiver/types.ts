import { Message } from "discord.js";

export class ArchiveContent {

	public url: string;
	public caption: string;

	constructor(msg: Message) {
		this.url = msg.attachments.first()?.url || msg.embeds[0]?.url!;
		this.caption = msg.content.split(this.url)[0]?.trim() || '';
	}

	public joinStrings = () => {
		return this.caption ? `${this.caption} ${this.url}` : this.url;
	}
}