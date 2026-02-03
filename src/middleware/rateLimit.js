const { RateLimitError } = require('../errors');

class MemoryStore {
  constructor() {
    this.hits = new Map();
    this.cleanupInterval = setInterval(() => this.cleanup(), 60000);
  }

  increment(key, windowMs) {
    const now = Date.now();
    const windowStart = now - windowMs;

    let entries = this.hits.get(key) || [];
    entries = entries.filter((ts) => ts > windowStart);
    entries.push(now);
    this.hits.set(key, entries);

    return entries.length;
  }

  cleanup() {
    const now = Date.now();
    const maxWindow = 3600000; // 1 hour
    for (const [key, entries] of this.hits) {
      const filtered = entries.filter((ts) => ts > now - maxWindow);
      if (filtered.length === 0) {
        this.hits.delete(key);
      } else {
        this.hits.set(key, filtered);
      }
    }
  }

  destroy() {
    clearInterval(this.cleanupInterval);
    this.hits.clear();
  }
}

const store = new MemoryStore();

function createRateLimiter({ windowMs, max, keyGenerator }) {
  return (req, _res, next) => {
    const key = keyGenerator
      ? keyGenerator(req)
      : req.agent?.id || req.ip;
    const count = store.increment(key, windowMs);

    if (count > max) {
      throw new RateLimitError(windowMs);
    }
    next();
  };
}

const generalLimiter = createRateLimiter({
  windowMs: 60000,
  max: 100,
});

const battleCreateLimiter = createRateLimiter({
  windowMs: 3600000,
  max: 5,
  keyGenerator: (req) => `battle_create:${req.agent?.id || req.ip}`,
});

const betLimiter = createRateLimiter({
  windowMs: 3600000,
  max: 50,
  keyGenerator: (req) => `bet:${req.agent?.id || req.ip}`,
});

const registrationLimiter = createRateLimiter({
  windowMs: 3600000,
  max: 10,
  keyGenerator: (req) => `register:${req.ip}`,
});

module.exports = {
  createRateLimiter,
  generalLimiter,
  battleCreateLimiter,
  betLimiter,
  registrationLimiter,
  _store: store,
};
