import { Message } from "discord.js";
import { idRegex } from "../../helpers";

const siteRegexes = [
	/https:.*(fx)?twitter\.com\/.+\/status[^\s]+/,
	/https:.*youtube\.com\/watch[^\s]+/,
	/https:.*youtu\.be\/[^\s]+/,
	/https:.*instagram\.com\/p\/[^\s]+/,
	/https:.*reddit\.com\/r\/[a-z]+\/[^\s]+/,
	/https:.*i\.redd\.it\/[^\s]+/,
	/https:.*cdn\.discordapp\.com\/attachments\/[^\s]+/,
	/https:.*pbs\.twimg\.com\/media[^\s]+/
]

export interface MemeReactionInfo {
	yesCount: number,
	noCount: number,
	votedUsers: string[],
	cancelTwitPost: boolean
}

export class ArchiveContent {

	public url: string;
	public caption: string;
	public twitterCaption: string; // Sanitizes Discord Server Names

	constructor(msg: Message) {
		this.url = msg.attachments.first()?.url || getMemeLink(msg.content);
		this.caption = this.isMeme() ? msg.content.split(this.url)[0]?.trim() : '';
		this.twitterCaption = this.caption.replace(idRegex, (userId) => {
			return msg.guild?.members.cache.get(/\d+/.exec(userId)![0])?.displayName!;
		});
	}

	public joinStrings () {
		return this.caption ? `${this.caption} ${this.url}` : this.url;
	}

	public isMeme() {
		return this.url.length > 0
	}
}

function getMemeLink(msgContent: string) {
	for (var i = 0; i < siteRegexes.length; i++) {
		let match = siteRegexes[i].exec(msgContent)
		if (match)
			return match[0]
	}
	return ''
}
