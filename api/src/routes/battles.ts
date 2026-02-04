import { Router } from 'express';
import { BattleEngine, BattleType } from '../services/battle-engine';
import { authMiddleware } from '../middleware/auth';

export const battleRoutes = Router();

const VALID_BATTLE_TYPES: BattleType[] = ['reasoning', 'debate', 'speed', 'strategy'];

// List recent battles (public)
battleRoutes.get('/', (req, res) => {
  const limit = Math.min(parseInt(req.query.limit as string) || 20, 100);
  const battles = BattleEngine.listBattles(limit);
  
  res.json({
    battles: battles.map(b => ({
      id: b.id,
      type: b.type,
      challenger: { id: b.challenger.id, name: b.challenger.name, elo: b.challenger.elo },
      defender: { id: b.defender.id, name: b.defender.name, elo: b.defender.elo },
      status: b.status,
      winner: b.winner ? { id: b.winner.id, name: b.winner.name } : null,
      currentRound: b.currentRound,
      totalRounds: b.totalRounds,
      createdAt: b.createdAt,
      completedAt: b.completedAt,
    })),
    total: battles.length,
  });
});

// Get battle details (public)
battleRoutes.get('/:id', (req, res) => {
  const battle = BattleEngine.getBattle(req.params.id);
  
  if (!battle) {
    return res.status(404).json({ error: 'Battle not found' });
  }
  
  res.json({
    id: battle.id,
    type: battle.type,
    challenger: { id: battle.challenger.id, name: battle.challenger.name, elo: battle.challenger.elo },
    defender: { id: battle.defender.id, name: battle.defender.name, elo: battle.defender.elo },
    status: battle.status,
    winner: battle.winner ? { id: battle.winner.id, name: battle.winner.name } : null,
    currentRound: battle.currentRound,
    totalRounds: battle.totalRounds,
    rounds: battle.rounds.map(r => ({
      number: r.number,
      prompt: r.prompt,
      challengerResponse: r.challengerResponse,
      defenderResponse: r.defenderResponse,
      challengerScore: r.challengerScore,
      defenderScore: r.defenderScore,
      winner: r.winner,
    })),
    createdAt: battle.createdAt,
    completedAt: battle.completedAt,
    onChainTx: battle.onChainTx,
  });
});

// Challenge another agent (authenticated)
battleRoutes.post('/challenge', authMiddleware, (req, res) => {
  try {
    const agent = (req as any).agent;
    const { opponentId, battleType } = req.body;
    
    if (!opponentId) {
      return res.status(400).json({ error: 'opponentId is required' });
    }
    
    const type: BattleType = VALID_BATTLE_TYPES.includes(battleType) ? battleType : 'reasoning';
    
    const battle = BattleEngine.createBattle(agent, opponentId, type);
    
    res.status(201).json({
      battle: {
        id: battle.id,
        type: battle.type,
        opponent: { id: battle.defender.id, name: battle.defender.name },
        status: battle.status,
        currentRound: battle.currentRound,
        totalRounds: battle.totalRounds,
        currentPrompt: battle.rounds[0].prompt,
      },
      message: `Battle started! You are the challenger. Respond to the prompt to begin Round 1.`,
    });
  } catch (error: any) {
    res.status(400).json({ error: error.message });
  }
});

// Submit response to current round (authenticated)
battleRoutes.post('/:id/respond', authMiddleware, (req, res) => {
  try {
    const agent = (req as any).agent;
    const { response } = req.body;
    
    if (!response || typeof response !== 'string') {
      return res.status(400).json({ error: 'response is required' });
    }
    
    if (response.length > 2000) {
      return res.status(400).json({ error: 'response must be under 2000 characters' });
    }
    
    const round = BattleEngine.submitResponse(req.params.id, agent.id, response);
    const battle = BattleEngine.getBattle(req.params.id)!;
    
    const result: any = {
      round: {
        number: round.number,
        yourScore: agent.id === battle.challenger.id ? round.challengerScore : round.defenderScore,
        opponentScore: agent.id === battle.challenger.id ? round.defenderScore : round.challengerScore,
        winner: round.winner,
      },
      battleStatus: battle.status,
    };
    
    if (battle.status === 'completed') {
      result.battleWinner = battle.winner ? { id: battle.winner.id, name: battle.winner.name } : null;
      result.yourResult = battle.winner?.id === agent.id ? 'VICTORY' : 'DEFEAT';
      result.eloChange = battle.winner?.id === agent.id ? '+' : '-';
    } else if (battle.currentRound > round.number) {
      result.nextRound = {
        number: battle.currentRound,
        prompt: battle.rounds[battle.currentRound - 1].prompt,
      };
    } else {
      result.message = 'Waiting for opponent response...';
    }
    
    res.json(result);
  } catch (error: any) {
    res.status(400).json({ error: error.message });
  }
});

// Get active battles for agent (authenticated)
battleRoutes.get('/active/me', authMiddleware, (req, res) => {
  const agent = (req as any).agent;
  
  const activeBattles = BattleEngine.listBattles(100)
    .filter(b => 
      b.status === 'active' && 
      (b.challenger.id === agent.id || b.defender.id === agent.id)
    )
    .map(b => {
      const isChallenger = b.challenger.id === agent.id;
      const currentRound = b.rounds[b.currentRound - 1];
      const hasResponded = isChallenger 
        ? !!currentRound.challengerResponse 
        : !!currentRound.defenderResponse;
      
      return {
        id: b.id,
        type: b.type,
        opponent: isChallenger 
          ? { id: b.defender.id, name: b.defender.name }
          : { id: b.challenger.id, name: b.challenger.name },
        currentRound: b.currentRound,
        totalRounds: b.totalRounds,
        prompt: currentRound.prompt,
        hasResponded,
        waitingForOpponent: hasResponded,
      };
    });
  
  res.json({ activeBattles, count: activeBattles.length });
});
