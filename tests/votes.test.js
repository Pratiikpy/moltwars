const request = require('supertest');
const app = require('../src/app');
const { createAgent, createBattle, acceptBattle, argueBattle } = require('./helpers/fixtures');

describe('Votes', () => {
  let challenger, defender, voter;
  let battleId;

  beforeEach(async () => {
    challenger = await createAgent('vote-challenger');
    defender = await createAgent('vote-defender');
    voter = await createAgent('vote-voter');

    const battle = await createBattle(challenger.apiKey, { max_rounds: 1 });
    battleId = battle.id;
    await acceptBattle(battleId, defender.apiKey);

    // Complete single round to get to voting
    await argueBattle(battleId, challenger.apiKey);
    await argueBattle(battleId, defender.apiKey);
  });

  describe('POST /v1/battles/:id/vote', () => {
    it('records a vote', async () => {
      const res = await request(app)
        .post(`/v1/battles/${battleId}/vote`)
        .set('Authorization', `Bearer ${voter.apiKey}`)
        .send({ winner: 'vote-challenger' });

      expect(res.status).toBe(200);
      expect(res.body.current_results.challenger).toBeGreaterThan(0);
    });

    it('prevents participants from voting', async () => {
      const res = await request(app)
        .post(`/v1/battles/${battleId}/vote`)
        .set('Authorization', `Bearer ${challenger.apiKey}`)
        .send({ winner: 'vote-challenger' });

      expect(res.status).toBe(403);
    });

    it('allows vote switching (upsert)', async () => {
      await request(app)
        .post(`/v1/battles/${battleId}/vote`)
        .set('Authorization', `Bearer ${voter.apiKey}`)
        .send({ winner: 'vote-challenger' });

      const res = await request(app)
        .post(`/v1/battles/${battleId}/vote`)
        .set('Authorization', `Bearer ${voter.apiKey}`)
        .send({ winner: 'vote-defender' });

      expect(res.status).toBe(200);
      expect(res.body.current_results.defender).toBeGreaterThan(0);
    });
  });

  describe('Finalize with votes', () => {
    it('determines winner by weighted votes', async () => {
      await request(app)
        .post(`/v1/battles/${battleId}/vote`)
        .set('Authorization', `Bearer ${voter.apiKey}`)
        .send({ winner: 'vote-defender' });

      const res = await request(app)
        .post(`/v1/battles/${battleId}/finalize`);

      expect(res.status).toBe(200);
      expect(res.body.result).toBe('winner');

      // Check winner stats updated
      const statsRes = await request(app).get('/v1/agents/vote-defender/stats');
      expect(statsRes.body.stats.wins).toBe(1);
    });

    it('handles draw when equal votes', async () => {
      const voter2 = await createAgent('vote-voter2');

      await request(app)
        .post(`/v1/battles/${battleId}/vote`)
        .set('Authorization', `Bearer ${voter.apiKey}`)
        .send({ winner: 'vote-challenger' });

      await request(app)
        .post(`/v1/battles/${battleId}/vote`)
        .set('Authorization', `Bearer ${voter2.apiKey}`)
        .send({ winner: 'vote-defender' });

      const res = await request(app)
        .post(`/v1/battles/${battleId}/finalize`);

      expect(res.status).toBe(200);
      expect(res.body.result).toBe('draw');
    });
  });
});
