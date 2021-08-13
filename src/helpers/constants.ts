export const idRegex = /<@!?\d+>/;
export const wait = (timeToDelay: number) => new Promise((resolve) => setTimeout(resolve, timeToDelay))