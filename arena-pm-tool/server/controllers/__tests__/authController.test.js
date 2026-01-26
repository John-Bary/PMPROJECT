const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { register, login, logout, getCurrentUser, getAllUsers } = require('../authController');

// Mock dependencies
jest.mock('bcryptjs');
jest.mock('jsonwebtoken');
jest.mock('../../config/database');

const { query } = require('../../config/database');

describe('Auth Controller', () => {
  let req, res;

  beforeEach(() => {
    req = createMockReq();
    res = createMockRes();
    jest.clearAllMocks();
  });

  describe('register', () => {
    it('should return 400 if email is missing', async () => {
      req.body = { password: 'password123', name: 'Test User' };

      await register(req, res);

      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith({
        status: 'error',
        message: 'Please provide email, password, and name.'
      });
    });

    it('should return 400 if password is missing', async () => {
      req.body = { email: 'test@example.com', name: 'Test User' };

      await register(req, res);

      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith({
        status: 'error',
        message: 'Please provide email, password, and name.'
      });
    });

    it('should return 400 if name is missing', async () => {
      req.body = { email: 'test@example.com', password: 'password123' };

      await register(req, res);

      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith({
        status: 'error',
        message: 'Please provide email, password, and name.'
      });
    });

    it('should return 400 for invalid email format', async () => {
      req.body = { email: 'invalidemail', password: 'password123', name: 'Test User' };

      await register(req, res);

      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith({
        status: 'error',
        message: 'Please provide a valid email address.'
      });
    });

    it('should return 400 if password is less than 6 characters', async () => {
      req.body = { email: 'test@example.com', password: '12345', name: 'Test User' };

      await register(req, res);

      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith({
        status: 'error',
        message: 'Password must be at least 6 characters long.'
      });
    });

    it('should return 400 if user already exists', async () => {
      req.body = { email: 'existing@example.com', password: 'password123', name: 'Test User' };
      query.mockResolvedValueOnce({ rows: [{ id: 1 }] }); // User exists

      await register(req, res);

      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith({
        status: 'error',
        message: 'User with this email already exists.'
      });
    });

    it('should return 400 if max user count (5) is reached', async () => {
      req.body = { email: 'new@example.com', password: 'password123', name: 'New User' };
      query.mockResolvedValueOnce({ rows: [] }); // User doesn't exist
      query.mockResolvedValueOnce({ rows: [{ count: '5' }] }); // 5 users already

      await register(req, res);

      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith({
        status: 'error',
        message: 'Maximum number of team members (5) reached. Cannot register new users.'
      });
    });

    it('should assign admin role to first user', async () => {
      req.body = { email: 'first@example.com', password: 'password123', name: 'First User' };
      const newUser = {
        id: 1,
        email: 'first@example.com',
        name: 'First User',
        role: 'admin',
        created_at: new Date()
      };

      query.mockResolvedValueOnce({ rows: [] }); // User doesn't exist
      query.mockResolvedValueOnce({ rows: [{ count: '0' }] }); // No users yet
      query.mockResolvedValueOnce({ rows: [newUser] }); // Insert result
      bcrypt.genSalt.mockResolvedValue('salt');
      bcrypt.hash.mockResolvedValue('hashedpassword');
      jwt.sign.mockReturnValue('test-token');

      await register(req, res);

      expect(query).toHaveBeenCalledWith(
        expect.stringContaining('INSERT INTO users'),
        ['first@example.com', 'hashedpassword', 'First User', 'admin']
      );
      expect(res.status).toHaveBeenCalledWith(201);
    });

    it('should assign member role to subsequent users', async () => {
      req.body = { email: 'second@example.com', password: 'password123', name: 'Second User' };
      const newUser = {
        id: 2,
        email: 'second@example.com',
        name: 'Second User',
        role: 'member',
        created_at: new Date()
      };

      query.mockResolvedValueOnce({ rows: [] }); // User doesn't exist
      query.mockResolvedValueOnce({ rows: [{ count: '1' }] }); // 1 user exists
      query.mockResolvedValueOnce({ rows: [newUser] }); // Insert result
      bcrypt.genSalt.mockResolvedValue('salt');
      bcrypt.hash.mockResolvedValue('hashedpassword');
      jwt.sign.mockReturnValue('test-token');

      await register(req, res);

      expect(query).toHaveBeenCalledWith(
        expect.stringContaining('INSERT INTO users'),
        ['second@example.com', 'hashedpassword', 'Second User', 'member']
      );
      expect(res.status).toHaveBeenCalledWith(201);
    });

    it('should successfully register user and return token', async () => {
      req.body = { email: 'new@example.com', password: 'password123', name: 'New User' };
      const newUser = {
        id: 1,
        email: 'new@example.com',
        name: 'New User',
        role: 'admin',
        created_at: new Date('2024-01-01')
      };

      query.mockResolvedValueOnce({ rows: [] }); // User doesn't exist
      query.mockResolvedValueOnce({ rows: [{ count: '0' }] }); // First user
      query.mockResolvedValueOnce({ rows: [newUser] }); // Insert result
      bcrypt.genSalt.mockResolvedValue('salt');
      bcrypt.hash.mockResolvedValue('hashedpassword');
      jwt.sign.mockReturnValue('test-token');

      await register(req, res);

      expect(res.cookie).toHaveBeenCalledWith('token', 'test-token', expect.objectContaining({
        httpOnly: true
      }));
      expect(res.status).toHaveBeenCalledWith(201);
      expect(res.json).toHaveBeenCalledWith({
        status: 'success',
        message: 'User registered successfully',
        data: {
          user: {
            id: 1,
            email: 'new@example.com',
            name: 'New User',
            role: 'admin',
            createdAt: newUser.created_at
          },
          token: 'test-token'
        }
      });
    });

    it('should convert email to lowercase', async () => {
      req.body = { email: 'NEW@EXAMPLE.COM', password: 'password123', name: 'New User' };

      query.mockResolvedValueOnce({ rows: [] }); // User doesn't exist
      query.mockResolvedValueOnce({ rows: [{ count: '0' }] }); // First user
      query.mockResolvedValueOnce({ rows: [{ id: 1, email: 'new@example.com', name: 'New User', role: 'admin', created_at: new Date() }] });
      bcrypt.genSalt.mockResolvedValue('salt');
      bcrypt.hash.mockResolvedValue('hashedpassword');
      jwt.sign.mockReturnValue('test-token');

      await register(req, res);

      expect(query).toHaveBeenCalledWith(
        'SELECT id FROM users WHERE email = $1',
        ['new@example.com']
      );
    });

    it('should handle database errors', async () => {
      req.body = { email: 'test@example.com', password: 'password123', name: 'Test User' };
      query.mockRejectedValue(new Error('Database error'));

      await register(req, res);

      expect(res.status).toHaveBeenCalledWith(500);
      expect(res.json).toHaveBeenCalledWith({
        status: 'error',
        message: 'Error registering user',
        error: 'Database error'
      });
    });
  });

  describe('login', () => {
    it('should return 400 if email is missing', async () => {
      req.body = { password: 'password123' };

      await login(req, res);

      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith({
        status: 'error',
        message: 'Please provide email and password.'
      });
    });

    it('should return 400 if password is missing', async () => {
      req.body = { email: 'test@example.com' };

      await login(req, res);

      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith({
        status: 'error',
        message: 'Please provide email and password.'
      });
    });

    it('should return 401 if user not found', async () => {
      req.body = { email: 'nonexistent@example.com', password: 'password123' };
      query.mockResolvedValue({ rows: [] });

      await login(req, res);

      expect(res.status).toHaveBeenCalledWith(401);
      expect(res.json).toHaveBeenCalledWith({
        status: 'error',
        message: 'Invalid email or password.'
      });
    });

    it('should return 401 if password is invalid', async () => {
      req.body = { email: 'test@example.com', password: 'wrongpassword' };
      query.mockResolvedValue({
        rows: [{
          id: 1,
          email: 'test@example.com',
          password: 'hashedpassword',
          name: 'Test User',
          role: 'member',
          avatar_url: null
        }]
      });
      bcrypt.compare.mockResolvedValue(false);

      await login(req, res);

      expect(res.status).toHaveBeenCalledWith(401);
      expect(res.json).toHaveBeenCalledWith({
        status: 'error',
        message: 'Invalid email or password.'
      });
    });

    it('should successfully login and return user with token', async () => {
      req.body = { email: 'test@example.com', password: 'password123' };
      const user = {
        id: 1,
        email: 'test@example.com',
        password: 'hashedpassword',
        name: 'Test User',
        role: 'member',
        avatar_url: 'avatar.jpg'
      };

      query.mockResolvedValue({ rows: [user] });
      bcrypt.compare.mockResolvedValue(true);
      jwt.sign.mockReturnValue('test-token');

      await login(req, res);

      expect(res.cookie).toHaveBeenCalledWith('token', 'test-token', expect.objectContaining({
        httpOnly: true
      }));
      expect(res.json).toHaveBeenCalledWith({
        status: 'success',
        message: 'Login successful',
        data: {
          user: {
            id: 1,
            email: 'test@example.com',
            name: 'Test User',
            role: 'member',
            avatarUrl: 'avatar.jpg'
          },
          token: 'test-token'
        }
      });
    });

    it('should handle database errors', async () => {
      req.body = { email: 'test@example.com', password: 'password123' };
      query.mockRejectedValue(new Error('Database error'));

      await login(req, res);

      expect(res.status).toHaveBeenCalledWith(500);
      expect(res.json).toHaveBeenCalledWith({
        status: 'error',
        message: 'Error logging in',
        error: 'Database error'
      });
    });
  });

  describe('logout', () => {
    it('should clear token cookie and return success', async () => {
      await logout(req, res);

      expect(res.clearCookie).toHaveBeenCalledWith('token');
      expect(res.json).toHaveBeenCalledWith({
        status: 'success',
        message: 'Logged out successfully'
      });
    });
  });

  describe('getCurrentUser', () => {
    it('should return 404 if user not found', async () => {
      req.user = { id: 999 };
      query.mockResolvedValue({ rows: [] });

      await getCurrentUser(req, res);

      expect(res.status).toHaveBeenCalledWith(404);
      expect(res.json).toHaveBeenCalledWith({
        status: 'error',
        message: 'User not found'
      });
    });

    it('should return user data without password', async () => {
      req.user = { id: 1 };
      const user = {
        id: 1,
        email: 'test@example.com',
        name: 'Test User',
        role: 'member',
        avatar_url: 'avatar.jpg',
        created_at: new Date('2024-01-01')
      };
      query.mockResolvedValue({ rows: [user] });

      await getCurrentUser(req, res);

      expect(res.json).toHaveBeenCalledWith({
        status: 'success',
        data: {
          user: {
            id: 1,
            email: 'test@example.com',
            name: 'Test User',
            role: 'member',
            avatarUrl: 'avatar.jpg',
            createdAt: user.created_at
          }
        }
      });
    });

    it('should handle database errors', async () => {
      req.user = { id: 1 };
      query.mockRejectedValue(new Error('Database error'));

      await getCurrentUser(req, res);

      expect(res.status).toHaveBeenCalledWith(500);
      expect(res.json).toHaveBeenCalledWith({
        status: 'error',
        message: 'Error fetching user data',
        error: 'Database error'
      });
    });
  });

  describe('getAllUsers', () => {
    it('should return all users ordered by created_at', async () => {
      const users = [
        { id: 1, email: 'first@example.com', name: 'First', role: 'admin', avatar_url: null, created_at: new Date('2024-01-01') },
        { id: 2, email: 'second@example.com', name: 'Second', role: 'member', avatar_url: 'avatar.jpg', created_at: new Date('2024-01-02') }
      ];
      query.mockResolvedValue({ rows: users });

      await getAllUsers(req, res);

      expect(query).toHaveBeenCalledWith(
        'SELECT id, email, name, role, avatar_url, created_at FROM users ORDER BY created_at ASC'
      );
      expect(res.json).toHaveBeenCalledWith({
        status: 'success',
        data: {
          users: [
            { id: 1, email: 'first@example.com', name: 'First', role: 'admin', avatarUrl: null, createdAt: users[0].created_at },
            { id: 2, email: 'second@example.com', name: 'Second', role: 'member', avatarUrl: 'avatar.jpg', createdAt: users[1].created_at }
          ]
        }
      });
    });

    it('should return empty array when no users', async () => {
      query.mockResolvedValue({ rows: [] });

      await getAllUsers(req, res);

      expect(res.json).toHaveBeenCalledWith({
        status: 'success',
        data: {
          users: []
        }
      });
    });

    it('should handle database errors', async () => {
      query.mockRejectedValue(new Error('Database error'));

      await getAllUsers(req, res);

      expect(res.status).toHaveBeenCalledWith(500);
      expect(res.json).toHaveBeenCalledWith({
        status: 'error',
        message: 'Error fetching users',
        error: 'Database error'
      });
    });
  });
});
