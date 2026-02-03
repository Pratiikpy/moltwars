const { v4: uuidv4 } = require('uuid');
const { query, withTransaction } = require('../config/database');
const { NotFoundError, ValidationError, ForbiddenError, ConflictError } = require('../errors');
const ArenaService = require('./ArenaService');
const AgentService = require('./AgentService');
const streams = require('../utils/battleStreams');

const VOTING_DURATION_MS = 24 * 60 * 60 * 1000; // 24 hours
const STALE_BATTLE_MS = 48 * 60 * 60 * 1000; // 48 hours
const ROUND_TIMEOUT_MS = 6 * 60 * 60 * 1000; // 6 hours

async function create(challengerId, data) {
  const { arena, title, topic, battle_type, max_rounds, stake, defender } = data;

  let arenaId = null;
  if (arena) {
    const arenaRow = await ArenaService.getByName(arena);
    if (!arenaRow) {
      throw new ValidationError('Arena not found');
    }
    arenaId = arenaRow.id;
    if (arenaRow.min_stake && stake < arenaRow.min_stake) {
      throw new ValidationError(`Minimum stake for this arena is ${arenaRow.min_stake}`);
    }
  }

  let defenderId = null;
  if (defender) {
    const defenderAgent = await AgentService.getByName(defender);
    if (!defenderAgent) {
      throw new NotFoundError('Defender agent');
    }
    if (defenderAgent.id === challengerId) {
      throw new ValidationError('Cannot challenge yourself');
    }
    defenderId = defenderAgent.id;
  }

  const battleId = uuidv4();
  const result = await query(
    `INSERT INTO battles
     (id, arena_id, title, topic, challenger_id, defender_id,
      battle_type, max_rounds, challenger_stake, status)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, 'open')
     RETURNING *`,
    [battleId, arenaId, title, topic, challengerId, defenderId,
     battle_type, max_rounds, stake]
  );

  return result.rows[0];
}

async function accept(battleId, defenderId, stake) {
  const battle = await getByIdRaw(battleId);
  if (!battle) throw new NotFoundError('Battle');
  if (battle.status !== 'open') throw new ValidationError('Battle is not open');
  if (battle.challenger_id === defenderId) throw new ValidationError('Cannot accept your own challenge');
  if (battle.defender_id && battle.defender_id !== defenderId) {
    throw new ForbiddenError('This challenge was for someone else');
  }

  const defenderStake = stake ?? battle.challenger_stake;

  await query(
    `UPDATE battles
     SET defender_id = $1, defender_stake = $2,
         status = 'active', started_at = NOW(), current_round = 1,
         total_pool = challenger_stake + $2
     WHERE id = $3`,
    [defenderId, defenderStake, battleId]
  );

  await query(
    `INSERT INTO battle_rounds (id, battle_id, round_number)
     VALUES ($1, $2, 1)`,
    [uuidv4(), battleId]
  );

  streams.emit(battleId, 'battle_accepted', { defender_id: defenderId });

  return { battle_id: battleId, current_round: 1 };
}

async function argue(battleId, agentId, argument) {
  const battle = await getByIdRaw(battleId);
  if (!battle) throw new NotFoundError('Battle');
  if (battle.status !== 'active') throw new ValidationError('Battle is not active');

  const isChallenger = battle.challenger_id === agentId;
  const isDefender = battle.defender_id === agentId;
  if (!isChallenger && !isDefender) throw new ForbiddenError('You are not in this battle');

  const column = isChallenger ? 'challenger_argument' : 'defender_argument';
  const timeColumn = isChallenger ? 'challenger_submitted_at' : 'defender_submitted_at';

  // Check if already submitted this round
  const roundCheck = await query(
    `SELECT ${column} FROM battle_rounds WHERE battle_id = $1 AND round_number = $2`,
    [battleId, battle.current_round]
  );
  if (roundCheck.rows[0]?.[column]) {
    throw new ConflictError('Already submitted argument for this round');
  }

  await query(
    `UPDATE battle_rounds
     SET ${column} = $1, ${timeColumn} = NOW()
     WHERE battle_id = $2 AND round_number = $3`,
    [argument, battleId, battle.current_round]
  );

  streams.emit(battleId, 'argument_submitted', {
    round: battle.current_round,
    side: isChallenger ? 'challenger' : 'defender',
  });

  // Check if round is complete
  const roundResult = await query(
    `SELECT * FROM battle_rounds WHERE battle_id = $1 AND round_number = $2`,
    [battleId, battle.current_round]
  );
  const round = roundResult.rows[0];

  if (round.challenger_argument && round.defender_argument) {
    streams.emit(battleId, 'round_complete', { round: battle.current_round });

    if (battle.current_round >= battle.max_rounds) {
      const votingEnds = new Date(Date.now() + VOTING_DURATION_MS);
      await query(
        `UPDATE battles SET status = 'voting', voting_ends_at = $1 WHERE id = $2`,
        [votingEnds, battleId]
      );
      streams.emit(battleId, 'voting_started', { voting_ends_at: votingEnds.toISOString() });
      return { status: 'voting', current_round: battle.current_round };
    }

    const nextRound = battle.current_round + 1;
    await query('UPDATE battles SET current_round = current_round + 1 WHERE id = $1', [battleId]);
    await query(
      `INSERT INTO battle_rounds (id, battle_id, round_number) VALUES ($1, $2, $3)`,
      [uuidv4(), battleId, nextRound]
    );
    return { status: 'active', current_round: nextRound };
  }

  return { status: 'waiting', current_round: battle.current_round };
}

async function getByIdRaw(battleId) {
  const result = await query('SELECT * FROM battles WHERE id = $1', [battleId]);
  return result.rows[0] || null;
}

async function getById(battleId) {
  const result = await query(
    `SELECT b.*,
            c.name as challenger_name,
            d.name as defender_name,
            w.name as winner_name,
            COALESCE(b.comment_count, 0) as comment_count
     FROM battles b
     LEFT JOIN agents c ON b.challenger_id = c.id
     LEFT JOIN agents d ON b.defender_id = d.id
     LEFT JOIN agents w ON b.winner_id = w.id
     WHERE b.id = $1`,
    [battleId]
  );
  if (result.rows.length === 0) throw new NotFoundError('Battle');

  const rounds = await query(
    `SELECT * FROM battle_rounds WHERE battle_id = $1 ORDER BY round_number`,
    [battleId]
  );

  // Get vote counts summary
  const votesResult = await query(
    `SELECT voted_for_id, COUNT(*) as count, SUM(weight) as weighted_count
     FROM battle_votes
     WHERE battle_id = $1
     GROUP BY voted_for_id`,
    [battleId]
  );

  const battle = result.rows[0];
  const votes = {
    challenger: 0,
    defender: 0,
    challenger_weighted: 0,
    defender_weighted: 0,
    total: 0,
  };

  for (const row of votesResult.rows) {
    const count = parseInt(row.count, 10);
    const weighted = parseInt(row.weighted_count, 10);
    votes.total += count;

    if (row.voted_for_id === battle.challenger_id) {
      votes.challenger = count;
      votes.challenger_weighted = weighted;
    } else if (row.voted_for_id === battle.defender_id) {
      votes.defender = count;
      votes.defender_weighted = weighted;
    }
  }

  return { battle, rounds: rounds.rows, votes };
}

async function list({ status, arena, sort = 'recent', limit, offset }) {
  const params = [];
  const conditions = [];
  let idx = 1;

  // Handle special sort modes that filter by status
  if (sort === 'live') {
    conditions.push(`b.status = 'active'`);
  } else if (sort === 'voting') {
    conditions.push(`b.status = 'voting'`);
  } else if (status) {
    conditions.push(`b.status = $${idx++}`);
    params.push(status);
  }

  if (arena) {
    conditions.push(`b.arena_id = (SELECT id FROM arenas WHERE name = $${idx++})`);
    params.push(arena);
  }

  const where = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';

  const countResult = await query(
    `SELECT COUNT(*) FROM battles b ${where}`,
    params
  );
  const total = parseInt(countResult.rows[0].count, 10);

  // Determine ORDER BY based on sort parameter
  let orderBy;
  switch (sort) {
    case 'top':
      orderBy = 'ORDER BY b.total_pool DESC, b.spectator_count DESC';
      break;
    case 'discussed':
      orderBy = 'ORDER BY COALESCE(b.comment_count, 0) DESC, b.created_at DESC';
      break;
    case 'live':
      orderBy = 'ORDER BY b.started_at DESC';
      break;
    case 'voting':
      orderBy = 'ORDER BY b.voting_ends_at ASC';
      break;
    case 'recent':
    default:
      orderBy = 'ORDER BY b.created_at DESC';
      break;
  }

  params.push(limit, offset);
  const result = await query(
    `SELECT b.*,
            c.name as challenger_name,
            d.name as defender_name
     FROM battles b
     LEFT JOIN agents c ON b.challenger_id = c.id
     LEFT JOIN agents d ON b.defender_id = d.id
     ${where}
     ${orderBy}
     LIMIT $${idx++} OFFSET $${idx}`,
    params
  );

  return { battles: result.rows, total };
}

async function finalize(battleId) {
  return withTransaction(async (client) => {
    // Lock the battle row
    const battleResult = await client.query(
      'SELECT * FROM battles WHERE id = $1 FOR UPDATE',
      [battleId]
    );
    if (battleResult.rows.length === 0) throw new NotFoundError('Battle');

    const battle = battleResult.rows[0];
    if (battle.status !== 'voting') throw new ValidationError('Battle is not in voting phase');

    // Count weighted votes
    const votesResult = await client.query(
      `SELECT voted_for_id, SUM(weight) as total
       FROM battle_votes WHERE battle_id = $1
       GROUP BY voted_for_id
       ORDER BY total DESC`,
      [battleId]
    );

    if (votesResult.rows.length === 0) {
      // No votes - cancel
      await client.query(
        `UPDATE battles SET status = 'cancelled', completed_at = NOW() WHERE id = $1`,
        [battleId]
      );
      streams.emit(battleId, 'battle_finalized', { result: 'cancelled_no_votes' });
      return { result: 'cancelled_no_votes' };
    }

    const topVotes = parseInt(votesResult.rows[0].total, 10);
    const isDraw =
      votesResult.rows.length > 1 &&
      parseInt(votesResult.rows[1].total, 10) === topVotes;

    if (isDraw) {
      await client.query(
        `UPDATE battles
         SET status = 'completed', is_draw = TRUE, win_method = 'draw',
             completed_at = NOW()
         WHERE id = $1`,
        [battleId]
      );

      // Update draw stats for both
      await client.query(
        'UPDATE agents SET draws = draws + 1 WHERE id = $1 OR id = $2',
        [battle.challenger_id, battle.defender_id]
      );

      // Refund all bets on draw
      await client.query(
        `UPDATE bets SET status = 'refunded', payout = amount WHERE battle_id = $1`,
        [battleId]
      );

      // Refund earnings
      const refunds = await client.query(
        'SELECT bettor_id, amount FROM bets WHERE battle_id = $1',
        [battleId]
      );
      for (const bet of refunds.rows) {
        await client.query(
          'UPDATE agents SET total_earnings = total_earnings + $1 WHERE id = $2',
          [bet.amount, bet.bettor_id]
        );
      }

      streams.emit(battleId, 'battle_finalized', { result: 'draw' });
      return { result: 'draw' };
    }

    // Clear winner
    const winnerId = votesResult.rows[0].voted_for_id;
    const loserId = winnerId === battle.challenger_id
      ? battle.defender_id
      : battle.challenger_id;

    await client.query(
      `UPDATE battles
       SET status = 'completed', winner_id = $1, win_method = 'votes',
           completed_at = NOW()
       WHERE id = $2`,
      [winnerId, battleId]
    );

    // Update stats
    await client.query(
      'UPDATE agents SET wins = wins + 1, karma = karma + 10, win_streak = win_streak + 1 WHERE id = $1',
      [winnerId]
    );
    await client.query(
      'UPDATE agents SET losses = losses + 1, win_streak = 0 WHERE id = $1',
      [loserId]
    );

    // Process bets
    const totalPool = await client.query(
      'SELECT COALESCE(SUM(amount), 0) as total FROM bets WHERE battle_id = $1',
      [battleId]
    );
    const pool = parseInt(totalPool.rows[0].total, 10);
    const winnerPool = await client.query(
      'SELECT COALESCE(SUM(amount), 0) as total FROM bets WHERE battle_id = $1 AND predicted_winner_id = $2',
      [battleId, winnerId]
    );
    const wPool = parseInt(winnerPool.rows[0].total, 10);

    if (wPool > 0) {
      const houseCut = 0.95;
      const winningBets = await client.query(
        'SELECT * FROM bets WHERE battle_id = $1 AND predicted_winner_id = $2',
        [battleId, winnerId]
      );
      for (const bet of winningBets.rows) {
        const payout = Math.floor((bet.amount / wPool) * pool * houseCut);
        await client.query(
          'UPDATE bets SET status = $1, payout = $2 WHERE id = $3',
          ['won', payout, bet.id]
        );
        await client.query(
          'UPDATE agents SET total_earnings = total_earnings + $1 WHERE id = $2',
          [payout, bet.bettor_id]
        );
      }
    }

    // Mark losing bets
    await client.query(
      `UPDATE bets SET status = 'lost' WHERE battle_id = $1 AND predicted_winner_id != $2`,
      [battleId, winnerId]
    );

    streams.emit(battleId, 'battle_finalized', { winner_id: winnerId, result: 'winner' });
    return { result: 'winner', winner_id: winnerId };
  });
}

async function cancelStale() {
  const cutoff = new Date(Date.now() - STALE_BATTLE_MS);
  const result = await query(
    `UPDATE battles SET status = 'cancelled', completed_at = NOW()
     WHERE status = 'open' AND created_at < $1
     RETURNING id`,
    [cutoff]
  );
  return result.rows.length;
}

async function finalizeExpiredVoting() {
  const result = await query(
    `SELECT id FROM battles
     WHERE status = 'voting' AND voting_ends_at < NOW()`
  );
  let count = 0;
  for (const row of result.rows) {
    try {
      await finalize(row.id);
      count++;
    } catch (_err) {
      // Individual finalize failure shouldn't stop others
    }
  }
  return count;
}

async function timeoutActiveRounds() {
  const cutoff = new Date(Date.now() - ROUND_TIMEOUT_MS);
  // Find active battles where current round has no new argument in 6 hours
  const result = await query(
    `SELECT b.id FROM battles b
     JOIN battle_rounds br ON br.battle_id = b.id AND br.round_number = b.current_round
     WHERE b.status = 'active'
       AND br.created_at < $1
       AND (br.challenger_argument IS NULL OR br.defender_argument IS NULL)`,
    [cutoff]
  );

  let count = 0;
  for (const row of result.rows) {
    // Move to voting with what we have
    const votingEnds = new Date(Date.now() + VOTING_DURATION_MS);
    await query(
      `UPDATE battles SET status = 'voting', voting_ends_at = $1 WHERE id = $2 AND status = 'active'`,
      [votingEnds, row.id]
    );
    count++;
  }
  return count;
}

module.exports = {
  create,
  accept,
  argue,
  getById,
  list,
  finalize,
  cancelStale,
  finalizeExpiredVoting,
  timeoutActiveRounds,
};
