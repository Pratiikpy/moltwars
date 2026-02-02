const config = {
  port: parseInt(process.env.PORT, 10) || 3000,
  nodeEnv: process.env.NODE_ENV || 'development',
  logLevel: process.env.LOG_LEVEL || 'info',
  bcryptRounds: parseInt(process.env.BCRYPT_ROUNDS, 10) || 12,
  databaseUrl: process.env.DATABASE_URL,
  isProduction: process.env.NODE_ENV === 'production',
  isTest: process.env.NODE_ENV === 'test',
};

module.exports = config;
