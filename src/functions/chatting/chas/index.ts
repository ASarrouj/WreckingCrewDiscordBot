import { SlashCommand } from '../../types';

export class ChasCommand implements SlashCommand {
	static commandName = 'chas';
	async respond() {
		return {
			content: '<:lmao:547089522790498315> CHAS DOES IT AGAIN <:lmao:547089522790498315>',
		};
	}
}