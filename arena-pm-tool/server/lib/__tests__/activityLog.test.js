const { query } = require('../../config/database');
const logger = require('../logger');
const { logActivity } = require('../activityLog');

jest.mock('../../config/database', () => ({ query: jest.fn() }));
jest.mock('../logger', () => ({ error: jest.fn(), warn: jest.fn(), info: jest.fn() }));

describe('Activity Log', () => {
  describe('logActivity', () => {
    it('should insert an activity log entry', async () => {
      query.mockResolvedValue({});

      await logActivity('ws-1', 1, 'created', 'task', 42, { title: 'New task' });

      expect(query).toHaveBeenCalledWith(
        expect.stringContaining('INSERT INTO activity_log'),
        ['ws-1', 1, 'created', 'task', '42', JSON.stringify({ title: 'New task' })]
      );
    });

    it('should stringify entity_id to string', async () => {
      query.mockResolvedValue({});

      await logActivity('ws-1', 1, 'deleted', 'category', 99);

      expect(query).toHaveBeenCalledWith(
        expect.any(String),
        expect.arrayContaining(['99'])
      );
    });

    it('should default metadata to empty object', async () => {
      query.mockResolvedValue({});

      await logActivity('ws-1', 1, 'updated', 'workspace', 'ws-1');

      expect(query).toHaveBeenCalledWith(
        expect.any(String),
        expect.arrayContaining([JSON.stringify({})])
      );
    });

    it('should not throw on database error', async () => {
      query.mockRejectedValue(new Error('DB connection lost'));

      await expect(logActivity('ws-1', 1, 'created', 'task', 1)).resolves.toBeUndefined();
    });

    it('should log database errors', async () => {
      query.mockRejectedValue(new Error('DB timeout'));

      await logActivity('ws-1', 1, 'created', 'task', 1);

      expect(logger.error).toHaveBeenCalledWith(
        'Activity log error: %s',
        'DB timeout'
      );
    });
  });
});
