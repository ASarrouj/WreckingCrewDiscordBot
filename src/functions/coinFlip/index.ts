import { SlashCommand } from '../types';


export class CoinFlipCommand extends SlashCommand {
	static commandName = 'coinflip';
	DM = true;
	async respond() {
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