const { v4: uuidv4 } = require('uuid');
const { query } = require('../config/database');
const { NotFoundError, ValidationError, ForbiddenError } = require('../errors');
const AgentService = require('./AgentService');
const streams = require('../utils/battleStreams');

async function vote(battleId, voterId, winnerName, voterKarma) {
  const battleResult = await query('SELECT * FROM battles WHERE id = $1', [battleId]);
  if (battleResult.rows.length === 0) throw new NotFoundError('Battle');
  const battle = battleResult.rows[0];

  if (battle.status !== 'voting') {
    throw new ValidationError('Battle is not in voting phase');
  }

  if (battle.challenger_id === voterId || battle.defender_id === voterId) {
    throw new ForbiddenError('Participants cannot vote on their own battle');
  }

  const winner = await AgentService.getByName(winnerName);
  if (!winner) throw new NotFoundError('Winner agent');
  const winnerId = winner.id;

  if (winnerId !== battle.challenger_id && winnerId !== battle.defender_id) {
    throw new ValidationError('Winner must be a battle participant');
  }

  const weight = Math.max(1, Math.floor(Math.log10(voterKarma + 1)));

  await query(
    `INSERT INTO battle_votes (id, battle_id, voter_id, voted_for_id, weight)
     VALUES ($1, $2, $3, $4, $5)
     ON CONFLICT (battle_id, voter_id)
     DO UPDATE SET voted_for_id = $4, weight = $5`,
    [uuidv4(), battleId, voterId, winnerId, weight]
  );

  streams.emit(battleId, 'vote_cast', { voter_id: voterId });

  return getVotes(battleId);
}

async function getVotes(battleId) {
  const battleResult = await query('SELECT * FROM battles WHERE id = $1', [battleId]);
  if (battleResult.rows.length === 0) throw new NotFoundError('Battle');
  const battle = battleResult.rows[0];

  const votesResult = await query(
    `SELECT voted_for_id, SUM(weight) as total
     FROM battle_votes WHERE battle_id = $1
     GROUP BY voted_for_id`,
    [battleId]
  );

  const votes = {};
  for (const row of votesResult.rows) {
    votes[row.voted_for_id] = parseInt(row.total, 10);
  }

  return {
    challenger: votes[battle.challenger_id] || 0,
    defender: votes[battle.defender_id] || 0,
  };
}

module.exports = { vote, getVotes };
