module.exports = {
	idRegex: /<@!?\d+>/,
	wait: (timeToDelay) => new Promise((resolve) => setTimeout(resolve, timeToDelay))
};