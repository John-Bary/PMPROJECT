// Alerting thresholds and monitoring
const logger = require('./logger');
const { query } = require('../config/database');

// Threshold constants
const THRESHOLDS = {
  ERROR_RATE: 0.05, // 5%
  P95_RESPONSE_TIME_MS: 2000,
  EMAIL_QUEUE_BACKLOG_MAX: 100,
  DB_POOL_EXHAUSTION: 0.9, // 90%
  FAILED_PAYMENT_WEBHOOK: 3,
};

// Track request metrics in memory (reset periodically)
const metrics = {
  totalRequests: 0,
  errorRequests: 0,
  responseTimes: [],
  failedWebhooks: 0,
  lastReset: Date.now(),
};

function recordRequest(statusCode, responseTimeMs) {
  metrics.totalRequests++;
  if (statusCode >= 500) metrics.errorRequests++;
  metrics.responseTimes.push(responseTimeMs);
}

function recordFailedWebhook() {
  metrics.failedWebhooks++;
}

async function checkAlertThresholds() {
  try {
    // Error rate check
    if (metrics.totalRequests > 0) {
      const errorRate = metrics.errorRequests / metrics.totalRequests;
      if (errorRate > THRESHOLDS.ERROR_RATE) {
        logger.warn({ alert: true, metric: 'error_rate', value: errorRate, threshold: THRESHOLDS.ERROR_RATE },
          `Error rate ${(errorRate * 100).toFixed(1)}% exceeds threshold ${THRESHOLDS.ERROR_RATE * 100}%`);
      }
    }

    // P95 response time check
    if (metrics.responseTimes.length > 0) {
      const sorted = [...metrics.responseTimes].sort((a, b) => a - b);
      const p95Index = Math.floor(sorted.length * 0.95);
      const p95 = sorted[p95Index] || 0;
      if (p95 > THRESHOLDS.P95_RESPONSE_TIME_MS) {
        logger.warn({ alert: true, metric: 'p95_response_time', value: p95, threshold: THRESHOLDS.P95_RESPONSE_TIME_MS },
          `P95 response time ${p95}ms exceeds threshold ${THRESHOLDS.P95_RESPONSE_TIME_MS}ms`);
      }
    }

    // Email queue backlog check
    try {
      const result = await query(
        "SELECT COUNT(*) as count FROM email_queue WHERE status = 'pending'"
      );
      const backlog = parseInt(result.rows[0]?.count || 0);
      if (backlog > THRESHOLDS.EMAIL_QUEUE_BACKLOG_MAX) {
        logger.warn({ alert: true, metric: 'email_queue_backlog', value: backlog, threshold: THRESHOLDS.EMAIL_QUEUE_BACKLOG_MAX },
          `Email queue backlog ${backlog} exceeds threshold ${THRESHOLDS.EMAIL_QUEUE_BACKLOG_MAX}`);
      }
    } catch {
      // email_queue table may not exist yet
    }

    // Failed webhook check
    if (metrics.failedWebhooks > THRESHOLDS.FAILED_PAYMENT_WEBHOOK) {
      logger.warn({ alert: true, metric: 'failed_webhooks', value: metrics.failedWebhooks, threshold: THRESHOLDS.FAILED_PAYMENT_WEBHOOK },
        `Failed payment webhooks ${metrics.failedWebhooks} exceeds threshold ${THRESHOLDS.FAILED_PAYMENT_WEBHOOK}`);
    }

    // Reset metrics every 60 seconds
    if (Date.now() - metrics.lastReset > 60000) {
      metrics.totalRequests = 0;
      metrics.errorRequests = 0;
      metrics.responseTimes = [];
      metrics.failedWebhooks = 0;
      metrics.lastReset = Date.now();
    }
  } catch (error) {
    logger.error({ err: error }, 'Failed to check alert thresholds');
  }
}

module.exports = { THRESHOLDS, metrics, recordRequest, recordFailedWebhook, checkAlertThresholds };
