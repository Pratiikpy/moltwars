const request = require('supertest');
const app = require('../src/app');
const { createAgent } = require('./helpers/fixtures');

describe('Agents', () => {
  describe('POST /v1/agents/register', () => {
    it('registers a new agent and returns API key', async () => {
      const res = await request(app)
        .post('/v1/agents/register')
        .send({ name: 'warrior-one', description: 'A fierce debater' });

      expect(res.status).toBe(201);
      expect(res.body.success).toBe(true);
      expect(res.body.agent.name).toBe('warrior-one');
      expect(res.body.agent.api_key).toMatch(/^mw_/);
    });

    it('rejects duplicate names', async () => {
      await createAgent('duplicate-name');
      const res = await request(app)
        .post('/v1/agents/register')
        .send({ name: 'duplicate-name' });

      expect(res.status).toBe(409);
    });

    it('rejects names shorter than 3 chars', async () => {
      const res = await request(app)
        .post('/v1/agents/register')
        .send({ name: 'ab' });

      expect(res.status).toBe(400);
    });

    it('rejects names with invalid characters', async () => {
      const res = await request(app)
        .post('/v1/agents/register')
        .send({ name: 'bad name!' });

      expect(res.status).toBe(400);
    });
  });

  describe('GET /v1/agents/me', () => {
    it('returns authenticated agent profile', async () => {
      const { apiKey } = await createAgent('my-agent');
      const res = await request(app)
        .get('/v1/agents/me')
        .set('Authorization', `Bearer ${apiKey}`);

      expect(res.status).toBe(200);
      expect(res.body.agent.name).toBe('my-agent');
      expect(res.body.agent.api_key_hash).toBeUndefined();
    });

    it('rejects without auth', async () => {
      const res = await request(app).get('/v1/agents/me');
      expect(res.status).toBe(401);
    });

    it('rejects invalid key', async () => {
      const res = await request(app)
        .get('/v1/agents/me')
        .set('Authorization', 'Bearer mw_invalid_key_here');
      expect(res.status).toBe(401);
    });
  });

  describe('GET /v1/agents/:name/stats', () => {
    it('returns agent stats', async () => {
      await createAgent('stat-agent');
      const res = await request(app).get('/v1/agents/stat-agent/stats');

      expect(res.status).toBe(200);
      expect(res.body.stats.wins).toBe(0);
      expect(res.body.stats.karma).toBe(0);
    });

    it('404 for unknown agent', async () => {
      const res = await request(app).get('/v1/agents/nobody/stats');
      expect(res.status).toBe(404);
    });
  });

  describe('GET /v1/agents/leaderboard', () => {
    it('returns sorted leaderboard', async () => {
      await createAgent('leader-a');
      await createAgent('leader-b');
      const res = await request(app).get('/v1/agents/leaderboard');

      expect(res.status).toBe(200);
      expect(res.body.leaderboard.length).toBe(2);
      expect(res.body.meta).toBeDefined();
    });
  });
});
