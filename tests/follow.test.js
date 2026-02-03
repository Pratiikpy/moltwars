const request = require('supertest');
const app = require('../src/app');
const { createAgent } = require('./helpers/fixtures');

describe('Follows', () => {
  let agent1, agent2, agent3;

  beforeEach(async () => {
    agent1 = await createAgent('follow-agent-1');
    agent2 = await createAgent('follow-agent-2');
    agent3 = await createAgent('follow-agent-3');
  });

  describe('POST /v1/agents/:name/follow', () => {
    it('follows an agent successfully', async () => {
      const res = await request(app)
        .post(`/v1/agents/${agent2.agent.name}/follow`)
        .set('Authorization', `Bearer ${agent1.apiKey}`);

      expect(res.status).toBe(201);
      expect(res.body.success).toBe(true);
      expect(res.body.message).toContain('Now following');
    });

    it('updates follower and following counts', async () => {
      await request(app)
        .post(`/v1/agents/${agent2.agent.name}/follow`)
        .set('Authorization', `Bearer ${agent1.apiKey}`);

      // Check agent2 has a follower
      const res2 = await request(app).get(`/v1/agents/${agent2.agent.name}/profile`);
      expect(res2.body.agent.follower_count).toBe(1);

      // Check agent1 is following
      const res1 = await request(app)
        .get('/v1/agents/me')
        .set('Authorization', `Bearer ${agent1.apiKey}`);
      expect(res1.body.agent.following_count).toBe(1);
    });

    it('rejects following yourself', async () => {
      const res = await request(app)
        .post(`/v1/agents/${agent1.agent.name}/follow`)
        .set('Authorization', `Bearer ${agent1.apiKey}`);

      expect(res.status).toBe(400);
      expect(res.body.success).toBe(false);
    });

    it('rejects duplicate follows', async () => {
      await request(app)
        .post(`/v1/agents/${agent2.agent.name}/follow`)
        .set('Authorization', `Bearer ${agent1.apiKey}`);

      const res = await request(app)
        .post(`/v1/agents/${agent2.agent.name}/follow`)
        .set('Authorization', `Bearer ${agent1.apiKey}`);

      expect(res.status).toBe(409);
    });

    it('returns 404 for non-existent agent', async () => {
      const res = await request(app)
        .post('/v1/agents/non-existent-agent/follow')
        .set('Authorization', `Bearer ${agent1.apiKey}`);

      expect(res.status).toBe(404);
    });

    it('requires authentication', async () => {
      const res = await request(app)
        .post(`/v1/agents/${agent2.agent.name}/follow`);

      expect(res.status).toBe(401);
    });
  });

  describe('DELETE /v1/agents/:name/follow', () => {
    it('unfollows an agent successfully', async () => {
      // First follow
      await request(app)
        .post(`/v1/agents/${agent2.agent.name}/follow`)
        .set('Authorization', `Bearer ${agent1.apiKey}`);

      // Then unfollow
      const res = await request(app)
        .delete(`/v1/agents/${agent2.agent.name}/follow`)
        .set('Authorization', `Bearer ${agent1.apiKey}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.message).toContain('Unfollowed');
    });

    it('decrements counts on unfollow', async () => {
      await request(app)
        .post(`/v1/agents/${agent2.agent.name}/follow`)
        .set('Authorization', `Bearer ${agent1.apiKey}`);

      await request(app)
        .delete(`/v1/agents/${agent2.agent.name}/follow`)
        .set('Authorization', `Bearer ${agent1.apiKey}`);

      const res2 = await request(app).get(`/v1/agents/${agent2.agent.name}/profile`);
      expect(res2.body.agent.follower_count).toBe(0);
    });

    it('returns error when not following', async () => {
      const res = await request(app)
        .delete(`/v1/agents/${agent2.agent.name}/follow`)
        .set('Authorization', `Bearer ${agent1.apiKey}`);

      expect(res.status).toBe(404);
    });
  });

  describe('GET /v1/agents/:name/followers', () => {
    it('returns list of followers', async () => {
      await request(app)
        .post(`/v1/agents/${agent1.agent.name}/follow`)
        .set('Authorization', `Bearer ${agent2.apiKey}`);

      await request(app)
        .post(`/v1/agents/${agent1.agent.name}/follow`)
        .set('Authorization', `Bearer ${agent3.apiKey}`);

      const res = await request(app).get(`/v1/agents/${agent1.agent.name}/followers`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.followers).toHaveLength(2);
      expect(res.body.meta.total).toBe(2);

      const followerNames = res.body.followers.map(f => f.name);
      expect(followerNames).toContain(agent2.agent.name);
      expect(followerNames).toContain(agent3.agent.name);
    });

    it('supports pagination', async () => {
      await request(app)
        .post(`/v1/agents/${agent1.agent.name}/follow`)
        .set('Authorization', `Bearer ${agent2.apiKey}`);

      await request(app)
        .post(`/v1/agents/${agent1.agent.name}/follow`)
        .set('Authorization', `Bearer ${agent3.apiKey}`);

      const res = await request(app).get(`/v1/agents/${agent1.agent.name}/followers?limit=1`);

      expect(res.body.followers).toHaveLength(1);
      expect(res.body.meta.total).toBe(2);
      expect(res.body.meta.hasMore).toBe(true);
    });
  });

  describe('GET /v1/agents/:name/following', () => {
    it('returns list of following', async () => {
      await request(app)
        .post(`/v1/agents/${agent2.agent.name}/follow`)
        .set('Authorization', `Bearer ${agent1.apiKey}`);

      await request(app)
        .post(`/v1/agents/${agent3.agent.name}/follow`)
        .set('Authorization', `Bearer ${agent1.apiKey}`);

      const res = await request(app).get(`/v1/agents/${agent1.agent.name}/following`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.following).toHaveLength(2);

      const followingNames = res.body.following.map(f => f.name);
      expect(followingNames).toContain(agent2.agent.name);
      expect(followingNames).toContain(agent3.agent.name);
    });
  });

  describe('GET /v1/agents/me/following', () => {
    it('returns your following list', async () => {
      await request(app)
        .post(`/v1/agents/${agent2.agent.name}/follow`)
        .set('Authorization', `Bearer ${agent1.apiKey}`);

      const res = await request(app)
        .get('/v1/agents/me/following')
        .set('Authorization', `Bearer ${agent1.apiKey}`);

      expect(res.status).toBe(200);
      expect(res.body.following).toHaveLength(1);
      expect(res.body.following[0].name).toBe(agent2.agent.name);
    });

    it('checks if following a specific agent', async () => {
      await request(app)
        .post(`/v1/agents/${agent2.agent.name}/follow`)
        .set('Authorization', `Bearer ${agent1.apiKey}`);

      // Check following
      const res1 = await request(app)
        .get(`/v1/agents/me/following?check=${agent2.agent.name}`)
        .set('Authorization', `Bearer ${agent1.apiKey}`);

      expect(res1.status).toBe(200);
      expect(res1.body.is_following).toBe(true);

      // Check not following
      const res2 = await request(app)
        .get(`/v1/agents/me/following?check=${agent3.agent.name}`)
        .set('Authorization', `Bearer ${agent1.apiKey}`);

      expect(res2.body.is_following).toBe(false);
    });

    it('requires authentication', async () => {
      const res = await request(app).get('/v1/agents/me/following');
      expect(res.status).toBe(401);
    });
  });
});
