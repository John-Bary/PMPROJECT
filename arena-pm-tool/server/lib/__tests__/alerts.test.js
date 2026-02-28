const { query } = require('../../config/database');
const logger = require('../logger');
const { THRESHOLDS, metrics, recordRequest, recordFailedWebhook, checkAlertThresholds } = require('../alerts');

jest.mock('../../config/database', () => ({ query: jest.fn() }));
jest.mock('../logger', () => ({ error: jest.fn(), warn: jest.fn(), info: jest.fn() }));

describe('Alerts', () => {
  beforeEach(() => {
    metrics.totalRequests = 0;
    metrics.errorRequests = 0;
    metrics.responseTimes = [];
    metrics.failedWebhooks = 0;
    metrics.lastReset = Date.now();
  });

  describe('THRESHOLDS', () => {
    it('should define expected threshold constants', () => {
      expect(THRESHOLDS.ERROR_RATE).toBe(0.05);
      expect(THRESHOLDS.P95_RESPONSE_TIME_MS).toBe(2000);
      expect(THRESHOLDS.EMAIL_QUEUE_BACKLOG_MAX).toBe(100);
      expect(THRESHOLDS.DB_POOL_EXHAUSTION).toBe(0.9);
      expect(THRESHOLDS.FAILED_PAYMENT_WEBHOOK).toBe(3);
    });
  });

  describe('recordRequest', () => {
    it('should increment totalRequests', () => {
      recordRequest(200, 50);
      expect(metrics.totalRequests).toBe(1);
    });

    it('should increment errorRequests for 5xx status codes', () => {
      recordRequest(500, 100);
      expect(metrics.errorRequests).toBe(1);
    });

    it('should not increment errorRequests for 4xx status codes', () => {
      recordRequest(400, 100);
      expect(metrics.errorRequests).toBe(0);
    });

    it('should track response times', () => {
      recordRequest(200, 50);
      recordRequest(200, 120);
      expect(metrics.responseTimes).toEqual([50, 120]);
    });
  });

  describe('recordFailedWebhook', () => {
    it('should increment failedWebhooks counter', () => {
      recordFailedWebhook();
      recordFailedWebhook();
      expect(metrics.failedWebhooks).toBe(2);
    });
  });

  describe('checkAlertThresholds', () => {
    it('should warn when error rate exceeds threshold', async () => {
      // 10% error rate (above 5% threshold)
      metrics.totalRequests = 100;
      metrics.errorRequests = 10;
      query.mockResolvedValue({ rows: [{ count: '0' }] });

      await checkAlertThresholds();

      expect(logger.warn).toHaveBeenCalledWith(
        expect.objectContaining({ alert: true, metric: 'error_rate' }),
        expect.stringContaining('10.0%')
      );
    });

    it('should not warn when error rate is below threshold', async () => {
      metrics.totalRequests = 100;
      metrics.errorRequests = 1; // 1% — below 5%
      query.mockResolvedValue({ rows: [{ count: '0' }] });

      await checkAlertThresholds();

      expect(logger.warn).not.toHaveBeenCalledWith(
        expect.objectContaining({ metric: 'error_rate' }),
        expect.any(String)
      );
    });

    it('should warn when P95 response time exceeds threshold', async () => {
      // 20 requests, all fast except the last one
      for (let i = 0; i < 19; i++) metrics.responseTimes.push(100);
      metrics.responseTimes.push(3000); // P95 will be 3000ms
      query.mockResolvedValue({ rows: [{ count: '0' }] });

      await checkAlertThresholds();

      expect(logger.warn).toHaveBeenCalledWith(
        expect.objectContaining({ alert: true, metric: 'p95_response_time' }),
        expect.stringContaining('3000ms')
      );
    });

    it('should not warn when P95 is below threshold', async () => {
      metrics.responseTimes = [100, 200, 300, 400, 500];
      query.mockResolvedValue({ rows: [{ count: '0' }] });

      await checkAlertThresholds();

      expect(logger.warn).not.toHaveBeenCalledWith(
        expect.objectContaining({ metric: 'p95_response_time' }),
        expect.any(String)
      );
    });

    it('should fall back to 0 when p95Index exceeds array bounds', async () => {
      // A single-element array: sorted.length=1, p95Index=Math.floor(0.95)=0
      // but we need p95Index to exceed bounds. With length=1, index=0 is valid.
      // With an empty-ish scenario the block is skipped. We need sorted[p95Index] to be undefined.
      // Math.floor(1 * 0.95) = 0 => sorted[0] exists.
      // Math.floor(2 * 0.95) = 1 => sorted[1] exists.
      // Math.floor(20 * 0.95) = 19 => sorted[19] exists (last element, 0-indexed).
      // The only way sorted[p95Index] is undefined is if p95Index === sorted.length.
      // Math.floor(n * 0.95) === n only when n=0 (skipped) or never for positive integers.
      // Actually Math.floor(20 * 0.95) = 19, array length 20, index 19 is last valid.
      // For length=20: index=19 valid. For length=1: index=0 valid.
      // sorted[p95Index] can be undefined if the value at that index is itself undefined.
      // We can push undefined into responseTimes to make sorted[p95Index] undefined.
      metrics.responseTimes = [undefined];
      query.mockResolvedValue({ rows: [{ count: '0' }] });

      await checkAlertThresholds();

      // p95 falls back to 0 via || 0, which is below threshold, so no warn
      expect(logger.warn).not.toHaveBeenCalledWith(
        expect.objectContaining({ metric: 'p95_response_time' }),
        expect.any(String)
      );
    });

    it('should warn when email queue backlog exceeds threshold', async () => {
      query.mockResolvedValue({ rows: [{ count: '150' }] });

      await checkAlertThresholds();

      expect(logger.warn).toHaveBeenCalledWith(
        expect.objectContaining({ alert: true, metric: 'email_queue_backlog', value: 150 }),
        expect.stringContaining('150')
      );
    });

    it('should not warn when email queue is below threshold', async () => {
      query.mockResolvedValue({ rows: [{ count: '10' }] });

      await checkAlertThresholds();

      expect(logger.warn).not.toHaveBeenCalledWith(
        expect.objectContaining({ metric: 'email_queue_backlog' }),
        expect.any(String)
      );
    });

    it('should default backlog to 0 when result.rows is empty', async () => {
      query.mockResolvedValue({ rows: [] });

      await checkAlertThresholds();

      // backlog is parseInt(undefined || 0) = 0, which is below threshold
      expect(logger.warn).not.toHaveBeenCalledWith(
        expect.objectContaining({ metric: 'email_queue_backlog' }),
        expect.any(String)
      );
    });

    it('should handle missing email_queue table gracefully', async () => {
      query.mockRejectedValue(new Error('relation "email_queue" does not exist'));

      await checkAlertThresholds();

      // Should not throw, should not log an error for the table missing
      expect(logger.error).not.toHaveBeenCalled();
    });

    it('should warn when failed webhooks exceed threshold', async () => {
      metrics.failedWebhooks = 5; // Above threshold of 3
      query.mockResolvedValue({ rows: [{ count: '0' }] });

      await checkAlertThresholds();

      expect(logger.warn).toHaveBeenCalledWith(
        expect.objectContaining({ alert: true, metric: 'failed_webhooks', value: 5 }),
        expect.stringContaining('5')
      );
    });

    it('should reset metrics after 60 seconds', async () => {
      metrics.totalRequests = 50;
      metrics.errorRequests = 5;
      metrics.responseTimes = [100, 200];
      metrics.failedWebhooks = 2;
      metrics.lastReset = Date.now() - 61000; // 61 seconds ago
      query.mockResolvedValue({ rows: [{ count: '0' }] });

      await checkAlertThresholds();

      expect(metrics.totalRequests).toBe(0);
      expect(metrics.errorRequests).toBe(0);
      expect(metrics.responseTimes).toEqual([]);
      expect(metrics.failedWebhooks).toBe(0);
    });

    it('should not reset metrics before 60 seconds', async () => {
      metrics.totalRequests = 50;
      metrics.lastReset = Date.now() - 30000; // 30 seconds ago
      query.mockResolvedValue({ rows: [{ count: '0' }] });

      await checkAlertThresholds();

      expect(metrics.totalRequests).toBe(50);
    });

    it('should handle unexpected errors gracefully', async () => {
      // Corrupt responseTimes to cause a TypeError in the sort/P95 calculation
      metrics.responseTimes = null;
      query.mockResolvedValue({ rows: [{ count: '0' }] });

      await checkAlertThresholds();

      expect(logger.error).toHaveBeenCalledWith(
        expect.objectContaining({ err: expect.any(Error) }),
        'Failed to check alert thresholds'
      );
    });
  });
});
