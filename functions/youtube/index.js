var { google } = require('googleapis');
var youtube = google.youtube('v3');
var engineIndex = 0;
const keys = require('../../searchKeys.ign.js');

module.exports = {
    commandName: 'youtube',
    run: async (payload) => {
        const query = payload.data.options.find(option => {
            return option.name === 'query';
        }).value;

        const searchResponse = await youtube.search.list({
            key: keys[engineIndex].apiKey,
            part: 'snippet',
            q: query,
            maxResults: 3,
        });

        const videoId = searchResponse.data.items[0].id.videoId;
        engineIndex++;
        if (engineIndex == keys.length) {
            engineIndex = 0;
        }

        return {
            content: `https://www.youtube.com/watch?v=${videoId}`,
        };
    }
}