const { v4: uuidv4 } = require('uuid');
const { query } = require('../config/database');
const { NotFoundError, ValidationError, ConflictError } = require('../errors');
const AgentService = require('./AgentService');
const streams = require('../utils/battleStreams');

const HOUSE_CUT = 0.95;

function calculateOdds(totalPool, sidePool) {
  if (sidePool === 0) return 2.0;
  return (totalPool * HOUSE_CUT) / sidePool;
}

async function placeBet(battleId, bettorId, predictedWinnerName, amount) {
  // Validate battle
  const battleResult = await query('SELECT * FROM battles WHERE id = $1', [battleId]);
  if (battleResult.rows.length === 0) throw new NotFoundError('Battle');
  const battle = battleResult.rows[0];

  if (!['open', 'active'].includes(battle.status)) {
    throw new ValidationError('Betting is closed for this battle');
  }

  // Participants can't bet on their own battle
  if (battle.challenger_id === bettorId || battle.defender_id === bettorId) {
    throw new ValidationError('Participants cannot bet on their own battle');
  }

  // Resolve winner name to ID
  const winner = await AgentService.getByName(predictedWinnerName);
  if (!winner) throw new NotFoundError('Predicted winner agent');
  const winnerId = winner.id;

  // Winner must be a participant
  if (winnerId !== battle.challenger_id && winnerId !== battle.defender_id) {
    throw new ValidationError('Predicted winner must be a battle participant');
  }

  // Prevent duplicate bets
  const existing = await query(
    'SELECT id FROM bets WHERE battle_id = $1 AND bettor_id = $2',
    [battleId, bettorId]
  );
  if (existing.rows.length > 0) {
    throw new ConflictError('Already placed a bet on this battle');
  }

  // Calculate odds
  const poolsResult = await query(
    `SELECT predicted_winner_id, SUM(amount) as total
     FROM bets WHERE battle_id = $1
     GROUP BY predicted_winner_id`,
    [battleId]
  );
  const pools = {};
  for (const row of poolsResult.rows) {
    pools[row.predicted_winner_id] = parseInt(row.total, 10);
  }

  const totalPool = Object.values(pools).reduce((a, b) => a + b, 0) + amount;
  const winnerPool = (pools[winnerId] || 0) + amount;
  const odds = calculateOdds(totalPool, winnerPool);

  await query(
    `INSERT INTO bets (id, battle_id, bettor_id, predicted_winner_id, amount, odds)
     VALUES ($1, $2, $3, $4, $5, $6)`,
    [uuidv4(), battleId, bettorId, winnerId, amount, odds]
  );

  await query(
    'UPDATE battles SET total_bets = total_bets + $1 WHERE id = $2',
    [amount, battleId]
  );

  streams.emit(battleId, 'bet_placed', { amount, side: predictedWinnerName });

  return {
    amount,
    odds: parseFloat(odds.toFixed(4)),
    potential_payout: Math.floor(amount * odds),
  };
}

async function getOdds(battleId) {
  const battleResult = await query(
    `SELECT b.*, c.name as challenger_name, d.name as defender_name
     FROM battles b
     LEFT JOIN agents c ON b.challenger_id = c.id
     LEFT JOIN agents d ON b.defender_id = d.id
     WHERE b.id = $1`,
    [battleId]
  );
  if (battleResult.rows.length === 0) throw new NotFoundError('Battle');
  const battle = battleResult.rows[0];

  const poolsResult = await query(
    `SELECT predicted_winner_id, SUM(amount) as total, COUNT(*) as count
     FROM bets WHERE battle_id = $1
     GROUP BY predicted_winner_id`,
    [battleId]
  );

  const pools = {};
  for (const row of poolsResult.rows) {
    pools[row.predicted_winner_id] = {
      total: parseInt(row.total, 10),
      count: parseInt(row.count, 10),
    };
  }

  const totalPool = Object.values(pools).reduce((a, b) => a + b.total, 0);

  return {
    challenger: {
      name: battle.challenger_name,
      pool: pools[battle.challenger_id]?.total || 0,
      bets: pools[battle.challenger_id]?.count || 0,
      odds: parseFloat(calculateOdds(totalPool, pools[battle.challenger_id]?.total || 0).toFixed(2)),
    },
    defender: {
      name: battle.defender_name,
      pool: pools[battle.defender_id]?.total || 0,
      bets: pools[battle.defender_id]?.count || 0,
      odds: parseFloat(calculateOdds(totalPool, pools[battle.defender_id]?.total || 0).toFixed(2)),
    },
    total_pool: totalPool,
  };
}

module.exports = { placeBet, getOdds, calculateOdds };
