export const idRegex = /<@!?\d+>/;
export const wait = (timeToDelay: number): Promise<NodeJS.Timeout> => new Promise((resolve) => setTimeout(resolve, timeToDelay));