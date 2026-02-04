import { Router } from 'express';
import { BattleEngine } from '../services/battle-engine';
import { authMiddleware } from '../middleware/auth';

export const agentRoutes = Router();

// Register new agent
agentRoutes.post('/register', (req, res) => {
  try {
    const { name } = req.body;
    
    if (!name || typeof name !== 'string' || name.length < 2 || name.length > 50) {
      return res.status(400).json({ error: 'Name must be 2-50 characters' });
    }
    
    // Check if name is taken
    const existing = BattleEngine.listAgents().find(a => a.name.toLowerCase() === name.toLowerCase());
    if (existing) {
      return res.status(409).json({ error: 'Name already taken' });
    }
    
    const agent = BattleEngine.registerAgent(name);
    
    res.status(201).json({
      agent: {
        id: agent.id,
        name: agent.name,
        elo: agent.elo,
        wins: agent.wins,
        losses: agent.losses,
      },
      apiKey: agent.apiKey, // Only shown once!
      message: 'Welcome to the arena! Save your API key - it is only shown once.',
    });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// Get agent by ID (public)
agentRoutes.get('/:id', (req, res) => {
  const agent = BattleEngine.getAgent(req.params.id);
  
  if (!agent) {
    return res.status(404).json({ error: 'Agent not found' });
  }
  
  res.json({
    id: agent.id,
    name: agent.name,
    elo: agent.elo,
    wins: agent.wins,
    losses: agent.losses,
    winRate: agent.wins + agent.losses > 0 
      ? Math.round((agent.wins / (agent.wins + agent.losses)) * 100) 
      : 0,
    createdAt: agent.createdAt,
  });
});

// Get my profile (authenticated)
agentRoutes.get('/me', authMiddleware, (req, res) => {
  const agent = (req as any).agent;
  
  res.json({
    id: agent.id,
    name: agent.name,
    elo: agent.elo,
    wins: agent.wins,
    losses: agent.losses,
    winRate: agent.wins + agent.losses > 0 
      ? Math.round((agent.wins / (agent.wins + agent.losses)) * 100) 
      : 0,
    createdAt: agent.createdAt,
    // Include recent battles
    recentBattles: BattleEngine.listBattles(100)
      .filter(b => b.challenger.id === agent.id || b.defender.id === agent.id)
      .slice(0, 10)
      .map(b => ({
        id: b.id,
        opponent: b.challenger.id === agent.id ? b.defender.name : b.challenger.name,
        type: b.type,
        result: b.winner?.id === agent.id ? 'win' : b.status === 'completed' ? 'loss' : 'pending',
        createdAt: b.createdAt,
      })),
  });
});

// List all agents
agentRoutes.get('/', (req, res) => {
  const agents = BattleEngine.listAgents().map(a => ({
    id: a.id,
    name: a.name,
    elo: a.elo,
    wins: a.wins,
    losses: a.losses,
  }));
  
  res.json({ agents, total: agents.length });
});
