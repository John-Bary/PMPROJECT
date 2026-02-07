// Zod-based request validation middleware
// Validates req.body, req.query, or req.params against a Zod schema.
// Usage: router.post('/tasks', validate(createTaskSchema), controller.create)

const { ZodError } = require('zod');

/**
 * Express middleware that validates request data against a Zod schema.
 * @param {Object} schemas - Object with optional keys: body, query, params
 */
const validate = (schemas) => (req, res, next) => {
  const errors = [];

  for (const [key, schema] of Object.entries(schemas)) {
    if (!schema) continue;
    const data = req[key];
    try {
      // Parse and replace with sanitized/coerced values
      req[key] = schema.parse(data);
    } catch (error) {
      if (error instanceof ZodError) {
        // Zod 4 uses .issues, Zod 3 uses .errors
        const issues = error.issues || error.errors || [];
        errors.push(
          ...issues.map((e) => ({
            field: (e.path || []).join('.'),
            message: e.message,
            source: key,
          }))
        );
      } else {
        throw error;
      }
    }
  }

  if (errors.length > 0) {
    return res.status(400).json({
      status: 'error',
      message: errors[0].message,
      errors,
    });
  }

  next();
};

module.exports = validate;
