const puppeteer = require('puppeteer');

commands = [
    {
        message: '!showMe',
        info: 'This command will Google search whatever comes after the \"!showMe\". Boofle will return the first image result of the search'
    }
]

module.exports = {
    commands,
    func: async (msg) => {
        if (msg.content.includes('!showMe') && msg.author.username !== "Boofle") {
            const regexMatch = /(?<=!showMe ).+/.exec(msg.content);
            if (regexMatch !== null) {
                const searchQuery = regexMatch[0];
                const browser = await puppeteer.launch({
                    headless: false
                });
                const page = await browser.newPage();
                await page.goto('https://www.google.com/imghp?hl=en');
                const searchXpath = "//input[@title=\"Search\"]"

                const searchBar = await page.waitForXPath(searchXpath, {
                    timeout: 10000,
                });
                await searchBar.type(searchQuery);

                const submitXpath = "//button[@type=\"submit\"]";
                const submitButton = await page.waitForXPath(submitXpath, {
                    timeout: 10000,
                });
                await submitButton.click();

                await page.waitForNavigation();

                const firstImgXpath = "//div[@id=\"islrg\"]//img[1]";
                const firstImage = await page.waitForXPath(firstImgXpath, {
                    timeout: 10000,
                })

                const property = await firstImage.getProperty('src');
                const link = await property._remoteObject.value;

                msg.channel.send(`[This is what I found](${link})`);
            }
            else{

            }
            await browser.close();
        }
    }
}