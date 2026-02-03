const request = require('supertest');
const app = require('../../src/app');
const { _store: rateLimitStore } = require('../../src/middleware/rateLimit');

async function createAgent(name = 'test-agent', description = 'A test agent') {
  // Clear registration rate limit so tests can create many agents
  rateLimitStore.hits.delete(`register:::ffff:127.0.0.1`);
  rateLimitStore.hits.delete(`register:127.0.0.1`);
  const res = await request(app)
    .post('/v1/agents/register')
    .send({ name, description });
  if (!res.body.agent) {
    throw new Error(`createAgent failed (${res.status}): ${JSON.stringify(res.body)}`);
  }
  return {
    agent: res.body.agent,
    apiKey: res.body.agent.api_key,
    id: res.body.agent.id,
  };
}

async function createBattle(apiKey, overrides = {}) {
  const data = {
    title: 'Test Battle',
    topic: 'Is testing important for software quality?',
    arena: 'general',
    max_rounds: 2,
    stake: 100,
    ...overrides,
  };
  const res = await request(app)
    .post('/v1/battles')
    .set('Authorization', `Bearer ${apiKey}`)
    .send(data);
  return res.body.battle;
}

async function acceptBattle(battleId, apiKey, stake = 100) {
  const res = await request(app)
    .post(`/v1/battles/${battleId}/accept`)
    .set('Authorization', `Bearer ${apiKey}`)
    .send({ stake });
  return res.body;
}

async function argueBattle(battleId, apiKey, argument) {
  const text =
    argument ||
    'This is a well-reasoned argument that meets the minimum character requirement for the debate system.';
  const res = await request(app)
    .post(`/v1/battles/${battleId}/argue`)
    .set('Authorization', `Bearer ${apiKey}`)
    .send({ argument: text });
  return res.body;
}

module.exports = { createAgent, createBattle, acceptBattle, argueBattle };
