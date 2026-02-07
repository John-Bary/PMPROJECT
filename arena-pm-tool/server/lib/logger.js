// Structured Logger
// Wraps pino for structured JSON logging with request context.
// Usage:
//   const logger = require('./lib/logger');
//   logger.info({ userId: 1, workspaceId: 'abc' }, 'Task created');
//   logger.error({ err, requestId }, 'Database query failed');

const pino = require('pino');

const isProduction = process.env.NODE_ENV === 'production';

const logger = pino({
  level: process.env.LOG_LEVEL || (isProduction ? 'info' : 'debug'),

  // In production, emit pure JSON (for log aggregators like Datadog, Loki).
  // In development, use pino's default (still JSON but more readable with pino-pretty).
  ...(isProduction
    ? {
        formatters: {
          level(label) {
            return { level: label };
          },
        },
        timestamp: pino.stdTimeFunctions.isoTime,
      }
    : {
        transport: {
          target: 'pino/file',
          options: { destination: 1 }, // stdout
        },
        timestamp: pino.stdTimeFunctions.isoTime,
      }),

  // Redact sensitive fields from logs
  redact: {
    paths: ['req.headers.authorization', 'req.headers.cookie', 'password', 'token'],
    censor: '[REDACTED]',
  },

  // Base fields included in every log line
  base: {
    service: 'todoria-api',
    env: process.env.NODE_ENV || 'development',
  },
});

module.exports = logger;
