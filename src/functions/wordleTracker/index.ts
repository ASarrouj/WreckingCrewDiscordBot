import { Message } from 'discord.js';
import { MsgCommand } from '../types';
import { wordleBotId, wordleDayAnchor } from '../../helpers';
import dayjs from 'dayjs'
import { getUserIdSubQ, recordWordleResults, WordleResultValues } from '../../db/queries';
import { recognize } from 'node-tesseract-ocr'

export class WordleTracker implements MsgCommand {
	static async record(msg: Message): Promise<void> {
		if (msg.author.id === wordleBotId && msg.content.includes("yesterday's results")) {
			const resultsImage = msg.attachments.first();
			const ocrResult = await recognize(resultsImage?.url ?? '', {lang: 'eng', oem: 1, psm: 3})
			const wordleNumber = /(?<=Wordle No. )\d+/.exec(ocrResult)?.[0]
			if (wordleNumber) {
				const date = dayjs(wordleDayAnchor.date).add(parseInt(wordleNumber) - wordleDayAnchor.number, 'day')
				const wordleResults = msg.content.split('\n').filter(line => line.includes('/6')).reduce((acc, line, index) => {
					const tries = /.(?=\/6)/.exec(line)?.[0] ?? 'N'
					const win = index === 0
					const lineUsers = /(?<=@)[\da-zA-Z]+/.exec(line)
					lineUsers?.forEach(userIdentifier => {
						let userSubQuery = '';
						if (/^\d{10,}/.test(userIdentifier)) {
							userSubQuery = getUserIdSubQ(userIdentifier)
						}
						else {
							msg.guild?.members.fetch().then(members => {
								const discordUserId = members.find(member => member.nickname === userIdentifier)?.id
								if (discordUserId){
									userSubQuery = getUserIdSubQ(discordUserId)
								}
							})
						}
						acc.push({userId: userSubQuery, date: date.format('YYYY-MM-DD'), tries, win, wordleNumber})
					})
					return acc
				}, [] as WordleResultValues[])

			await recordWordleResults(wordleResults)
			}
		}
	}
}