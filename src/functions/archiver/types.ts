import { Attachment, Message, MessageCreateOptions } from 'discord.js';
import { idRegex } from '../../helpers';

const siteRegexes = [
	/https:.*(fx)?twitter\.com\/.+\/status[^\s]+/,
	/https:.*youtube\.com\/(watch|shorts)[^\s]+/,
	/https:.*youtu\.be\/[^\s]+/,
	/https:.*instagram\.com\/(p|reel)\/[^\s]+/,
	/https:.*reddit\.com\/r\/[a-zA-Z]+\/[^\s]+/,
	/https:.*(i|preview|v)\.redd\.it\/[^\s]+/,
	/https:.*cdn\.discordapp\.com\/attachments\/[^\s]+/,
	/https:.*pbs\.twimg\.com\/media[^\s]+/,
	/https:.*a\.co[^\s]+/,
	/https:.*tiktok\.com\/(.+\/video|t)\/[^\s]+/,
	/https:.*theonion\.com\/[^\s]+/,
	/https:.*i\.kym-cdn\.com\/photos\/images\/[^\s]+/,
	/https:.*clips\.twitch\.tv\/[^\s]+/,
	/https:.*(i\.)?imgur\.com\/[^\s]+/
];

export interface MemeReactionInfo {
	yesVoters: string[],
	noVoters: string[],
	cancelTwitPost: boolean
}

export class ArchiveContent {
	public url?: string;
	public attachments: Attachment[]
	public caption?: string;
	public twitterCaption?: string; // Sanitizes Discord Server Names
	public type: MemeType;

	constructor(msg: Message) {
		console.log(msg)
		if (msg.attachments.size > 0) {
			this.attachments = Array.from(msg.attachments.values());
			this.type = MemeType.Pic;
			this.caption = msg.content || undefined;
		}
		else {
			this.url = getMemeLink(msg.content);
			this.attachments = [];
			this.type = MemeType.Link;
			this.caption = msg.content.split(this.url)[0]?.trim() || undefined;
		}
		this.twitterCaption = this.caption?.replace(idRegex, (userId) => {
			const idNum = /\d+/.exec(userId);
			if (idNum !== null) {
				return msg.guild?.members.cache.get(idNum[0])?.displayName || '';
			}
			return '';
		});
	}

	public createMsg(): MessageCreateOptions {
		if (this.type == MemeType.Link) {
			return { content: this.caption ? `${this.caption} ${this.url}` : this.url };
		}
		return { content: this.caption, files: this.attachments };
	}

	public isMeme() {
		return !!this.url || this.attachments.length > 0;
	}
}

function getMemeLink(msgContent: string) {
	for (let i = 0; i < siteRegexes.length; i++) {
		const match = siteRegexes[i].exec(msgContent);
		if (match)
			return match[0];
	}
	return '';
}

export enum MemeType {
	Pic,
	Link
}
