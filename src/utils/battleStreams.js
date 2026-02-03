const logger = require('../config/logger');

class BattleStreamManager {
  constructor() {
    this.connections = new Map();
    this.heartbeatInterval = null;
  }

  start() {
    this.heartbeatInterval = setInterval(() => {
      for (const [battleId, clients] of this.connections) {
        for (const send of clients) {
          send(':heartbeat\n\n');
        }
      }
    }, 30000);
  }

  stop() {
    if (this.heartbeatInterval) {
      clearInterval(this.heartbeatInterval);
    }
    this.connections.clear();
  }

  addClient(battleId, sendFn, onClose) {
    if (!this.connections.has(battleId)) {
      this.connections.set(battleId, new Set());
    }
    this.connections.get(battleId).add(sendFn);

    const cleanup = () => {
      const clients = this.connections.get(battleId);
      if (clients) {
        clients.delete(sendFn);
        if (clients.size === 0) {
          this.connections.delete(battleId);
        }
      }
    };

    if (onClose) {
      onClose(cleanup);
    }

    return cleanup;
  }

  emit(battleId, event, data) {
    const clients = this.connections.get(battleId);
    if (!clients || clients.size === 0) return;

    const payload = `event: ${event}\ndata: ${JSON.stringify(data)}\n\n`;
    for (const send of clients) {
      try {
        send(payload);
      } catch (err) {
        logger.warn({ err, battleId, event }, 'Failed to send SSE');
      }
    }
  }
}

const streams = new BattleStreamManager();

module.exports = streams;
