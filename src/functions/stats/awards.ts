import { ChatInputCommandInteraction, EmbedBuilder, InteractionReplyOptions } from "discord.js";
import { SlashCommand } from "../types";
import { getMemeStats, getTopDownvotesReceived, getTopUpvotesGiven, getTopUpvotesReceived } from "../../db/queries";

const firstPlaceEmoji = {
	emoji: '🥇',
	text: 'first_place'
}

const secondPlaceEmoji = {
	emoji: '🥈',
	text: 'second_place'
}

const thirdPlaceEmoji = {
	emoji: '🥉',
	text: 'third_place'
}

export class AwardsCommand implements SlashCommand {
	static commandName = 'awards';
	DM = false;
	async respond(payload: ChatInputCommandInteraction): Promise<InteractionReplyOptions> {
		const year = payload.options.getInteger('year');
		if (!year || year < 2022 || year > 2100) {
			return {
				ephemeral: true,
				content: 'Meme data only goes back to 2022 and a reasonable future year'
			}
		}

		const memeData = await getMemeStats(payload.guild?.id, undefined, year!, year!);
		if (memeData.length === 0) {
			return {
				ephemeral: true,
				content: 'No meme data available for this year'
			}
		}
		const sortedByMemeNum = [...memeData].sort((a,b) => {
			if (a.archived > b.archived) return -1
			return 1
		})
		const sortedByAvgMemeNum = [...memeData].sort((a,b) => {
			if ((a.archived / a.posted) > b.archived / b.posted) return -1
			return 1
		})
		const sortedByRejected = [...memeData].sort((a,b) => {
			if (a.rejected > b.rejected) return -1
			return 1
		})
		const sortedByPosted = [...memeData].sort((a,b) => {
			if (a.posted > b.posted) return -1
			return 1
		})
		const topUpvoted = await getTopUpvotesReceived(payload.guild?.id!, year!, year!);
		const topUpvoters = await getTopUpvotesGiven(payload.guild?.id!, year!, year!)
		const topDownvoted = await getTopDownvotesReceived(payload.guild?.id!, year!, year!)

		return {
			embeds: [
				new EmbedBuilder({
					title: `${year} Spammer`,
					fields: sortedByPosted.slice(0,3).map((result, index) => ({
						name: index === 0 ? firstPlaceEmoji.emoji : index === 1 ? secondPlaceEmoji.emoji : thirdPlaceEmoji.emoji,
						value: `${payload.guild?.members.cache.get(result.user_id)?.displayName}: ${result.posted} posted`,
						inline: true
					}))
				}),
				new EmbedBuilder({
					title: `${year} Volume Memer`,
					fields: sortedByMemeNum.slice(0,3).map((result, index) => ({
						name: index === 0 ? firstPlaceEmoji.emoji : index === 1 ? secondPlaceEmoji.emoji : thirdPlaceEmoji.emoji,
						value: `${payload.guild?.members.cache.get(result.user_id)?.displayName}: ${result.archived} archived`,
						inline: true
						
					}))
				}),
				new EmbedBuilder({
					title: `${year} Quality Memer`,
					fields: sortedByAvgMemeNum.slice(0,3).map((result, index) => ({
						name: index === 0 ? firstPlaceEmoji.emoji : index === 1 ? secondPlaceEmoji.emoji : thirdPlaceEmoji.emoji,
						value: `${payload.guild?.members.cache.get(result.user_id)?.displayName}: ${((result.archived / result.posted) * 100).toFixed(3)}% archive rate`,
						inline: true
					}))
				}),
				new EmbedBuilder({
					title: `${year} Most Popular`,
					fields: topUpvoted.map((result, index) => ({
						name: index === 0 ? firstPlaceEmoji.emoji : index === 1 ? secondPlaceEmoji.emoji : thirdPlaceEmoji.emoji,
						value: `${payload.guild?.members.cache.get(result.user_id)?.displayName}: ${result.upvotes_received} upvotes received`,
						inline: true
					}))
				}),
				new EmbedBuilder({
					title: `${year} Painfully Unfunny`,
					fields: topDownvoted.map((result, index) => ({
						name: index === 0 ? firstPlaceEmoji.emoji : index === 1 ? secondPlaceEmoji.emoji : thirdPlaceEmoji.emoji,
						value: `${payload.guild?.members.cache.get(result.user_id)?.displayName}: ${result.downvotes_received} downvotes received`,
						inline: true
					}))
				}),
				new EmbedBuilder({
					title: `${year} Easiest To Impress`,
					fields: topUpvoters.map((result, index) => ({
						name: index === 0 ? firstPlaceEmoji.emoji : index === 1 ? secondPlaceEmoji.emoji : thirdPlaceEmoji.emoji,
						value: `${payload.guild?.members.cache.get(result.user_id)?.displayName}: ${result.upvotes_given} upvotes given`,
						inline: true
					}))
				})
			]
		};
	}
}