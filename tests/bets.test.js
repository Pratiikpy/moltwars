const request = require('supertest');
const app = require('../src/app');
const { createAgent, createBattle, acceptBattle } = require('./helpers/fixtures');

describe('Bets', () => {
  let challenger, defender, bettor;
  let battleId;

  beforeEach(async () => {
    challenger = await createAgent('bet-challenger');
    defender = await createAgent('bet-defender');
    bettor = await createAgent('bettor');

    const battle = await createBattle(challenger.apiKey);
    battleId = battle.id;
    await acceptBattle(battleId, defender.apiKey);
  });

  describe('POST /v1/battles/:id/bet', () => {
    it('places a bet with odds', async () => {
      const res = await request(app)
        .post(`/v1/battles/${battleId}/bet`)
        .set('Authorization', `Bearer ${bettor.apiKey}`)
        .send({ predicted_winner: 'bet-challenger', amount: 500 });

      expect(res.status).toBe(200);
      expect(res.body.amount).toBe(500);
      expect(res.body.odds).toBeDefined();
      expect(res.body.potential_payout).toBeDefined();
    });

    it('prevents duplicate bets', async () => {
      await request(app)
        .post(`/v1/battles/${battleId}/bet`)
        .set('Authorization', `Bearer ${bettor.apiKey}`)
        .send({ predicted_winner: 'bet-challenger', amount: 500 });

      const res = await request(app)
        .post(`/v1/battles/${battleId}/bet`)
        .set('Authorization', `Bearer ${bettor.apiKey}`)
        .send({ predicted_winner: 'bet-defender', amount: 300 });

      expect(res.status).toBe(409);
    });

    it('prevents participants from betting', async () => {
      const res = await request(app)
        .post(`/v1/battles/${battleId}/bet`)
        .set('Authorization', `Bearer ${challenger.apiKey}`)
        .send({ predicted_winner: 'bet-challenger', amount: 100 });

      expect(res.status).toBe(400);
    });

    it('rejects invalid predicted winner', async () => {
      const res = await request(app)
        .post(`/v1/battles/${battleId}/bet`)
        .set('Authorization', `Bearer ${bettor.apiKey}`)
        .send({ predicted_winner: 'nobody', amount: 100 });

      expect(res.status).toBe(404);
    });
  });

  describe('GET /v1/battles/:id/odds', () => {
    it('returns current odds', async () => {
      await request(app)
        .post(`/v1/battles/${battleId}/bet`)
        .set('Authorization', `Bearer ${bettor.apiKey}`)
        .send({ predicted_winner: 'bet-challenger', amount: 500 });

      const res = await request(app).get(`/v1/battles/${battleId}/odds`);

      expect(res.status).toBe(200);
      expect(res.body.challenger).toBeDefined();
      expect(res.body.defender).toBeDefined();
      expect(res.body.total_pool).toBe(500);
    });
  });
});
