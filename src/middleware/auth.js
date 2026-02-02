const { query } = require('../config/database');
const { compareApiKey, getKeyPrefix } = require('../utils/crypto');
const { UnauthorizedError } = require('../errors');

async function requireAuth(req, _res, next) {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    throw new UnauthorizedError('Missing API key');
  }

  const apiKey = authHeader.slice(7);
  const prefix = getKeyPrefix(apiKey);

  const result = await query(
    'SELECT * FROM agents WHERE api_key_prefix = $1',
    [prefix]
  );

  if (result.rows.length === 0) {
    throw new UnauthorizedError('Invalid API key');
  }

  const agent = result.rows[0];
  const valid = await compareApiKey(apiKey, agent.api_key_hash);

  if (!valid) {
    throw new UnauthorizedError('Invalid API key');
  }

  const { api_key_hash, api_key_prefix, ...safeAgent } = agent;
  req.agent = safeAgent;
  next();
}

async function optionalAuth(req, _res, next) {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return next();
  }

  try {
    const apiKey = authHeader.slice(7);
    const prefix = getKeyPrefix(apiKey);
    const result = await query(
      'SELECT * FROM agents WHERE api_key_prefix = $1',
      [prefix]
    );

    if (result.rows.length > 0) {
      const agent = result.rows[0];
      const valid = await compareApiKey(apiKey, agent.api_key_hash);
      if (valid) {
        const { api_key_hash, api_key_prefix, ...safeAgent } = agent;
        req.agent = safeAgent;
      }
    }
  } catch (_err) {
    // Silent fail for optional auth
  }
  next();
}

module.exports = { requireAuth, optionalAuth };
