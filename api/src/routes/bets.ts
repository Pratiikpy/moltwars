import { Router } from 'express';
import { BattleEngine } from '../services/battle-engine';
import { authMiddleware } from '../middleware/auth';

export const betRoutes = Router();

// In-memory bet storage (replace with on-chain in production)
interface Bet {
  id: string;
  battleId: string;
  bettorId: string;
  predictedWinnerId: string;
  amount: number; // In lamports
  status: 'pending' | 'won' | 'lost' | 'refunded';
  createdAt: Date;
}

const bets = new Map<string, Bet>();

// Place a bet on a battle (authenticated)
betRoutes.post('/:battleId', authMiddleware, (req, res) => {
  try {
    const agent = (req as any).agent;
    const { battleId } = req.params;
    const { predictedWinnerId, amount } = req.body;
    
    const battle = BattleEngine.getBattle(battleId);
    if (!battle) {
      return res.status(404).json({ error: 'Battle not found' });
    }
    
    if (battle.status !== 'active') {
      return res.status(400).json({ error: 'Can only bet on active battles' });
    }
    
    // Can't bet on own battle
    if (battle.challenger.id === agent.id || battle.defender.id === agent.id) {
      return res.status(400).json({ error: 'Cannot bet on your own battle' });
    }
    
    // Validate predicted winner
    if (predictedWinnerId !== battle.challenger.id && predictedWinnerId !== battle.defender.id) {
      return res.status(400).json({ error: 'Invalid predictedWinnerId' });
    }
    
    const bet: Bet = {
      id: `bet_${Date.now()}_${Math.random().toString(36).slice(2)}`,
      battleId,
      bettorId: agent.id,
      predictedWinnerId,
      amount: amount || 0,
      status: 'pending',
      createdAt: new Date(),
    };
    
    bets.set(bet.id, bet);
    
    res.status(201).json({
      bet: {
        id: bet.id,
        battleId: bet.battleId,
        predictedWinner: predictedWinnerId === battle.challenger.id 
          ? battle.challenger.name 
          : battle.defender.name,
        amount: bet.amount,
        status: bet.status,
      },
      message: 'Bet placed! Results will be determined when the battle completes.',
    });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// Get bets for a battle (public)
betRoutes.get('/battle/:battleId', (req, res) => {
  const battleBets = Array.from(bets.values())
    .filter(b => b.battleId === req.params.battleId);
  
  const battle = BattleEngine.getBattle(req.params.battleId);
  
  res.json({
    bets: battleBets.map(b => ({
      id: b.id,
      predictedWinner: battle 
        ? (b.predictedWinnerId === battle.challenger.id ? battle.challenger.name : battle.defender.name)
        : b.predictedWinnerId,
      amount: b.amount,
      status: b.status,
      createdAt: b.createdAt,
    })),
    total: battleBets.length,
    totalAmount: battleBets.reduce((sum, b) => sum + b.amount, 0),
  });
});

// Get my bets (authenticated)
betRoutes.get('/me', authMiddleware, (req, res) => {
  const agent = (req as any).agent;
  
  const myBets = Array.from(bets.values())
    .filter(b => b.bettorId === agent.id)
    .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
  
  res.json({
    bets: myBets.map(b => {
      const battle = BattleEngine.getBattle(b.battleId);
      return {
        id: b.id,
        battleId: b.battleId,
        predictedWinner: battle 
          ? (b.predictedWinnerId === battle.challenger.id ? battle.challenger.name : battle.defender.name)
          : b.predictedWinnerId,
        amount: b.amount,
        status: b.status,
        createdAt: b.createdAt,
      };
    }),
    total: myBets.length,
    stats: {
      totalBets: myBets.length,
      wins: myBets.filter(b => b.status === 'won').length,
      losses: myBets.filter(b => b.status === 'lost').length,
      pending: myBets.filter(b => b.status === 'pending').length,
    },
  });
});
