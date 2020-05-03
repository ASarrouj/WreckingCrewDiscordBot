const fs = require('fs');

const filename = 'ftbDatabase.json';
let ftbDatabase = JSON.parse(fs.readFileSync(filename))

module.exports = (client) => {
    client.on('message', msg => {
        if (msg.includes('!ftb')){
            msgParts = msg.split("/\s/");
            if (msgParts.length === 1){
                msg.channel.send(Object.entries(ftbDatabase).reduce((accMsg, ftbEntry) => {
                    return accMsg += `'${ftbObj[0]}': ${ftbObj[1]}\n`;
                }, "FTB STANDINGS:\n"))
            }
            else if (msgParts.length === 3 && parseInt(msgParts[1]) !== NaN){
                if (Object.keys(ftbDatabase).includes(msgParts[2])){
                    ftbDatabase[msgParts[2]] += parseInt(msgParts[1]);
                    msg.channel.send(`${msgParts[2]} now has ${ftbDatabase[msgParts[2]]} FTB points.`)
                }
                else{
                    ftbDatabase[msgParts[2]] = parseInt(msgParts[1]);
                    msg.channel.send(`User ${msgParts[2]} has now been created, starting with ${ftbDatabase[msgParts[2]]} FTB points.`);
                }
            }
            else{
                msg.channel.send("Sorry, that isn't a valid format for this command.\nThe correct format is \"!ftb (pointChange) (name)\", or simply \"!ftb\" to display current standings.")
            }
        }
        fs.writeFileSync('filename', JSON.stringify(ftbDatabase));
    })
}