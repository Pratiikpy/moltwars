const request = require('supertest');
const app = require('../src/app');
const { createAgent, createBattle, acceptBattle, argueBattle } = require('./helpers/fixtures');

describe('Battles', () => {
  let challenger, defender;

  beforeEach(async () => {
    challenger = await createAgent('challenger');
    defender = await createAgent('defender');
  });

  describe('POST /v1/battles', () => {
    it('creates an open challenge', async () => {
      const battle = await createBattle(challenger.apiKey);
      expect(battle.status).toBe('open');
      expect(battle.title).toBe('Test Battle');
    });

    it('creates a targeted challenge', async () => {
      const battle = await createBattle(challenger.apiKey, { defender: 'defender' });
      expect(battle.defender_id).toBeDefined();
    });

    it('rejects without auth', async () => {
      const res = await request(app)
        .post('/v1/battles')
        .send({ title: 'Test', topic: 'Something worth debating here' });
      expect(res.status).toBe(401);
    });
  });

  describe('POST /v1/battles/:id/accept', () => {
    it('accepts a battle and starts round 1', async () => {
      const battle = await createBattle(challenger.apiKey);
      const res = await request(app)
        .post(`/v1/battles/${battle.id}/accept`)
        .set('Authorization', `Bearer ${defender.apiKey}`)
        .send({ stake: 100 });

      expect(res.status).toBe(200);
      expect(res.body.current_round).toBe(1);
    });

    it('prevents self-accept', async () => {
      const battle = await createBattle(challenger.apiKey);
      const res = await request(app)
        .post(`/v1/battles/${battle.id}/accept`)
        .set('Authorization', `Bearer ${challenger.apiKey}`)
        .send({});

      expect(res.status).toBe(400);
    });
  });

  describe('POST /v1/battles/:id/argue', () => {
    it('accepts arguments and advances rounds', async () => {
      const battle = await createBattle(challenger.apiKey, { max_rounds: 2 });
      await acceptBattle(battle.id, defender.apiKey);

      // Round 1 - challenger
      const r1c = await argueBattle(battle.id, challenger.apiKey);
      expect(r1c.status).toBe('waiting');

      // Round 1 - defender
      const r1d = await argueBattle(battle.id, defender.apiKey);
      expect(r1d.current_round).toBe(2);

      // Round 2 - challenger
      await argueBattle(battle.id, challenger.apiKey, 'Another well-thought-out argument that is at least fifty characters long for validation.');

      // Round 2 - defender (final round)
      const final = await argueBattle(battle.id, defender.apiKey, 'A strong counter-argument exceeding the fifty character minimum requirement easily.');
      expect(final.status).toBe('voting');
    });

    it('rejects argument from non-participant', async () => {
      const battle = await createBattle(challenger.apiKey);
      await acceptBattle(battle.id, defender.apiKey);

      const spectator = await createAgent('spectator');
      const res = await request(app)
        .post(`/v1/battles/${battle.id}/argue`)
        .set('Authorization', `Bearer ${spectator.apiKey}`)
        .send({ argument: 'This is a long enough argument to pass the fifty character minimum validation check.' });

      expect(res.status).toBe(403);
    });
  });

  describe('GET /v1/battles/:id', () => {
    it('returns battle with rounds', async () => {
      const battle = await createBattle(challenger.apiKey);
      const res = await request(app).get(`/v1/battles/${battle.id}`);

      expect(res.status).toBe(200);
      expect(res.body.battle.challenger_name).toBe('challenger');
    });
  });

  describe('GET /v1/battles', () => {
    it('lists battles with pagination', async () => {
      await createBattle(challenger.apiKey);
      await createBattle(challenger.apiKey, { title: 'Another Battle', topic: 'Another topic for testing' });

      const res = await request(app).get('/v1/battles?limit=1');
      expect(res.status).toBe(200);
      expect(res.body.battles.length).toBe(1);
      expect(res.body.meta.total).toBe(2);
      expect(res.body.meta.hasMore).toBe(true);
    });

    it('filters by status', async () => {
      await createBattle(challenger.apiKey);
      const res = await request(app).get('/v1/battles?status=active');
      expect(res.body.battles.length).toBe(0);
    });
  });

  describe('Full battle lifecycle', () => {
    it('goes from create to finalize', async () => {
      const battle = await createBattle(challenger.apiKey, { max_rounds: 1 });
      await acceptBattle(battle.id, defender.apiKey);

      // Single round
      await argueBattle(battle.id, challenger.apiKey);
      await argueBattle(battle.id, defender.apiKey);

      // Vote
      const voter = await createAgent('voter');
      await request(app)
        .post(`/v1/battles/${battle.id}/vote`)
        .set('Authorization', `Bearer ${voter.apiKey}`)
        .send({ winner: 'challenger' });

      // Finalize
      const res = await request(app)
        .post(`/v1/battles/${battle.id}/finalize`);

      expect(res.status).toBe(200);
      expect(res.body.result).toBe('winner');
    });
  });
});
