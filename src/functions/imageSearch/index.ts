import { ImageSearcher } from './ImageSearcher';
import { googleApiCreds } from '../../secureConstants.ign.js';
import { SlashCommand } from '../types.js';
import { CommandInteraction, InteractionReplyOptions } from 'discord.js';
const engines = googleApiCreds.map((key) => { return new ImageSearcher(key.cx, key.apiKey); });
let engineIndex = 0;

export class ImageSearchCommand implements SlashCommand {
	static commandName = 'showme';
	DM = true;
	async respond(payload: CommandInteraction): Promise<InteractionReplyOptions> {
		let interactionResponse: InteractionReplyOptions;
		const origQuery = payload.options.getString('query', true);
		const gifOnly = payload.options.getBoolean('gif');
		const query = gifOnly ? `${origQuery} gif` : origQuery;

		try {
			const results = (await engines[engineIndex].search({
				q: query,
				safe: 'active',
				searchType: 'image',
			})).data.items || [];
			const firstResult = results.find(result => {
				if (gifOnly) {
					return /^https:.*\.gif$/.test(result.link!);
				}

				return /^https:.*\.(jpg|jpeg|png|svg|pdf|gif|tiff|img)$/.test(result.link!);
			});

			if (firstResult) {
				interactionResponse = {
					embeds: [
						{
							title: origQuery,
							image: {
								url: firstResult.link!
							},
						}
					]
				};
			}
			else {
				interactionResponse = {
					content: `Sorry, no image could be found with the search query \`${query}\`.`,
				};
			}
		}
		catch (e) {
			switch (e.message) {
			case 'Response code 429 (Too Many Requests)':
				interactionResponse = {
					content: `Too many requests have been made to search engine ${engineIndex}. If this issue persists we should look into adding more engines.`
				};
				break;
			default:
				interactionResponse = {
					content: 'Sorry, something went wrong with that search. Amir will look into it'
				};
			}

			console.error(e.message);
		}
		engineIndex++;
		if (engineIndex == engines.length) {
			engineIndex = 0;
		}

		return interactionResponse;
	}
};