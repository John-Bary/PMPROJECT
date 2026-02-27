const jwt = require('jsonwebtoken');
const { authMiddleware, adminMiddleware } = require('../auth');

// Mock jsonwebtoken
jest.mock('jsonwebtoken');
jest.mock('../../lib/sentry', () => ({
  setUser: jest.fn(),
}));

describe('Auth Middleware', () => {
  let req, res, next;

  beforeEach(() => {
    req = createMockReq();
    res = createMockRes();
    next = createMockNext();
    jest.clearAllMocks();
  });

  describe('authMiddleware', () => {
    it('should return 401 when no token is provided', async () => {
      await authMiddleware(req, res, next);

      expect(res.status).toHaveBeenCalledWith(401);
      expect(res.json).toHaveBeenCalledWith({
        status: 'error',
        message: 'Access denied. No authentication token provided.'
      });
      expect(next).not.toHaveBeenCalled();
    });

    it('should return 401 for invalid JWT token', async () => {
      req.cookies.token = 'invalid-token';
      jwt.verify.mockImplementation(() => {
        const error = new Error('Invalid token');
        error.name = 'JsonWebTokenError';
        throw error;
      });

      await authMiddleware(req, res, next);

      expect(res.status).toHaveBeenCalledWith(401);
      expect(res.json).toHaveBeenCalledWith({
        status: 'error',
        message: 'Invalid authentication token.'
      });
      expect(next).not.toHaveBeenCalled();
    });

    it('should return 401 for expired JWT token', async () => {
      req.cookies.token = 'expired-token';
      jwt.verify.mockImplementation(() => {
        const error = new Error('Token expired');
        error.name = 'TokenExpiredError';
        throw error;
      });

      await authMiddleware(req, res, next);

      expect(res.status).toHaveBeenCalledWith(401);
      expect(res.json).toHaveBeenCalledWith({
        status: 'error',
        message: 'Authentication token has expired. Please login again.'
      });
      expect(next).not.toHaveBeenCalled();
    });

    it('should return 500 for other errors', async () => {
      req.cookies.token = 'some-token';
      jwt.verify.mockImplementation(() => {
        throw new Error('Some unexpected error');
      });

      await authMiddleware(req, res, next);

      expect(res.status).toHaveBeenCalledWith(500);
      expect(res.json).toHaveBeenCalledWith({
        status: 'error',
        message: 'Authentication error'
      });
      expect(next).not.toHaveBeenCalled();
    });

    it('should successfully authenticate with valid cookie token', async () => {
      const decodedToken = {
        userId: 1,
        email: 'test@example.com',
        role: 'member'
      };
      req.cookies.token = 'valid-token';
      jwt.verify.mockReturnValue(decodedToken);

      await authMiddleware(req, res, next);

      expect(jwt.verify).toHaveBeenCalledWith('valid-token', process.env.JWT_SECRET);
      expect(req.user).toEqual({
        id: 1,
        email: 'test@example.com',
        role: 'member'
      });
      expect(next).toHaveBeenCalled();
      expect(res.status).not.toHaveBeenCalled();
    });

    it('should successfully authenticate with valid Bearer token in header', async () => {
      const decodedToken = {
        userId: 2,
        email: 'admin@example.com',
        role: 'admin'
      };
      req.headers.authorization = 'Bearer valid-bearer-token';
      jwt.verify.mockReturnValue(decodedToken);

      await authMiddleware(req, res, next);

      expect(jwt.verify).toHaveBeenCalledWith('valid-bearer-token', process.env.JWT_SECRET);
      expect(req.user).toEqual({
        id: 2,
        email: 'admin@example.com',
        role: 'admin'
      });
      expect(next).toHaveBeenCalled();
    });

    it('should prefer cookie token over Authorization header', async () => {
      const decodedToken = {
        userId: 1,
        email: 'cookie@example.com',
        role: 'member'
      };
      req.cookies.token = 'cookie-token';
      req.headers.authorization = 'Bearer header-token';
      jwt.verify.mockReturnValue(decodedToken);

      await authMiddleware(req, res, next);

      expect(jwt.verify).toHaveBeenCalledWith('cookie-token', process.env.JWT_SECRET);
      expect(next).toHaveBeenCalled();
    });

    it('should ignore Authorization header without Bearer prefix', async () => {
      req.headers.authorization = 'Basic some-token';

      await authMiddleware(req, res, next);

      expect(res.status).toHaveBeenCalledWith(401);
      expect(res.json).toHaveBeenCalledWith({
        status: 'error',
        message: 'Access denied. No authentication token provided.'
      });
    });
  });

  describe('adminMiddleware', () => {
    it('should return 403 for non-admin users', () => {
      req.user = { id: 1, email: 'user@example.com', role: 'member' };

      adminMiddleware(req, res, next);

      expect(res.status).toHaveBeenCalledWith(403);
      expect(res.json).toHaveBeenCalledWith({
        status: 'error',
        message: 'Access denied. Admin privileges required.'
      });
      expect(next).not.toHaveBeenCalled();
    });

    it('should allow admin users through', () => {
      req.user = { id: 2, email: 'admin@example.com', role: 'admin' };

      adminMiddleware(req, res, next);

      expect(next).toHaveBeenCalled();
      expect(res.status).not.toHaveBeenCalled();
    });

    it('should return 403 when req.user is null', () => {
      req.user = null;

      adminMiddleware(req, res, next);

      expect(res.status).toHaveBeenCalledWith(403);
      expect(res.json).toHaveBeenCalledWith({
        status: 'error',
        message: 'Access denied. Admin privileges required.'
      });
    });

    it('should return 403 when req.user is undefined', () => {
      req.user = undefined;

      adminMiddleware(req, res, next);

      expect(res.status).toHaveBeenCalledWith(403);
      expect(res.json).toHaveBeenCalledWith({
        status: 'error',
        message: 'Access denied. Admin privileges required.'
      });
    });
  });
});
