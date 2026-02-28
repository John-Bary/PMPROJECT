const crypto = require('crypto');
const requestIdMiddleware = require('../requestId');

describe('Request ID Middleware', () => {
  let req, res, next;

  beforeEach(() => {
    req = createMockReq();
    res = createMockRes();
    res.setHeader = jest.fn();
    next = createMockNext();
  });

  it('should generate a UUID when no X-Request-Id header is provided', () => {
    requestIdMiddleware(req, res, next);

    // crypto.randomUUID() produces a v4 UUID
    expect(req.id).toMatch(
      /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i
    );
  });

  it('should set req.id to the generated UUID', () => {
    requestIdMiddleware(req, res, next);

    expect(req.id).toBeDefined();
    expect(typeof req.id).toBe('string');
    expect(req.id.length).toBeGreaterThan(0);
  });

  it('should set X-Request-Id response header to the same value as req.id', () => {
    requestIdMiddleware(req, res, next);

    expect(res.setHeader).toHaveBeenCalledWith('X-Request-Id', req.id);
  });

  it('should preserve a client-provided X-Request-Id header', () => {
    req.headers['x-request-id'] = 'client-trace-abc-123';

    requestIdMiddleware(req, res, next);

    expect(req.id).toBe('client-trace-abc-123');
    expect(res.setHeader).toHaveBeenCalledWith('X-Request-Id', 'client-trace-abc-123');
  });

  it('should call next()', () => {
    requestIdMiddleware(req, res, next);

    expect(next).toHaveBeenCalledTimes(1);
    expect(next).toHaveBeenCalledWith();
  });
});
