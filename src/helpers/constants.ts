export const idRegex = /<@!?\d+>/;
export const wait = (timeToDelay: number): Promise<NodeJS.Timeout> => new Promise((resolve) => setTimeout(resolve, timeToDelay));
export const adminId = '236735072051527683';