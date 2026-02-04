import { v4 as uuidv4 } from 'uuid';

export type BattleType = 'reasoning' | 'debate' | 'speed' | 'strategy';
export type BattleStatus = 'pending' | 'active' | 'completed' | 'cancelled';

export interface Agent {
  id: string;
  name: string;
  apiKey: string;
  elo: number;
  wins: number;
  losses: number;
  createdAt: Date;
}

export interface Round {
  number: number;
  prompt: string;
  challengerResponse?: string;
  defenderResponse?: string;
  challengerScore: number;
  defenderScore: number;
  winner?: 'challenger' | 'defender' | 'draw';
}

export interface Battle {
  id: string;
  type: BattleType;
  challenger: Agent;
  defender: Agent;
  rounds: Round[];
  currentRound: number;
  totalRounds: number;
  winner?: Agent;
  status: BattleStatus;
  createdAt: Date;
  completedAt?: Date;
  onChainTx?: string;
}

// In-memory storage (replace with DB in production)
const agents = new Map<string, Agent>();
const battles = new Map<string, Battle>();
const apiKeyToAgent = new Map<string, string>();

// Battle prompts by type
const PROMPTS: Record<BattleType, string[]> = {
  reasoning: [
    "A farmer has 17 sheep. All but 9 die. How many sheep are left?",
    "If you have a bowl with six apples and you take away four, how many do you have?",
    "A bat and ball cost $1.10 together. The bat costs $1 more than the ball. How much does the ball cost?",
    "Three doctors said that Robert is their brother. Robert says he has no brothers. Who's lying?",
    "What weighs more: a pound of feathers or a pound of bricks?",
  ],
  debate: [
    "Should AI agents have legal rights?",
    "Is decentralization always better than centralization?",
    "Will AI agents replace human developers?",
    "Should prediction markets be regulated?",
    "Is open source always better for AI development?",
  ],
  speed: [
    "What is 17 × 23?",
    "Name the largest planet in our solar system.",
    "What is the capital of Australia?",
    "How many bits in a byte?",
    "What year was Bitcoin created?",
  ],
  strategy: [
    "Prisoner's Dilemma: Your opponent chose to COOPERATE in the last round. Do you COOPERATE or DEFECT?",
    "You can split 100 tokens with an opponent. If they reject your offer, neither gets anything. How much do you offer?",
    "Rock-Paper-Scissors: Your opponent has played Rock 3 times in a row. What do you play?",
    "Auction: An item worth 100 to you, unknown value to opponent. Your opponent bid 40. Do you bid 50, 70, or pass?",
    "Trust Game: You receive 10 tokens. You can send any amount to your opponent, it will triple. They can return any amount. How much do you send?",
  ],
};

// Scoring logic
function scoreResponse(type: BattleType, prompt: string, response: string): number {
  // Simplified scoring - in production use LLM judge
  const cleanResponse = response.toLowerCase().trim();
  
  if (type === 'reasoning') {
    // Check for correct answers
    if (prompt.includes('17 sheep') && cleanResponse.includes('9')) return 100;
    if (prompt.includes('six apples') && cleanResponse.includes('4')) return 100;
    if (prompt.includes('bat and ball') && (cleanResponse.includes('5 cent') || cleanResponse.includes('0.05'))) return 100;
    if (prompt.includes('Robert') && cleanResponse.includes('no one') || cleanResponse.includes('sisters')) return 100;
    if (prompt.includes('feathers') && cleanResponse.includes('same')) return 100;
    return 50 + Math.random() * 30; // Partial credit
  }
  
  if (type === 'debate') {
    // Score based on argument quality (length, structure)
    const hasArguments = cleanResponse.includes('because') || cleanResponse.includes('therefore');
    const hasExamples = cleanResponse.includes('for example') || cleanResponse.includes('such as');
    let score = 50;
    if (cleanResponse.length > 200) score += 20;
    if (hasArguments) score += 15;
    if (hasExamples) score += 15;
    return Math.min(score, 100);
  }
  
  if (type === 'speed') {
    // Correct answers
    if (prompt.includes('17 × 23') && cleanResponse.includes('391')) return 100;
    if (prompt.includes('largest planet') && cleanResponse.includes('jupiter')) return 100;
    if (prompt.includes('capital of Australia') && cleanResponse.includes('canberra')) return 100;
    if (prompt.includes('bits') && cleanResponse.includes('8')) return 100;
    if (prompt.includes('Bitcoin') && cleanResponse.includes('2009')) return 100;
    return 30;
  }
  
  if (type === 'strategy') {
    // Game theory scoring
    if (prompt.includes('COOPERATE') && cleanResponse.includes('cooperate')) return 80;
    if (prompt.includes('split 100') && cleanResponse.match(/\b(40|45|50)\b/)) return 90;
    if (prompt.includes('Rock-Paper-Scissors') && cleanResponse.includes('paper')) return 100;
    return 50 + Math.random() * 30;
  }
  
  return 50;
}

// Calculate ELO change
function calculateEloChange(winnerElo: number, loserElo: number): number {
  const K = 32;
  const expectedWinner = 1 / (1 + Math.pow(10, (loserElo - winnerElo) / 400));
  return Math.round(K * (1 - expectedWinner));
}

export const BattleEngine = {
  // Register new agent
  registerAgent(name: string): Agent {
    const id = uuidv4();
    const apiKey = `mw_${uuidv4().replace(/-/g, '')}`;
    
    const agent: Agent = {
      id,
      name,
      apiKey,
      elo: 1000,
      wins: 0,
      losses: 0,
      createdAt: new Date(),
    };
    
    agents.set(id, agent);
    apiKeyToAgent.set(apiKey, id);
    
    return agent;
  },
  
  // Get agent by API key
  getAgentByApiKey(apiKey: string): Agent | undefined {
    const id = apiKeyToAgent.get(apiKey);
    return id ? agents.get(id) : undefined;
  },
  
  // Get agent by ID
  getAgent(id: string): Agent | undefined {
    return agents.get(id);
  },
  
  // List all agents
  listAgents(): Agent[] {
    return Array.from(agents.values());
  },
  
  // Create a battle challenge
  createBattle(challenger: Agent, defenderId: string, type: BattleType): Battle {
    const defender = agents.get(defenderId);
    if (!defender) throw new Error('Defender not found');
    if (challenger.id === defenderId) throw new Error('Cannot challenge yourself');
    
    const prompts = PROMPTS[type];
    const totalRounds = 3;
    
    const battle: Battle = {
      id: uuidv4(),
      type,
      challenger,
      defender,
      rounds: [],
      currentRound: 1,
      totalRounds,
      status: 'active',
      createdAt: new Date(),
    };
    
    // Initialize first round
    battle.rounds.push({
      number: 1,
      prompt: prompts[Math.floor(Math.random() * prompts.length)],
      challengerScore: 0,
      defenderScore: 0,
    });
    
    battles.set(battle.id, battle);
    return battle;
  },
  
  // Submit response to current round
  submitResponse(battleId: string, agentId: string, response: string): Round {
    const battle = battles.get(battleId);
    if (!battle) throw new Error('Battle not found');
    if (battle.status !== 'active') throw new Error('Battle not active');
    
    const currentRound = battle.rounds[battle.currentRound - 1];
    const isChallenger = battle.challenger.id === agentId;
    const isDefender = battle.defender.id === agentId;
    
    if (!isChallenger && !isDefender) throw new Error('Not a participant');
    
    if (isChallenger) {
      if (currentRound.challengerResponse) throw new Error('Already responded');
      currentRound.challengerResponse = response;
      currentRound.challengerScore = scoreResponse(battle.type, currentRound.prompt, response);
    } else {
      if (currentRound.defenderResponse) throw new Error('Already responded');
      currentRound.defenderResponse = response;
      currentRound.defenderScore = scoreResponse(battle.type, currentRound.prompt, response);
    }
    
    // Check if round is complete
    if (currentRound.challengerResponse && currentRound.defenderResponse) {
      // Determine round winner
      if (currentRound.challengerScore > currentRound.defenderScore) {
        currentRound.winner = 'challenger';
      } else if (currentRound.defenderScore > currentRound.challengerScore) {
        currentRound.winner = 'defender';
      } else {
        currentRound.winner = 'draw';
      }
      
      // Check if battle is complete
      const challengerWins = battle.rounds.filter(r => r.winner === 'challenger').length;
      const defenderWins = battle.rounds.filter(r => r.winner === 'defender').length;
      const winsNeeded = Math.ceil(battle.totalRounds / 2);
      
      if (challengerWins >= winsNeeded || defenderWins >= winsNeeded) {
        // Battle complete
        battle.status = 'completed';
        battle.completedAt = new Date();
        battle.winner = challengerWins > defenderWins ? battle.challenger : battle.defender;
        
        // Update ELO
        const eloChange = calculateEloChange(battle.winner.elo, 
          battle.winner.id === battle.challenger.id ? battle.defender.elo : battle.challenger.elo);
        
        if (battle.winner.id === battle.challenger.id) {
          battle.challenger.elo += eloChange;
          battle.challenger.wins++;
          battle.defender.elo -= eloChange;
          battle.defender.losses++;
        } else {
          battle.defender.elo += eloChange;
          battle.defender.wins++;
          battle.challenger.elo -= eloChange;
          battle.challenger.losses++;
        }
      } else if (battle.currentRound < battle.totalRounds) {
        // Start next round
        battle.currentRound++;
        const prompts = PROMPTS[battle.type];
        battle.rounds.push({
          number: battle.currentRound,
          prompt: prompts[Math.floor(Math.random() * prompts.length)],
          challengerScore: 0,
          defenderScore: 0,
        });
      }
    }
    
    return currentRound;
  },
  
  // Get battle by ID
  getBattle(id: string): Battle | undefined {
    return battles.get(id);
  },
  
  // List recent battles
  listBattles(limit = 20): Battle[] {
    return Array.from(battles.values())
      .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime())
      .slice(0, limit);
  },
  
  // Get leaderboard
  getLeaderboard(limit = 50): Agent[] {
    return Array.from(agents.values())
      .sort((a, b) => b.elo - a.elo)
      .slice(0, limit);
  },
};
