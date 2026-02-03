class ApiError extends Error {
  constructor(message, statusCode, code) {
    super(message);
    this.name = this.constructor.name;
    this.statusCode = statusCode;
    this.code = code || this.name;
    this.isOperational = true;
  }
}

class NotFoundError extends ApiError {
  constructor(resource = 'Resource') {
    super(`${resource} not found`, 404, 'NOT_FOUND');
  }
}

class UnauthorizedError extends ApiError {
  constructor(message = 'Authentication required') {
    super(message, 401, 'UNAUTHORIZED');
  }
}

class ForbiddenError extends ApiError {
  constructor(message = 'Forbidden') {
    super(message, 403, 'FORBIDDEN');
  }
}

class ValidationError extends ApiError {
  constructor(message = 'Validation failed', details) {
    super(message, 400, 'VALIDATION_ERROR');
    this.details = details;
  }
}

class ConflictError extends ApiError {
  constructor(message = 'Conflict') {
    super(message, 409, 'CONFLICT');
  }
}

class RateLimitError extends ApiError {
  constructor(retryAfterMs) {
    super('Too many requests', 429, 'RATE_LIMITED');
    this.retryAfter = Math.ceil(retryAfterMs / 1000);
  }
}

module.exports = {
  ApiError,
  NotFoundError,
  UnauthorizedError,
  ForbiddenError,
  ValidationError,
  ConflictError,
  RateLimitError,
};
