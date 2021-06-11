let resetFtbPoints = require('./action').resetFtbPoints;

module.exports = {
    commandName: 'ftbreset',
    run: async (payload, guild) => {
        const userId = payload.data.options.find(option => {
            return option.name == 'user';
        }).value;
        const pointAmt = payload.data.options.find(option => {
            return option.name == 'points';
        }).value;
        const user = guild.members.cache.get(userId);

        const feedbackMessage = await resetFtbPoints(user, pointAmt);

        return {
            embeds: [
                {
                    title: feedbackMessage,
                }
            ]
        };
    },
}