const { ValidationError } = require('../errors');

function validate(schema, source = 'body') {
  return (req, _res, next) => {
    const result = schema.safeParse(req[source]);
    if (!result.success) {
      const details = result.error.issues.map((i) => ({
        path: i.path.join('.'),
        message: i.message,
      }));
      throw new ValidationError('Validation failed', details);
    }
    req.validated = result.data;
    next();
  };
}

function validateParams(schema) {
  return (req, _res, next) => {
    const result = schema.safeParse(req.params);
    if (!result.success) {
      const details = result.error.issues.map((i) => ({
        path: i.path.join('.'),
        message: i.message,
      }));
      throw new ValidationError('Invalid URL parameters', details);
    }
    // Merge validated params into req.params
    Object.assign(req.params, result.data);
    next();
  };
}

module.exports = { validate, validateParams };
