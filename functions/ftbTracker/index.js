const fs = require('fs');
path = require('path');
const { idRegex } = require('./../../helpers').constants
const ftbRegex = /(?<=!ftb).*/;
const pointRegex = /(?<=\s)[+-]?\d+/

const filename = path.join(__dirname,'ftbDatabase.ign.json');
let ftbDatabase = JSON.parse(fs.readFileSync(filename));

commands = [
    {
        message: '!ftb',
        info: 'This command interfaces with the For The Boys point tracker. Type just the command to display the current point standings, or you can use the format \"!ftb (pointChange) (@user) to add or subtract a user\'s FTB points'
    }
]

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
    commands,
    commandName: 'ftb',
    func: async (msg) => {
        if (msg.content.includes('!ftb')) {
            const ftbMsg = msg.content.match(ftbRegex)[0];
            if (ftbMsg == "") {
                await msg.channel.send(Object.entries(ftbDatabase).reduce((accMsg, ftbEntry) => {
                    try {
                        let user = msg.guild.members.cache.get(ftbEntry[0]);
                        return accMsg += `${user.displayName}: ${ftbEntry[1]}\n`;
                    }
                    catch (e) {
                        return accMsg;
                    }
                }, "FTB STANDINGS:\n"))
                return;
            }

            let id = ftbMsg.match(idRegex);
            let pointAmt = ftbMsg.match(pointRegex);

            if (pointAmt != null && id != null) {
                pointAmt = parseInt(pointAmt[0]);

                if (pointAmt < -20 || pointAmt > 20){
                    await msg.author.send("Point values must be between -20 and +20.")
                    return;
                }

                id = /\d+/.exec(id[0])[0];
                const replyMessage = await applyFtbPoints(id, pointAmt, msg.channel);
                await msg.channel.send(replyMessage);
                return;
            }

            await msg.author.send("Sorry, that isn't a valid format for this command.\nThe correct format is \"!ftb (pointChange) (@user)\", or simply \"!ftb\" to display current standings.")
        }
    },
    run: async (payload, guild) => {        
        const subCommandOption = payload.data.options[0];

        if (subCommandOption.name === 'show'){
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