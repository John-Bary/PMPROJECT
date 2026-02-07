const crypto = require('crypto');

/**
 * Middleware that assigns a unique request ID to each incoming request.
 * The ID is attached to req.id and included in the response header X-Request-Id.
 * If the client sends an X-Request-Id header, it is preserved (useful for tracing
 * across services).
 */
function requestIdMiddleware(req, res, next) {
  const id = req.headers['x-request-id'] || crypto.randomUUID();
  req.id = id;
  res.setHeader('X-Request-Id', id);
  next();
}

module.exports = requestIdMiddleware;
