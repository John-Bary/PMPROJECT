const Sentry = require('./sentry');
const AppError = require('./AppError');
const logger = require('./logger');

/**
 * Wraps an async Express route handler to automatically capture
 * unhandled errors with Sentry and return an appropriate response.
 *
 * - AppError instances return their statusCode and user-safe message
 * - Unknown errors return 500 with a generic message
 * - All errors are reported to Sentry with request context
 */
function withErrorHandling(handler) {
  return async (req, res, next) => {
    try {
      return await handler(req, res, next);
    } catch (error) {
      const requestId = req.id || 'unknown';
      const isAppError = error instanceof AppError;
      const statusCode = isAppError ? error.statusCode : 500;

      // Only report unexpected errors to Sentry (not 4xx operational errors)
      if (!isAppError || !error.isOperational) {
        Sentry.captureException(error, {
          extra: {
            url: req.originalUrl,
            method: req.method,
            userId: req.user?.id,
            workspaceId: req.query?.workspace_id || req.params?.id,
            requestId,
          },
        });
      }

      const logContext = {
        requestId,
        method: req.method,
        url: req.originalUrl,
        statusCode,
        userId: req.user?.id,
        err: isAppError ? undefined : error,
      };
      const logMessage = isAppError && error.internalMessage
        ? error.internalMessage
        : error.message;

      if (statusCode >= 500) {
        logger.error(logContext, logMessage);
      } else {
        logger.warn(logContext, logMessage);
      }

      const response = {
        status: 'error',
        message: isAppError ? error.message : 'Internal server error',
        requestId,
      };

      // Include error details in non-production for debugging
      if (process.env.NODE_ENV !== 'production' && !isAppError) {
        response.error = error.message;
      }

      res.status(statusCode).json(response);
    }
  };
}

module.exports = withErrorHandling;
