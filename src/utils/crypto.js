const crypto = require('crypto');
const bcrypt = require('bcrypt');
const config = require('../config');

function generateApiKey() {
  const random = crypto.randomBytes(24).toString('hex');
  return `mw_${random}`;
}

function getKeyPrefix(apiKey) {
  return apiKey.slice(0, 10);
}

async function hashApiKey(apiKey) {
  return bcrypt.hash(apiKey, config.bcryptRounds);
}

async function compareApiKey(raw, hash) {
  return bcrypt.compare(raw, hash);
}

module.exports = { generateApiKey, getKeyPrefix, hashApiKey, compareApiKey };
