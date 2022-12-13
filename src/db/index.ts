import pg from 'pg';
import { dbConfig } from './config.ign';

const { Pool } = pg;

const pool = new Pool(dbConfig);

pool.on('error', (err, client) => {
	console.error('Error:', err);
});

export {
	pool
};