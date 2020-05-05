const fs = require('fs');
path = require('path');

const filename = path.join(__dirname,'ftbDatabase.ign.json');
let ftbDatabase = JSON.parse(fs.readFileSync(filename));

commands = [
    {
        message: '!ftb',
        info: 'This command interfaces with the For The Boys point tracker. Type just the command to display the current point standings, or you can use the format \"!ftb (pointChange) (@user) to add or subtract a user\'s FTB points'
    }
]

module.exports = {
    commands,
    func: (client) => {
        client.on('message', (msg) => {
            if (msg.content.includes('!ftb') && msg.author.username !== "Boofle") {
                msgParts = msg.content.trim().split(/\s+/);
                if (msgParts.length === 1) {
                    msg.channel.send(Object.entries(ftbDatabase).reduce((accMsg, ftbEntry) => {
                        let user = msg.guild.members.cache.get(ftbEntry[0]);
                        return accMsg += `${user.displayName}: ${ftbEntry[1]}\n`;
                    }, "FTB STANDINGS:\n"))
                }
                else if (msgParts.length === 3 && !Number.isNaN(parseInt(msgParts[1])) && /<@!?\d+>/.test(msgParts[2])) {
                    const id = /\d+/.exec(msgParts[2])[0];
                    let user = null;
                    try {
                        user = msg.guild.members.cache.get(id);
                    } catch (e) {
                        console.error(e)
                    }
                    if (Object.keys(ftbDatabase).includes(id)) {
                        ftbDatabase[id] += parseInt(msgParts[1]);
                        msg.channel.send(`${user.displayName} now has ${ftbDatabase[id]} FTB points.`)
                    }
                    else {
                        ftbDatabase[id] = parseInt(msgParts[1]);
                        msg.channel.send(`User ${user.displayName} has now been created, starting with ${ftbDatabase[id]} FTB points.`);
                    }
                }
                else {
                    msg.channel.send("Sorry, that isn't a valid format for this command.\nThe correct format is \"!ftb (pointChange) (@user)\", or simply \"!ftb\" to display current standings.")
                }
            }
            fs.writeFileSync(filename, JSON.stringify(ftbDatabase));
        })
    }
}