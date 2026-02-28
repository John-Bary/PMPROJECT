jest.mock('../sentry', () => ({ captureException: jest.fn() }));
jest.mock('../logger', () => ({ error: jest.fn(), warn: jest.fn(), info: jest.fn() }));

const withErrorHandling = require('../withErrorHandling');
const AppError = require('../AppError');
const Sentry = require('../sentry');
const logger = require('../logger');

const mockReq = (overrides = {}) => ({
  id: 'req-123',
  method: 'GET',
  originalUrl: '/api/test',
  user: { id: 1 },
  query: {},
  params: {},
  ...overrides,
});

const mockRes = () => {
  const res = {};
  res.status = jest.fn().mockReturnValue(res);
  res.json = jest.fn().mockReturnValue(res);
  return res;
};

const mockNext = jest.fn();

beforeEach(() => {
  jest.clearAllMocks();
  delete process.env.NODE_ENV;
});

describe('withErrorHandling', () => {
  describe('Happy path', () => {
    it('calls the wrapped handler', async () => {
      const handler = jest.fn();
      const wrapped = withErrorHandling(handler);
      const req = mockReq();
      const res = mockRes();

      await wrapped(req, res, mockNext);

      expect(handler).toHaveBeenCalledWith(req, res, mockNext);
    });

    it('returns handler result', async () => {
      const handler = jest.fn().mockResolvedValue({ data: 'ok' });
      const wrapped = withErrorHandling(handler);

      const result = await wrapped(mockReq(), mockRes(), mockNext);

      expect(result).toEqual({ data: 'ok' });
    });

    it('does not interfere with successful handlers', async () => {
      const handler = jest.fn().mockResolvedValue(undefined);
      const wrapped = withErrorHandling(handler);
      const res = mockRes();

      await wrapped(mockReq(), res, mockNext);

      expect(res.status).not.toHaveBeenCalled();
      expect(res.json).not.toHaveBeenCalled();
      expect(Sentry.captureException).not.toHaveBeenCalled();
      expect(logger.error).not.toHaveBeenCalled();
      expect(logger.warn).not.toHaveBeenCalled();
    });
  });

  describe('AppError handling', () => {
    it("returns AppError's statusCode and message", async () => {
      const handler = jest.fn().mockRejectedValue(AppError.badRequest('Invalid input'));
      const wrapped = withErrorHandling(handler);
      const res = mockRes();

      await wrapped(mockReq(), res, mockNext);

      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({
          status: 'error',
          message: 'Invalid input',
        })
      );
    });

    it('does not report operational AppErrors to Sentry', async () => {
      const handler = jest.fn().mockRejectedValue(AppError.notFound('Task not found'));
      const wrapped = withErrorHandling(handler);

      await wrapped(mockReq(), mockRes(), mockNext);

      expect(Sentry.captureException).not.toHaveBeenCalled();
    });

    it('logs with logger.warn for 4xx errors', async () => {
      const handler = jest.fn().mockRejectedValue(AppError.forbidden());
      const wrapped = withErrorHandling(handler);

      await wrapped(mockReq(), mockRes(), mockNext);

      expect(logger.warn).toHaveBeenCalledTimes(1);
      expect(logger.error).not.toHaveBeenCalled();
    });

    it('uses internalMessage for log message when present', async () => {
      const handler = jest.fn().mockRejectedValue(
        AppError.badRequest('Bad data', 'column X violated constraint Y')
      );
      const wrapped = withErrorHandling(handler);

      await wrapped(mockReq(), mockRes(), mockNext);

      expect(logger.warn).toHaveBeenCalledWith(
        expect.any(Object),
        'column X violated constraint Y'
      );
    });

    it('includes requestId in response', async () => {
      const handler = jest.fn().mockRejectedValue(AppError.notFound());
      const wrapped = withErrorHandling(handler);
      const res = mockRes();

      await wrapped(mockReq(), res, mockNext);

      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({ requestId: 'req-123' })
      );
    });
  });

  describe('Unknown error handling', () => {
    it('returns 500 for unknown errors', async () => {
      const handler = jest.fn().mockRejectedValue(new Error('Something broke'));
      const wrapped = withErrorHandling(handler);
      const res = mockRes();

      await wrapped(mockReq(), res, mockNext);

      expect(res.status).toHaveBeenCalledWith(500);
    });

    it("returns 'Internal server error' message (not the actual error)", async () => {
      const handler = jest.fn().mockRejectedValue(new Error('DB connection lost'));
      const wrapped = withErrorHandling(handler);
      const res = mockRes();

      await wrapped(mockReq(), res, mockNext);

      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({ message: 'Internal server error' })
      );
      expect(res.json).not.toHaveBeenCalledWith(
        expect.objectContaining({ message: 'DB connection lost' })
      );
    });

    it('reports to Sentry with request context', async () => {
      const error = new Error('Unexpected failure');
      const handler = jest.fn().mockRejectedValue(error);
      const wrapped = withErrorHandling(handler);
      const req = mockReq({ query: { workspace_id: 'ws-42' } });

      await wrapped(req, mockRes(), mockNext);

      expect(Sentry.captureException).toHaveBeenCalledWith(error, {
        extra: {
          url: '/api/test',
          method: 'GET',
          userId: 1,
          workspaceId: 'ws-42',
          requestId: 'req-123',
        },
      });
    });

    it('logs with logger.error for 500 errors', async () => {
      const handler = jest.fn().mockRejectedValue(new Error('crash'));
      const wrapped = withErrorHandling(handler);

      await wrapped(mockReq(), mockRes(), mockNext);

      expect(logger.error).toHaveBeenCalledTimes(1);
      expect(logger.warn).not.toHaveBeenCalled();
    });

    it('includes error details in non-production (response.error)', async () => {
      process.env.NODE_ENV = 'development';
      const handler = jest.fn().mockRejectedValue(new Error('detailed failure'));
      const wrapped = withErrorHandling(handler);
      const res = mockRes();

      await wrapped(mockReq(), res, mockNext);

      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({ error: 'detailed failure' })
      );
    });

    it("uses 'unknown' as requestId when req.id is missing", async () => {
      const handler = jest.fn().mockRejectedValue(new Error('oops'));
      const wrapped = withErrorHandling(handler);
      const req = mockReq({ id: undefined });
      const res = mockRes();

      await wrapped(req, res, mockNext);

      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({ requestId: 'unknown' })
      );
    });
  });

  describe('AppError.internal (non-operational)', () => {
    it('reports non-operational AppErrors to Sentry', async () => {
      const error = AppError.internal('Internal server error', 'null pointer in service');
      const handler = jest.fn().mockRejectedValue(error);
      const wrapped = withErrorHandling(handler);

      await wrapped(mockReq(), mockRes(), mockNext);

      expect(Sentry.captureException).toHaveBeenCalledWith(error, expect.any(Object));
    });
  });
});
