const Sentry = require('./sentry');

/**
 * Wraps an async Express route handler to automatically capture
 * unhandled errors with Sentry and return a 500 response.
 */
function withErrorHandling(handler) {
  return async (req, res, next) => {
    try {
      return await handler(req, res, next);
    } catch (error) {
      Sentry.captureException(error, {
        extra: {
          url: req.originalUrl,
          method: req.method,
          userId: req.user?.id,
        },
      });
      console.error('Unhandled route error:', error);
      res.status(500).json({
        status: 'error',
        message: 'Internal server error',
      });
    }
  };
}

module.exports = withErrorHandling;
