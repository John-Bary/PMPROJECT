const { query } = require('../../config/database');
const logger = require('../../lib/logger');
const { auditLog } = require('../auditLog');

jest.mock('../../config/database', () => ({ query: jest.fn() }));
jest.mock('../../lib/logger', () => ({ error: jest.fn(), warn: jest.fn(), info: jest.fn() }));

describe('Audit Log Middleware', () => {
  let req, res, next, finishCallback;

  beforeEach(() => {
    finishCallback = null;
    req = createMockReq({
      user: { id: 1 },
      workspace: { id: 'ws-1' },
      params: { id: 'resource-1' },
      ip: '192.168.1.1',
    });
    req.get = jest.fn((header) => {
      if (header === 'user-agent') return 'TestBrowser/1.0';
      return null;
    });
    res = createMockRes();
    res.statusCode = 200;
    res.on = jest.fn((event, cb) => {
      if (event === 'finish') finishCallback = cb;
    });
    next = createMockNext();
    query.mockResolvedValue({});
  });

  it('should call next immediately', () => {
    const middleware = auditLog('task.created', 'task');

    middleware(req, res, next);

    expect(next).toHaveBeenCalled();
  });

  it('should register a finish event listener on response', () => {
    const middleware = auditLog('task.created', 'task');

    middleware(req, res, next);

    expect(res.on).toHaveBeenCalledWith('finish', expect.any(Function));
  });

  it('should insert audit log on successful response (2xx)', async () => {
    const middleware = auditLog('task.created', 'task');
    middleware(req, res, next);

    finishCallback();

    // Allow the fire-and-forget query to resolve
    await new Promise(r => setTimeout(r, 0));

    expect(query).toHaveBeenCalledWith(
      expect.stringContaining('INSERT INTO audit_logs'),
      ['ws-1', 1, 'task.created', 'task', 'resource-1', '192.168.1.1', 'TestBrowser/1.0']
    );
  });

  it('should not insert audit log for non-2xx responses', () => {
    res.statusCode = 400;
    const middleware = auditLog('task.created', 'task');
    middleware(req, res, next);

    finishCallback();

    expect(query).not.toHaveBeenCalled();
  });

  it('should not insert for 3xx responses', () => {
    res.statusCode = 301;
    const middleware = auditLog('redirect', 'resource');
    middleware(req, res, next);

    finishCallback();

    expect(query).not.toHaveBeenCalled();
  });

  it('should not insert for 5xx responses', () => {
    res.statusCode = 500;
    const middleware = auditLog('task.created', 'task');
    middleware(req, res, next);

    finishCallback();

    expect(query).not.toHaveBeenCalled();
  });

  it('should handle missing workspace gracefully', async () => {
    req.workspace = undefined;
    req.params = {};
    req.body = {};
    const middleware = auditLog('user.login', 'auth');
    middleware(req, res, next);

    finishCallback();
    await new Promise(r => setTimeout(r, 0));

    expect(query).toHaveBeenCalledWith(
      expect.any(String),
      [null, 1, 'user.login', 'auth', null, '192.168.1.1', 'TestBrowser/1.0']
    );
  });

  it('should handle missing user gracefully', async () => {
    req.user = undefined;
    const middleware = auditLog('task.created', 'task');
    middleware(req, res, next);

    finishCallback();
    await new Promise(r => setTimeout(r, 0));

    expect(query).toHaveBeenCalledWith(
      expect.any(String),
      expect.arrayContaining([null])
    );
  });

  it('should log database errors without throwing', async () => {
    query.mockRejectedValue(new Error('DB write failed'));
    const middleware = auditLog('task.created', 'task');
    middleware(req, res, next);

    finishCallback();
    await new Promise(r => setTimeout(r, 10));

    expect(logger.error).toHaveBeenCalledWith(
      expect.objectContaining({ err: expect.any(Error), action: 'task.created', resourceType: 'task' }),
      'Failed to write audit log'
    );
  });
});
