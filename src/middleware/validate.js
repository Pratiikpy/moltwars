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

module.exports = { validate };
