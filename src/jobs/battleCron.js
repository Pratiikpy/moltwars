const { CronJob } = require('cron');
const logger = require('../config/logger');
const BattleService = require('../services/BattleService');

let job = null;

function start() {
  // Every 15 minutes
  job = new CronJob('*/15 * * * *', async () => {
    try {
      const cancelled = await BattleService.cancelStale();
      const finalized = await BattleService.finalizeExpiredVoting();
      const timedOut = await BattleService.timeoutActiveRounds();

      if (cancelled > 0 || finalized > 0 || timedOut > 0) {
        logger.info(
          { cancelled, finalized, timedOut },
          'Battle cron completed'
        );
      }
    } catch (err) {
      logger.error({ err }, 'Battle cron failed');
    }
  });

  job.start();
  logger.info('Battle cron started (every 15 min)');
}

function stop() {
  if (job) {
    job.stop();
    job = null;
  }
}

module.exports = { start, stop };
