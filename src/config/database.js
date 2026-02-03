const { Pool } = require('pg');
const config = require('./index');
const logger = require('./logger');

const pool = new Pool({
  connectionString: config.databaseUrl,
  ssl: config.isProduction ? { rejectUnauthorized: false } : false,
  max: config.isTest ? 5 : 20,
});

pool.on('error', (err) => {
  logger.error({ err }, 'Unexpected pool error');
});

const SLOW_QUERY_MS = 500;

async function query(text, params) {
  const start = Date.now();
  const result = await pool.query(text, params);
  const duration = Date.now() - start;
  if (duration > SLOW_QUERY_MS) {
    logger.warn({ duration, text: text.slice(0, 120) }, 'Slow query detected');
  }
  return result;
}

async function withTransaction(fn) {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const result = await fn(client);
    await client.query('COMMIT');
    return result;
  } catch (err) {
    await client.query('ROLLBACK');
    throw err;
  } finally {
    client.release();
  }
}

async function close() {
  await pool.end();
}

module.exports = { pool, query, withTransaction, close };
