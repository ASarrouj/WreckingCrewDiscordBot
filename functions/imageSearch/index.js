const keys = require('../../searchKeys.ign.js');
const imageSearch = require('image-search-google');
const engines = keys.map((key) => { return new imageSearch(key.cx, key.apiKey); });
const options = { safe: 'active' };
let engineIndex = 0;

module.exports = {
	commandName: 'showme',
	DM: true,
	run: async (payload) => {
		let interactionResponse = {};
		const origQuery = payload.data.options.find(option => {
			return option.name === 'query';
		}).value;
		const gifOption = payload.data.options.find(option => {
			return option.name === 'gif';
		});
		const gifOnly = gifOption ? gifOption.value : false;
		const query = gifOnly ? `${origQuery} gif` : origQuery;

		try {
			const results = await engines[engineIndex].search(query, options);
			const firstResult = results.find(result => {
				if (gifOnly) {
					return /^https:.*\.gif$/.test(result.url);
				}
				else {
					return /^https:.*\.(jpg|jpeg|png|svg|pdf|gif|tiff|img)$/.test(result.url);
				}
			});

			if (firstResult) {
				interactionResponse = {
					embeds: [
						{
							title: origQuery,
							image: {
								url: firstResult.url
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