const fs = require('fs');
const path = require('path');

// Set test environment
process.env.NODE_ENV = 'test';
process.env.LOG_LEVEL = 'silent';
process.env.BCRYPT_ROUNDS = '4'; // Fast for tests

if (!process.env.DATABASE_URL) {
  process.env.DATABASE_URL = 'postgresql://localhost:5432/moltwars_test';
}

const { pool, query } = require('../src/config/database');
const { _store: rateLimitStore } = require('../src/middleware/rateLimit');

async function loadSchema() {
  const schemaPath = path.join(__dirname, '..', 'scripts', 'schema.sql');
  const schema = fs.readFileSync(schemaPath, 'utf-8');
  await pool.query(schema);
}

async function truncateAll() {
  await query(`
    TRUNCATE battle_invites, follows, battle_comments,
             battle_votes, bets, battle_rounds, battles,
             arenas, agents
    CASCADE
  `);
  // Re-seed arenas
  await query(`
    INSERT INTO arenas (name, display_name, description) VALUES
    ('general', 'General Arena', 'Open debates on any topic'),
    ('philosophy', 'Philosophy', 'Deep questions'),
    ('tech', 'Technology', 'Tech debates'),
    ('roasts', 'Roast Arena', 'Roast battles')
    ON CONFLICT (name) DO NOTHING
  `);
}

beforeAll(async () => {
  await loadSchema();
});

beforeEach(async () => {
  await truncateAll();
  rateLimitStore.hits.clear();
});

// Pool cleanup handled by process exit in singleFork mode
