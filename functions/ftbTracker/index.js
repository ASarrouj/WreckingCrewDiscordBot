const fs = require('fs');
path = require('path');

const filename = path.join(__dirname,'ftbDatabase.ign.json');
let ftbDatabase = JSON.parse(fs.readFileSync(filename));

const applyFtbPoints = async (id, pointAmount, channel, displayName) => {
    let user, logMsg = null;
    if (channel){
        try {
            user = channel.guild.members.cache.get(id);
        } catch (e) {
            console.error(e)
        }
    }
    else {
        user = {
            displayName,
        }
    }
    console.log(channel)
    if (Object.keys(ftbDatabase).includes(id)) {
        ftbDatabase[id] += parseInt(pointAmount);
        logMsg = `${user.displayName} now has ${ftbDatabase[id]} FTB points.`;
    }
    else {
        ftbDatabase[id] = parseInt(pointAmount);
        logMsg = `User ${user.displayName} has now been created, starting with ${ftbDatabase[id]} FTB points.`;
    }
    fs.writeFileSync(filename, JSON.stringify(ftbDatabase));
    return logMsg;
}

module.exports = {
    commandName: 'ftb',
    run: async (payload, guild) => {        
        const subCommandOption = payload.data.options[0];

        if (subCommandOption.name === 'list'){
            return {
                content: Object.entries(ftbDatabase).reduce((accMsg, ftbEntry) => {
                    try {
                        let user = guild.members.cache.get(ftbEntry[0]);
                        return accMsg += `${user.displayName}: ${ftbEntry[1]}\n`;
                    }
                    catch (e) {
                        return accMsg;
                    }
                }, "FTB STANDINGS:\n"),
            }
        }
        else if (subCommandOption.name === 'edit'){
            const userId = subCommandOption.options.find(option => {
                return option.name == 'user';
            }).value;
            const pointAmt = subCommandOption.options.find(option => {
                return option.name == 'points';
            }).value;

            if (pointAmt < -20 || pointAmt > 20){
                return {
                    content: "Point values must be between -20 and +20.",
                    flags: 64, // Means only sender can see this
                };
            }
            if (pointAmt === 0){
                return {
                    content: "Point value cannot be 0.",
                    flags: 64, // Means only sender can see this
                };
            }

            const feedbackMessage = await applyFtbPoints(userId, pointAmt, null, guild.members.cache.get(userId).displayName);

            return {
                content: feedbackMessage,
            };
        }
    },
    applyFtbPoints,
}