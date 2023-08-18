import pg from 'pg';
import { dbConfig } from './config.ign';

const { Pool } = pg;

const pool = new Pool(dbConfig);

pool.on('error', (err, client) => {
	console.error('Error:', err);
});

const insQueryHelper = (obj: {[key: string]: string | number | boolean | null }) => {
	return {
		keyStr: Object.keys(obj).join(', '),
		valStr: Object.values(obj).join(' ,')
	};
};

export {
	pool,
	insQueryHelper
};