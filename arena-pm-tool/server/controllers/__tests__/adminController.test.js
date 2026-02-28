// Tests for admin controller
const { query } = require('../../config/database');

jest.mock('../../config/database', () => ({
  query: jest.fn(),
  getClient: jest.fn(),
}));

jest.mock('../../lib/logger', () => ({
  info: jest.fn(),
  error: jest.fn(),
  warn: jest.fn(),
}));

const { getStats } = require('../adminController');

describe('Admin Controller — getStats', () => {
  let req, res;

  beforeEach(() => {
    jest.clearAllMocks();
    req = {
      user: { id: 2, email: 'admin@example.com', role: 'admin' },
      body: {},
      params: {},
      query: {},
      cookies: {},
      headers: {},
    };
    res = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn().mockReturnThis(),
    };
  });

  it('should return 403 when user is not an admin', async () => {
    req.user = { id: 1, role: 'member' };

    await getStats(req, res);

    expect(res.status).toHaveBeenCalledWith(403);
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({
        status: 'error',
        message: 'Admin access required',
      })
    );
    expect(query).not.toHaveBeenCalled();
  });

  it('should return stats successfully for admin user', async () => {
    // Users query
    query.mockResolvedValueOnce({
      rows: [{ total: '150', new_30d: '30', new_7d: '10', verified: '120' }],
    });
    // Workspaces query
    query.mockResolvedValueOnce({
      rows: [{ total: '45' }],
    });
    // Tasks query
    query.mockResolvedValueOnce({
      rows: [{ total: '800', completed: '300', new_7d: '50' }],
    });
    // Subscriptions query
    query.mockResolvedValueOnce({
      rows: [{ total: '20', active: '15', pro: '8' }],
    });

    await getStats(req, res);

    expect(res.json).toHaveBeenCalledWith({
      status: 'success',
      data: {
        users: { total: 150, new30d: 30, new7d: 10, verified: 120 },
        workspaces: { total: 45 },
        tasks: { total: 800, completed: 300, new7d: 50 },
        subscriptions: { total: 20, active: 15, pro: 8 },
      },
    });
  });

  it('should query all four tables (users, workspaces, tasks, subscriptions)', async () => {
    query.mockResolvedValueOnce({ rows: [{ total: '0', new_30d: '0', new_7d: '0', verified: '0' }] });
    query.mockResolvedValueOnce({ rows: [{ total: '0' }] });
    query.mockResolvedValueOnce({ rows: [{ total: '0', completed: '0', new_7d: '0' }] });
    query.mockResolvedValueOnce({ rows: [{ total: '0', active: '0', pro: '0' }] });

    await getStats(req, res);

    // Promise.all fires all four queries
    expect(query).toHaveBeenCalledTimes(4);
    const sqlTexts = query.mock.calls.map((call) => call[0]);
    expect(sqlTexts.some((sql) => sql.includes('FROM users'))).toBe(true);
    expect(sqlTexts.some((sql) => sql.includes('FROM workspaces'))).toBe(true);
    expect(sqlTexts.some((sql) => sql.includes('FROM tasks'))).toBe(true);
    expect(sqlTexts.some((sql) => sql.includes('FROM subscriptions'))).toBe(true);
  });

  it('should return correct integer types (not strings) in response', async () => {
    query.mockResolvedValueOnce({ rows: [{ total: '5', new_30d: '2', new_7d: '1', verified: '3' }] });
    query.mockResolvedValueOnce({ rows: [{ total: '10' }] });
    query.mockResolvedValueOnce({ rows: [{ total: '20', completed: '7', new_7d: '4' }] });
    query.mockResolvedValueOnce({ rows: [{ total: '3', active: '2', pro: '1' }] });

    await getStats(req, res);

    const { data } = res.json.mock.calls[0][0];
    expect(typeof data.users.total).toBe('number');
    expect(typeof data.workspaces.total).toBe('number');
    expect(typeof data.tasks.completed).toBe('number');
    expect(typeof data.subscriptions.pro).toBe('number');
  });

  it('should handle database errors and return 500', async () => {
    query.mockRejectedValueOnce(new Error('Connection refused'));

    await getStats(req, res);

    expect(res.status).toHaveBeenCalledWith(500);
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({
        status: 'error',
        message: 'Error fetching admin stats',
      })
    );
  });

  it('should include error.message in non-production environments', async () => {
    query.mockRejectedValueOnce(new Error('Some DB error'));

    await getStats(req, res);

    expect(res.status).toHaveBeenCalledWith(500);
    const responseBody = res.json.mock.calls[0][0];
    expect(responseBody.error).toBe('Some DB error');
  });

  it('should hide error details when NODE_ENV is production (line 7 branch)', async () => {
    const originalNodeEnv = process.env.NODE_ENV;
    process.env.NODE_ENV = 'production';

    // Re-require the module to pick up the new NODE_ENV for safeError
    jest.resetModules();

    // Re-mock dependencies before requiring
    jest.mock('../../config/database', () => ({
      query: jest.fn(),
      getClient: jest.fn(),
    }));
    jest.mock('../../lib/logger', () => ({
      info: jest.fn(),
      error: jest.fn(),
      warn: jest.fn(),
    }));

    const { query: prodQuery } = require('../../config/database');
    const { getStats: prodGetStats } = require('../adminController');

    prodQuery.mockRejectedValueOnce(new Error('Sensitive DB error'));

    await prodGetStats(req, res);

    expect(res.status).toHaveBeenCalledWith(500);
    const responseBody = res.json.mock.calls[0][0];
    expect(responseBody.error).toBeUndefined();

    process.env.NODE_ENV = originalNodeEnv;
  });
});
