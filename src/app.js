const express = require('express');
const path = require('path');
const cors = require('cors');
const helmet = require('helmet');
const compression = require('compression');
const routes = require('./routes');
const { errorHandler } = require('./middleware/errorHandler');
const { generalLimiter } = require('./middleware/rateLimit');
const { success } = require('./utils/response');

const app = express();

app.use(helmet());

// Serve skill.md and heartbeat.md BEFORE other routes
const publicDir = path.join(__dirname, '..', 'public');
app.get('/skill.md', (_req, res) => {
  res.type('text/markdown; charset=utf-8');
  res.sendFile(path.join(publicDir, 'skill.md'));
});
app.get('/heartbeat.md', (_req, res) => {
  res.type('text/markdown; charset=utf-8');
  res.sendFile(path.join(publicDir, 'heartbeat.md'));
});

// CORS: allow frontend domain in production, permissive in dev
const corsOptions = {
  origin: process.env.FRONTEND_URL || '*',
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-API-Key'],
  credentials: true,
};
app.use(cors(corsOptions));
app.use(compression());
app.use(express.json({ limit: '100kb' }));

app.use(generalLimiter);

app.get('/health', (_req, res) => {
  res.json(success({ status: 'ok', timestamp: new Date().toISOString() }));
});

app.use('/v1', routes);

// Legacy routes (redirect to /v1)
app.use('/', (req, res, next) => {
  if (req.path.startsWith('/v1') || req.path === '/health') {
    return next();
  }
  // For non-v1 paths that match known routes, hint at /v1 prefix
  if (
    req.path.startsWith('/agents') ||
    req.path.startsWith('/battles') ||
    req.path.startsWith('/arenas')
  ) {
    return res.status(301).json({
      success: false,
      error: `Use /v1${req.path} instead`,
      code: 'USE_V1_PREFIX',
    });
  }
  next();
});

app.use((_req, res) => {
  res.status(404).json({ success: false, error: 'Not found', code: 'NOT_FOUND' });
});

app.use(errorHandler);

module.exports = app;
