export const idRegex = /<@!?\d+>/;
export const wait = (timeToDelay: number): Promise<NodeJS.Timeout> => new Promise((resolve) => setTimeout(resolve, timeToDelay));
export const adminId = '236735072051527683';
export const wordleBotId = '1211781489931452447'
export const wordleDayAnchor = {
	date: '2026-07-01',
	number: 1838
}