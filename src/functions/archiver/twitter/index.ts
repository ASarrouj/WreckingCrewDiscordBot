import axios from 'axios';
import oauth1a from 'oauth-1.0a';
import { createHmac } from 'node:crypto';
import FormData from 'form-data';
import { ArchiveContent } from '../types';
import { twitterApiCreds as creds } from '../../../secureConstants.ign';
import { wait } from '../../../helpers';
import { MessageAttachment } from 'discord.js';

const tweetIdRegex = /(?<=status\/)\d+/;
const apiUrl = 'https://api.twitter.com/2/';
const MAX_IMAGE_SIZE_IN_BYTES = 5242880; // 5MB
const MAX_GIF_SIZE_IN_BYTES = 15728640; // 15MB
const MAX_VIDEO_SIZE_IN_BYTES = 536870912; // 512MB
const MAX_CHUNK_SIZE = 102400; // 100KB
const SEGMENT_NUM = 30;

export async function postMemeToTwitter(content: ArchiveContent) {
	if (content.url?.includes('twitter.com') && content.url.includes('/status')) { // Retweet or Quote Tweet
		const tweetId = tweetIdRegex.exec(content.url)![0];
		let request;

		if (content.caption) {
			request = {
				url: `${apiUrl}tweets`,
				body: {
					quote_tweet_id: tweetId,
					text: content.twitterCaption
				},
				method: 'POST'
			};
		}
		else {
			request = {
				url: `${apiUrl}users/${creds.id}/retweets`,
				body: {
					tweet_id: tweetId
				},
				method: 'POST'
			};
		}
		try {
			await axios.post(request.url, request.body, { headers: await getOauthSignatureForRequest(request) });
		}
		catch (e) {
			console.error(`Error with twitter retweeting: ${(e as any).response.data.errors}`);
		}
	}
	else if (content.url && /^https:\/\/((.*\.(jpg|jpeg|png|webp|gif|mp4)$)|(pbs\.twimg\.com.*format=(jpg|jpeg|png|webp|gif|mp4)))/.test(content.url)) { // Upload media and tweet it
		const mediaId = await uploadMediaAndPost(content.url!);
		if (mediaId) {
			await postMediaToTwitter([mediaId], content.twitterCaption);
		}
	}
	else if (/^https:\/\/((.*\.(jpg|jpeg|png|webp|gif|mp4)$)|(pbs\.twimg\.com.*format=(jpg|jpeg|png|webp|gif|mp4)))/.test(content.attachments[0].url)) { // Upload media and tweet it
		const mediaIds = await uploadMedias(content.attachments);
		if (mediaIds.length > 0) {
			await postMediaToTwitter(mediaIds, content.twitterCaption);
		}
	}
	//TODO: remove exclamations and fix ugly branching
	else if (/https:.*(youtube.com\/watch)/.test(content.url!)) {
		const request = {
			url: `${apiUrl}users/${creds.id}/retweets`,
			body: {
				text: content.url
			},
			method: 'POST'
		};
		try {
			await axios.post(request.url, request.body, { headers: await getOauthSignatureForRequest(request) });
		}
		catch (e) {
			console.error(`Error with link posting: ${(e as any).response.data.errors}`);
		}
	}
}

const getOauthSignatureForRequest = async (request: any) => {
	const oauth = new oauth1a({
		consumer: { key: creds.key, secret: creds.secret },
		signature_method: 'HMAC-SHA1',
		hash_function(base_string, key) {
			return createHmac('sha1', key)
				.update(base_string)
				.digest('base64');
		},
	});

	const authorization = oauth.authorize(request, {
		key: creds.accAccessToken,
		secret: creds.accAccessSecret,
	});

	const headers = oauth.toHeader(authorization) as any;
	headers.Accept = 'application/json';
	headers['Content-Type'] = request.body.readable ? `multipart/form-data; boundary=${request.body._boundary}` : 'application/json';
	return headers;
};

const uploadMediaAndPost = async (mediaUrl: string) => {
	let mediaData;
	try {
		mediaData = (await axios.get<string>(mediaUrl, { responseType: 'arraybuffer' })).data;
	}
	catch(e) {
		console.error(e);
		return '';
	}
	const ext = /(((jpg|jpeg|png|webp|gif|mp4)$)|((?<=format=)(jpg|jpeg|png|webp|gif|mp4)))/.exec(mediaUrl)![0].replace('jpeg', 'jpg');
	if (ext == 'mp4') {
		if (mediaData.length > MAX_VIDEO_SIZE_IN_BYTES)
			return '';
	}
	else if (ext == 'gif') {
		if (mediaData.length > MAX_GIF_SIZE_IN_BYTES)
			return '';
	}
	else {
		if (mediaData.length > MAX_IMAGE_SIZE_IN_BYTES)
			return '';
	}

	const url = 'https://upload.twitter.com/1.1/media/upload.json';
	const initBody = new FormData();
	initBody.append('command', 'INIT');
	initBody.append('media_type', ext == 'mp4' ? 'video/mp4' : `image/${ext}`);
	initBody.append('total_bytes', mediaData.length);
	const initRequest = {
		url,
		method: 'POST',
		body: initBody,
	};
	try {
		const { media_id_string } = (await axios.post(initRequest.url, initRequest.body, { headers: await getOauthSignatureForRequest(initRequest) })).data;

		let chunkSize = Math.ceil(mediaData.length / SEGMENT_NUM);
		let segmentIndex = 0, offset = 0, time = 0;
		while (offset < mediaData.length && time < 600000) {
			if (offset + chunkSize > mediaData.length)
				chunkSize = mediaData.length - offset;

			const appendBody = new FormData();
			appendBody.append('command', 'APPEND');
			appendBody.append('media_id', media_id_string);
			appendBody.append('media', mediaData.slice(offset, offset + chunkSize));
			appendBody.append('segment_index', segmentIndex);
			const appendRequest = {
				url,
				method: 'POST',
				body: appendBody,
			};
			try {
				await axios.post(appendRequest.url, appendRequest.body, { headers: await getOauthSignatureForRequest(appendRequest) });
				offset += chunkSize;
				segmentIndex++;
			}
			catch (e) {
				console.error('Error with media upload append\n');
				console.error(e);
			}
			await wait(500);
			time += 500;
		}

		const finalizeBody = new FormData();
		finalizeBody.append('command', 'FINALIZE');
		finalizeBody.append('media_id', media_id_string);
		const finalizeRequest = {
			url,
			method: 'POST',
			body: finalizeBody
		};
		try {
			let { processing_info } = (await axios.post(finalizeRequest.url, finalizeRequest.body, { headers: await getOauthSignatureForRequest(finalizeRequest) })).data;
			let time = 0;
			while (processing_info && time < 60000) {
				const statusBody = new FormData();
				statusBody.append('command', 'STATUS');
				statusBody.append('media_id', media_id_string);
				const statusRequest = {
					url,
					method: 'GET',
					body: statusBody
				};
				try {
					processing_info = (await axios.get(statusRequest.url, { headers: await getOauthSignatureForRequest(statusRequest) })).data.processing_info;
				}
				catch (e) {
					console.error('Error with media upload status\n');
					console.error((e as any).response.data.errors);
				}
				await wait(1000);
				time += 1000;
			}
			if (time < 60000) {
				return media_id_string;
			}
			console.error('Media ran out of time to be uploaded\n');
			return '';
		}
		catch (e) {
			console.error('Error with media upload finalize\n');
			console.error((e as any).response.data.errors);
		}
	}
	catch (e) {
		console.error('Error with media upload init\n');
		console.error((e as any).response.data.errors);
	}
	return '';
};

const uploadMedias = async (attachments: MessageAttachment[]) => {
	const ids: string[] = [];
	await attachments.reduce(async (prev, cur) => {
		await prev;
		const id = await uploadMediaAndPost(cur.url);
		ids.push(id);
	}, Promise.resolve());

	return ids;
};

const postMediaToTwitter = async (mediaIds: string[], caption?: string) => {
	const request = {
		url: `${apiUrl}tweets`,
		body: {
			text: caption,
			media: {
				media_ids: mediaIds
			}
		},
		method: 'POST'
	};

	try {
		await axios.post(request.url, request.body, { headers: await getOauthSignatureForRequest(request) });
	}
	catch (e) {
		console.error('Error with twitter media posting\n');
		console.error((e as any).response.data.errors);
	}
};
