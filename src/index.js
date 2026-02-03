require('dotenv').config();

const app = require('./app');
const config = require('./config');
const logger = require('./config/logger');
const { close: closeDb } = require('./config/database');
const battleCron = require('./jobs/battleCron');
const streams = require('./utils/battleStreams');

const server = app.listen(config.port, () => {
  logger.info({ port: config.port, env: config.nodeEnv }, 'MoltWars API running');
});

streams.start();

if (!config.isTest) {
  battleCron.start();
}

async function shutdown(signal) {
  logger.info({ signal }, 'Shutting down gracefully');
  battleCron.stop();
  streams.stop();
  server.close(async () => {
    await closeDb();
    logger.info('Shutdown complete');
    process.exit(0);
  });

  // Force exit after 10s
  setTimeout(() => {
    logger.error('Forced shutdown after timeout');
    process.exit(1);
  }, 10000);
}

process.on('SIGTERM', () => shutdown('SIGTERM'));
process.on('SIGINT', () => shutdown('SIGINT'));
