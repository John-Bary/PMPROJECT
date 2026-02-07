/**
 * Custom application error class with HTTP status codes and safe messages.
 * Distinguishes between operational errors (expected, user-safe) and
 * programming errors (unexpected, log-only).
 */
class AppError extends Error {
  /**
   * @param {string} message - User-safe error message
   * @param {number} statusCode - HTTP status code (default 500)
   * @param {object} [options]
   * @param {string} [options.internalMessage] - Detailed message for logs only
   * @param {boolean} [options.isOperational] - Whether this is an expected error (default true)
   */
  constructor(message, statusCode = 500, options = {}) {
    super(message);
    this.name = 'AppError';
    this.statusCode = statusCode;
    this.isOperational = options.isOperational !== undefined ? options.isOperational : true;
    this.internalMessage = options.internalMessage || null;

    Error.captureStackTrace(this, this.constructor);
  }

  static badRequest(message, internalMessage) {
    return new AppError(message, 400, { internalMessage });
  }

  static unauthorized(message = 'Authentication required') {
    return new AppError(message, 401);
  }

  static forbidden(message = 'Access denied') {
    return new AppError(message, 403);
  }

  static notFound(message = 'Resource not found') {
    return new AppError(message, 404);
  }

  static conflict(message, internalMessage) {
    return new AppError(message, 409, { internalMessage });
  }

  static internal(userMessage = 'Internal server error', internalMessage) {
    return new AppError(userMessage, 500, { internalMessage, isOperational: false });
  }
}

module.exports = AppError;
