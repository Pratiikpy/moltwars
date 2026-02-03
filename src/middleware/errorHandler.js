const logger = require('../config/logger');
const { ApiError } = require('../errors');

function asyncHandler(fn) {
  return (req, res, next) => {
    Promise.resolve(fn(req, res, next)).catch(next);
  };
}

function errorHandler(err, req, res, _next) {
  if (err instanceof ApiError) {
    const body = {
      success: false,
      error: err.message,
      code: err.code,
    };
    if (err.details) {
      body.details = err.details;
    }
    if (err.retryAfter) {
      res.set('Retry-After', String(err.retryAfter));
    }
    return res.status(err.statusCode).json(body);
  }

  logger.error({ err, path: req.path, method: req.method }, 'Unexpected error');

  return res.status(500).json({
    success: false,
    error: 'Internal server error',
    code: 'INTERNAL_ERROR',
  });
}

module.exports = { asyncHandler, errorHandler };
