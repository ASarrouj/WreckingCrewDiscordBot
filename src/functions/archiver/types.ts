import { Message } from 'discord.js';
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
			const idNum = /\d+/.exec(userId);
			if (idNum !== null) {
				return msg.guild?.members.cache.get(idNum[0])?.displayName || '';
			}
			return '';
		});
	}

	public joinStrings() {
		return this.caption ? `${this.caption} ${this.url}` : this.url;
	}

	public isMeme() {
		return this.url.length > 0;
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
