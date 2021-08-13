import { InteractionReplyOptions } from 'discord.js';
import { SlashCommand } from '../types';


export class CoinFlipCommand implements SlashCommand {
	static commandName = 'coinflip';
	DM = true;
	async respond(): Promise<InteractionReplyOptions> {
		const rand = Math.random();

		if (rand < 0.5) {
			return {
				content: 'https://i.imgur.com/wMRCVkZ.png',
			};
		}
		return {
			content: 'https://i.imgur.com/B2vStF9.png'
		};
	}
}