import { Collection, Guild, GuildMember, Message, TextChannel } from 'discord.js';
import { PoolClient } from 'pg';
import { pool, insQueryHelper } from '.';
import { DbChannel, FtbSum, DbMeme, UpvotesReceived, UpvotesGiven, MemeStats } from './types';

export function resetFtbPoints(user: GuildMember, pointAmount: number): string {
	return 'This command is currently disabled.';
}

export async function storeFtbTransaction(receiverId: string, pointAmount: number, memeId?: number, giverId?: string, reason?: string, client?: PoolClient) {
	let passedClient = true;
	if (client === undefined) {
		client = await pool.connect();
		passedClient = false;
	}

	const insStrings = insQueryHelper({
		amount: pointAmount,
		recipient: getUserIdSubQ(receiverId),
		date_created: `'${new Date().toISOString()}'`,
		meme: memeId ?? null,
		benefactor: giverId ? getUserIdSubQ(giverId) : 'null',
		reason: reason ? `'${reason}'` : 'null'
	});

	await client.query(`INSERT INTO transactions (${insStrings.keyStr}) ` +
						`VALUES (${insStrings.valStr})`);

	if (!passedClient)
		client.release();
}

export async function storeMeme(userId: string, msg: Message, pointAmount: number, upvoters: string[], downvoters: string[], memberCount: number) {
	const client = await pool.connect();

	const dbUserId = getUserIdSubQ(userId);
	const { id: channelId } = await getChannel(client, msg.channel as TextChannel);

	const meme = (await client.query<DbMeme>(
		'INSERT INTO memes (msg_id, author, channel, date_created, early, archived, rejected, loved) ' +
		`VALUES('${msg.id}', ${dbUserId}, ${channelId}, '${msg.createdAt.toISOString()}', ${upvoters.length + downvoters.length === memberCount - 1}, ${pointAmount > 0}, ${pointAmount < 0}, ${upvoters.length === memberCount - 1})` +
		'ON CONFLICT (msg_id) DO NOTHING ' +
		'RETURNING id;')).rows[0];

	if (meme !== undefined) {
		if (pointAmount !== 0) {
			await storeFtbTransaction(userId, pointAmount, meme.id, undefined, undefined, client);
		}
		if (upvoters.length > 0) {
			await storeUpvotes(upvoters, meme.id, client);
		}
		if (downvoters.length > 0) {
			await storeDownvotes(downvoters, meme.id, client);
		}
	}
	client.release();
}

export async function storeUpvotes(userIds: string[], meme: number, client?: PoolClient) {
	let passedClient = true;
	if (client === undefined) {
		client = await pool.connect();
		passedClient = false;
	}

	const valQueries = (await Promise.all(userIds.map(async id => {
		return `(${meme}, ${getUserIdSubQ(id)})`;
	}))).join(', ');

	await client.query(
		'INSERT INTO upvotes (meme, "user") ' +
		`VALUES ${valQueries};`);

	if (!passedClient) {
		client.release();
	}
}

export async function storeDownvotes(userIds: string[], meme: number, client?: PoolClient) {
	let passedClient = true;
	if (client === undefined) {
		client = await pool.connect();
		passedClient = false;
	}

	const valQueries = (await Promise.all(userIds.map(async id => {
		return `(${meme}, ${getUserIdSubQ(id)})`;
	}))).join(', ');

	await client.query(
		'INSERT INTO downvotes (meme, "user") ' +
		`VALUES ${valQueries};`);

	if (!passedClient) {
		client.release();
	}
}

export async function storeNewUsers(members: GuildMember[], serverId: string) {
	const client = await pool.connect();
	const userVals = members.map(member => `('${member.id}', '${member.user.username}')`).join(', ');
	const dbUserIds = (await client.query<{id: number}>(
		'WITH ins AS(' +
			'INSERT INTO users (user_id, name) ' +
			`VALUES ${userVals} ` +
			'ON CONFLICT (user_id) DO UPDATE ' +
			'SET user_id = NULL WHERE FALSE ' +
			'RETURNING id' +
		')' +
		'SELECT * FROM ins ' +
		'UNION ALL ' +
		`SELECT id FROM users WHERE user_id IN (${members.map(user => '\'' + user.id + '\'').join(', ')})`
	)).rows;
	const userServerVals = dbUserIds.map(user => `(${user.id}, (SELECT id FROM servers WHERE server_id = '${serverId}'))`).join(', ');

	await client.query(
		'INSERT INTO users_servers ("user", server) ' +
		`VALUES ${userServerVals} ` +
		'ON CONFLICT DO NOTHING'
	);
	client.release();
}

export async function storeNewServers(guilds: Collection<string, Guild>) {
	const userVals = guilds.map(guild => `('${guild.id}', '${guild.name}')`).join(', ');

	await pool.query(
		'WITH ins AS(' +
			'INSERT INTO servers (server_id, name) ' +
			`VALUES ${userVals} ` +
			'ON CONFLICT (server_id) DO UPDATE ' +
			'SET server_id = NULL WHERE FALSE ' +
			'RETURNING id' +
		')' +
		'SELECT * FROM ins ' +
		'UNION ALL ' +
		`SELECT id FROM servers WHERE server_id IN (${guilds.map(guild => '\'' + guild.id + '\'').join(', ')})`
	);
}

export function getUserIdSubQ(userId: string) {
	return `(SELECT id FROM users WHERE user_id = '${userId}' LIMIT 1)`;
}

export async function getChannel(client: PoolClient, channel: TextChannel) {
	return (await client.query<DbChannel>(
		'WITH ins AS (' +
			'INSERT INTO channels (channel_id, server, name) ' +
			`VALUES('${channel.id}', (SELECT id FROM servers WHERE server_id = '${channel.guildId}'), '${channel.name}') ` +
			'ON CONFLICT (channel_id) DO UPDATE ' +
			'SET channel_id = NULL WHERE FALSE ' +
			'RETURNING *' +
		')' +
		'SELECT * FROM ins ' +
		'UNION ALL ' +
		`SELECT * FROM channels WHERE channel_id = '${channel.id}' ` +
		'LIMIT 1;')).rows[0];
}

export async function getFtbSums(fromYear = 2000, toYear = new Date().getUTCFullYear()) {
	return (await pool.query<FtbSum>(
		'SELECT users.user_id, SUM(amount) as total ' +
		'FROM users ' +
		'INNER JOIN transactions ON users.id = transactions.user_id ' +
			`AND transactions.date_created BETWEEN '${fromYear}/01/01' AND '${toYear}/12/31 23:59:59'` +
		'GROUP BY users.id')).rows;
}

export async function getUpvotesGiven(fromYear = 2000, toYear = new Date().getUTCFullYear()) {
	return (await pool.query<UpvotesGiven>(
		'SELECT users.user_id, COUNT(*) as upvotes_given ' +
		'FROM users ' +
		'INNER JOIN upvotes ON users.id = upvotes.user ' +
		'INNER JOIN memes ON upvotes.meme = memes.id' +
			`AND memes.date_created BETWEEN '${fromYear}/01/01' AND '${toYear}/12/31 23:59:59'` +
		'GROUP BY users.id')).rows;
}

export async function getUpvotesReceived(fromYear = 2000, toYear = new Date().getUTCFullYear()) {
	return (await pool.query<UpvotesReceived>(
		'SELECT users.user_id, COUNT(*) as upvotes_received ' +
		'FROM users ' +
		'INNER JOIN memes ON users.id = memes.author ' +
			`AND memes.date_created BETWEEN '${fromYear}/01/01' AND '${toYear}/12/31 23:59:59'` +
		'INNER JOIN upvotes ON upvotes.meme = memes.id' +
		'GROUP BY users.id')).rows;
}

export async function getMemeStats(user?: string, fromYear = 2000, toYear = new Date().getUTCFullYear()) {
	return (await pool.query<MemeStats>(
		'SELECT users.user_id, COUNT(*) ' +
		'GROUP BY users.user_id'
	)).rows;
}

export async function getLastChannelMemeId(channelId: string) {
	return (await pool.query<{msg_id: string}>('SELECT msg_id FROM memes ' +
		`WHERE channel = (SELECT id FROM channels WHERE channel_id = '${channelId}' LIMIT 1) ` +
		'AND early = FALSE ' +
		'ORDER BY date_created DESC LIMIT 1')).rows[0]?.msg_id;
}