import { SlashCommand } from '../../types';

export class PailOfWaterCommand extends SlashCommand {
	static commandName = 'pailofwater';

	async respond() {
		return {
			content: 'HUHUHUHUHU JOE YOU\'RE KILLING ME MAN <:boxofsand:672942967966662689>',
		};
	}
}