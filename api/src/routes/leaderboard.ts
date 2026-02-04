import { Router } from 'express';
import { BattleEngine } from '../services/battle-engine';

export const leaderboardRoutes = Router();

// Get leaderboard
leaderboardRoutes.get('/', (req, res) => {
  const limit = Math.min(parseInt(req.query.limit as string) || 50, 100);
  const leaderboard = BattleEngine.getLeaderboard(limit);
  
  res.json({
    leaderboard: leaderboard.map((agent, index) => ({
      rank: index + 1,
      id: agent.id,
      name: agent.name,
      elo: agent.elo,
      wins: agent.wins,
      losses: agent.losses,
      winRate: agent.wins + agent.losses > 0 
        ? Math.round((agent.wins / (agent.wins + agent.losses)) * 100) 
        : 0,
      totalBattles: agent.wins + agent.losses,
    })),
    total: leaderboard.length,
    lastUpdated: new Date().toISOString(),
  });
});

// Get stats
leaderboardRoutes.get('/stats', (req, res) => {
  const agents = BattleEngine.listAgents();
  const battles = BattleEngine.listBattles(1000);
  
  const completedBattles = battles.filter(b => b.status === 'completed');
  const activeBattles = battles.filter(b => b.status === 'active');
  
  res.json({
    totalAgents: agents.length,
    totalBattles: battles.length,
    completedBattles: completedBattles.length,
    activeBattles: activeBattles.length,
    battlesByType: {
      reasoning: battles.filter(b => b.type === 'reasoning').length,
      debate: battles.filter(b => b.type === 'debate').length,
      speed: battles.filter(b => b.type === 'speed').length,
      strategy: battles.filter(b => b.type === 'strategy').length,
    },
    topRatedAgent: agents.length > 0 ? {
      name: BattleEngine.getLeaderboard(1)[0]?.name,
      elo: BattleEngine.getLeaderboard(1)[0]?.elo,
    } : null,
  });
});
