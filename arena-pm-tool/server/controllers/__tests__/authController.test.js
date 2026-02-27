const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { register, login, logout, getCurrentUser, getAllUsers } = require('../authController');

// Mock dependencies
jest.mock('bcryptjs');
jest.mock('jsonwebtoken');
jest.mock('../../config/database');
jest.mock('../../lib/logger', () => ({
  info: jest.fn(),
  error: jest.fn(),
  warn: jest.fn(),
}));
jest.mock('../../utils/emailQueue', () => ({
  queueWelcomeEmail: jest.fn().mockResolvedValue(true),
  queueVerificationEmail: jest.fn().mockResolvedValue(true),
  queuePasswordResetEmail: jest.fn().mockResolvedValue(true),
}));

const { query, getClient } = require('../../config/database');

describe('Auth Controller', () => {
  let req, res;

  beforeEach(() => {
    req = createMockReq();
    res = createMockRes();
    jest.clearAllMocks();
  });

  describe('register', () => {
    let mockClient;

    beforeEach(() => {
      mockClient = {
        query: jest.fn(),
        release: jest.fn(),
      };
      getClient.mockResolvedValue(mockClient);
    });

    const validBody = {
      email: 'test@example.com',
      password: 'Password1',
      name: 'Test User',
      tos_accepted: true,
    };

    const setupSuccessfulRegistration = (userCountValue = '0') => {
      const role = parseInt(userCountValue) === 0 ? 'admin' : 'member';
      const newUser = {
        id: 1,
        email: 'test@example.com',
        name: 'Test User',
        role,
        email_verified: false,
        created_at: new Date('2024-01-01'),
      };
      const workspace = { id: 'ws-uuid', name: "Test User's Workspace" };

      mockClient.query
        .mockResolvedValueOnce({ rows: [] }) // user exists check
        .mockResolvedValueOnce({}) // BEGIN
        .mockResolvedValueOnce({ rows: [{ count: userCountValue }] }) // user count
        .mockResolvedValueOnce({ rows: [newUser] }) // insert user
        .mockResolvedValueOnce({ rows: [workspace] }) // create workspace
        .mockResolvedValueOnce({ rows: [] }) // add workspace member
        .mockResolvedValueOnce({ rows: [{ id: 1, name: 'To Do' }, { id: 2, name: 'In Progress' }, { id: 3, name: 'Completed' }] }) // seed categories
        .mockResolvedValueOnce({ rows: [{ id: 1, title: 'Invite your team members' }, { id: 2, title: 'Customize your categories' }, { id: 3, title: 'Explore the board' }, { id: 4, title: 'Create your first workspace' }] }) // seed tasks
        .mockResolvedValueOnce({ rows: [] }) // seed subtasks
        .mockResolvedValueOnce({}); // COMMIT

      bcrypt.genSalt.mockResolvedValue('salt');
      bcrypt.hash.mockResolvedValue('hashedpassword');
      jwt.sign.mockReturnValue('test-token');

      return { newUser, workspace };
    };

    it('should return 400 if email is missing', async () => {
      req.body = { password: 'Password1', name: 'Test User', tos_accepted: true };

      await register(req, res);

      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith({
        status: 'error',
        message: 'Please provide email, password, and name.',
      });
      expect(mockClient.release).toHaveBeenCalled();
    });

    it('should return 400 if password is missing', async () => {
      req.body = { email: 'test@example.com', name: 'Test User', tos_accepted: true };

      await register(req, res);

      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith({
        status: 'error',
        message: 'Please provide email, password, and name.',
      });
      expect(mockClient.release).toHaveBeenCalled();
    });

    it('should return 400 if name is missing', async () => {
      req.body = { email: 'test@example.com', password: 'Password1', tos_accepted: true };

      await register(req, res);

      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith({
        status: 'error',
        message: 'Please provide email, password, and name.',
      });
      expect(mockClient.release).toHaveBeenCalled();
    });

    it('should return 400 if tos_accepted is missing or false', async () => {
      req.body = { email: 'test@example.com', password: 'Password1', name: 'Test User' };

      await register(req, res);

      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith({
        status: 'error',
        message: 'You must accept the Terms of Service to register.',
      });
      expect(mockClient.release).toHaveBeenCalled();
    });

    it('should return 400 for invalid email format', async () => {
      req.body = { email: 'invalidemail', password: 'Password1', name: 'Test User', tos_accepted: true };

      await register(req, res);

      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith({
        status: 'error',
        message: 'Please provide a valid email address.',
      });
      expect(mockClient.release).toHaveBeenCalled();
    });

    it('should return 400 if password is less than 8 characters', async () => {
      req.body = { email: 'test@example.com', password: 'Pass1', name: 'Test User', tos_accepted: true };

      await register(req, res);

      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith({
        status: 'error',
        message: 'Password must be at least 8 characters long.',
      });
      expect(mockClient.release).toHaveBeenCalled();
    });

    it('should return 400 if password lacks complexity', async () => {
      req.body = { email: 'test@example.com', password: 'password1', name: 'Test User', tos_accepted: true };

      await register(req, res);

      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith({
        status: 'error',
        message: 'Password must contain at least one uppercase letter, one lowercase letter, and one digit.',
      });
      expect(mockClient.release).toHaveBeenCalled();
    });

    it('should return 400 if user already exists with generic message', async () => {
      req.body = { ...validBody, email: 'existing@example.com' };
      mockClient.query.mockResolvedValueOnce({ rows: [{ id: 1 }] }); // user exists

      await register(req, res);

      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith({
        status: 'error',
        message: 'Registration failed. Please check your details and try again.',
      });
      expect(mockClient.release).toHaveBeenCalled();
    });

    it('should assign admin role to first user', async () => {
      req.body = { ...validBody, email: 'first@example.com', name: 'First User' };
      setupSuccessfulRegistration('0');

      await register(req, res);

      expect(mockClient.query).toHaveBeenCalledWith(
        expect.stringContaining('INSERT INTO users'),
        expect.arrayContaining(['first@example.com', 'hashedpassword', 'First User', 'admin'])
      );
      expect(res.status).toHaveBeenCalledWith(201);
      expect(mockClient.release).toHaveBeenCalled();
    });

    it('should assign member role to subsequent users', async () => {
      req.body = { ...validBody, email: 'second@example.com', name: 'Second User' };

      const newUser = {
        id: 2,
        email: 'second@example.com',
        name: 'Second User',
        role: 'member',
        email_verified: false,
        created_at: new Date(),
      };
      const workspace = { id: 'ws-uuid', name: "Second User's Workspace" };

      mockClient.query
        .mockResolvedValueOnce({ rows: [] }) // user exists check
        .mockResolvedValueOnce({}) // BEGIN
        .mockResolvedValueOnce({ rows: [{ count: '1' }] }) // user count
        .mockResolvedValueOnce({ rows: [newUser] }) // insert user
        .mockResolvedValueOnce({ rows: [workspace] }) // create workspace
        .mockResolvedValueOnce({ rows: [] }) // add workspace member
        .mockResolvedValueOnce({ rows: [{ id: 1, name: 'To Do' }, { id: 2, name: 'In Progress' }, { id: 3, name: 'Completed' }] }) // seed categories
        .mockResolvedValueOnce({ rows: [{ id: 1, title: 'Invite your team members' }, { id: 2, title: 'Customize your categories' }, { id: 3, title: 'Explore the board' }, { id: 4, title: 'Create your first workspace' }] }) // seed tasks
        .mockResolvedValueOnce({ rows: [] }) // seed subtasks
        .mockResolvedValueOnce({}); // COMMIT

      bcrypt.genSalt.mockResolvedValue('salt');
      bcrypt.hash.mockResolvedValue('hashedpassword');
      jwt.sign.mockReturnValue('test-token');

      await register(req, res);

      expect(mockClient.query).toHaveBeenCalledWith(
        expect.stringContaining('INSERT INTO users'),
        expect.arrayContaining(['second@example.com', 'hashedpassword', 'Second User', 'member'])
      );
      expect(res.status).toHaveBeenCalledWith(201);
      expect(mockClient.release).toHaveBeenCalled();
    });

    it('should successfully register user and return token and workspace', async () => {
      req.body = { ...validBody, email: 'new@example.com', name: 'New User' };
      const { newUser, workspace } = setupSuccessfulRegistration('0');
      // Override the user email in the mock to match the request
      newUser.email = 'new@example.com';
      newUser.name = 'New User';

      await register(req, res);

      expect(res.cookie).toHaveBeenCalledWith('token', 'test-token', expect.objectContaining({
        httpOnly: true,
      }));
      expect(res.cookie).toHaveBeenCalledWith('refreshToken', 'test-token', expect.objectContaining({
        httpOnly: true,
        path: '/api/auth/refresh',
      }));
      expect(res.status).toHaveBeenCalledWith(201);
      expect(res.json).toHaveBeenCalledWith({
        status: 'success',
        message: 'User registered successfully. Please check your email to verify your account.',
        data: {
          user: {
            id: 1,
            email: 'new@example.com',
            name: 'New User',
            role: 'admin',
            emailVerified: false,
            createdAt: newUser.created_at,
          },
          workspace: {
            id: 'ws-uuid',
            name: "Test User's Workspace",
          },
          token: 'test-token',
        },
      });
      expect(mockClient.release).toHaveBeenCalled();
    });

    it('should convert email to lowercase', async () => {
      req.body = { ...validBody, email: 'NEW@EXAMPLE.COM', name: 'New User' };
      setupSuccessfulRegistration('0');

      await register(req, res);

      expect(mockClient.query).toHaveBeenCalledWith(
        'SELECT id FROM users WHERE email = $1',
        ['new@example.com']
      );
      expect(mockClient.release).toHaveBeenCalled();
    });

    it('should handle database errors with ROLLBACK', async () => {
      req.body = { ...validBody };
      mockClient.query
        .mockRejectedValueOnce(new Error('Database error')) // first query fails
        .mockResolvedValueOnce({}); // ROLLBACK succeeds

      await register(req, res);

      expect(mockClient.query).toHaveBeenCalledWith('ROLLBACK');
      expect(res.status).toHaveBeenCalledWith(500);
      expect(res.json).toHaveBeenCalledWith({
        status: 'error',
        message: 'Error registering user',
        error: 'Database error',
      });
      expect(mockClient.release).toHaveBeenCalled();
    });
  });

  describe('login', () => {
    it('should return 400 if email is missing', async () => {
      req.body = { password: 'Password1' };

      await login(req, res);

      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith({
        status: 'error',
        message: 'Please provide email and password.',
      });
    });

    it('should return 400 if password is missing', async () => {
      req.body = { email: 'test@example.com' };

      await login(req, res);

      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith({
        status: 'error',
        message: 'Please provide email and password.',
      });
    });

    it('should return 401 if user not found', async () => {
      req.body = { email: 'nonexistent@example.com', password: 'Password1' };
      query.mockResolvedValue({ rows: [] });

      await login(req, res);

      expect(res.status).toHaveBeenCalledWith(401);
      expect(res.json).toHaveBeenCalledWith({
        status: 'error',
        message: 'Invalid email or password.',
      });
    });

    it('should return 401 if password is invalid', async () => {
      req.body = { email: 'test@example.com', password: 'WrongPass1' };
      query.mockResolvedValue({
        rows: [{
          id: 1,
          email: 'test@example.com',
          password: 'hashedpassword',
          name: 'Test User',
          role: 'member',
          avatar_url: null,
          email_verified: false,
        }],
      });
      bcrypt.compare.mockResolvedValue(false);

      await login(req, res);

      expect(res.status).toHaveBeenCalledWith(401);
      expect(res.json).toHaveBeenCalledWith({
        status: 'error',
        message: 'Invalid email or password.',
      });
    });

    it('should successfully login and return user with token', async () => {
      req.body = { email: 'test@example.com', password: 'Password1' };
      const user = {
        id: 1,
        email: 'test@example.com',
        password: 'hashedpassword',
        name: 'Test User',
        role: 'member',
        avatar_url: 'avatar.jpg',
        email_verified: true,
      };

      query.mockResolvedValue({ rows: [user] });
      bcrypt.compare.mockResolvedValue(true);
      jwt.sign.mockReturnValue('test-token');

      await login(req, res);

      expect(res.cookie).toHaveBeenCalledWith('token', 'test-token', expect.objectContaining({
        httpOnly: true,
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
            avatarUrl: 'avatar.jpg',
            emailVerified: true,
          },
          token: 'test-token',
        },
      });
    });

    it('should handle database errors', async () => {
      req.body = { email: 'test@example.com', password: 'Password1' };
      query.mockRejectedValue(new Error('Database error'));

      await login(req, res);

      expect(res.status).toHaveBeenCalledWith(500);
      expect(res.json).toHaveBeenCalledWith({
        status: 'error',
        message: 'Error logging in',
        error: 'Database error',
      });
    });
  });

  describe('logout', () => {
    it('should clear token and refreshToken cookies and return success', async () => {
      await logout(req, res);

      expect(res.clearCookie).toHaveBeenCalledWith('token');
      expect(res.clearCookie).toHaveBeenCalledWith('refreshToken', { path: '/api/auth/refresh' });
      expect(res.json).toHaveBeenCalledWith({
        status: 'success',
        message: 'Logged out successfully',
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
        message: 'User not found',
      });
    });

    it('should return user data with emailVerified field', async () => {
      req.user = { id: 1 };
      const user = {
        id: 1,
        email: 'test@example.com',
        name: 'Test User',
        role: 'member',
        avatar_url: 'avatar.jpg',
        email_verified: true,
        created_at: new Date('2024-01-01'),
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
            emailVerified: true,
            createdAt: user.created_at,
          },
        },
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
        error: 'Database error',
      });
    });
  });

  describe('getAllUsers', () => {
    it('should return all users ordered by created_at when no workspace_id', async () => {
      const users = [
        { id: 1, email: 'first@example.com', name: 'First', role: 'admin', avatar_url: null, created_at: new Date('2024-01-01') },
        { id: 2, email: 'second@example.com', name: 'Second', role: 'member', avatar_url: 'avatar.jpg', created_at: new Date('2024-01-02') },
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
            { id: 2, email: 'second@example.com', name: 'Second', role: 'member', avatarUrl: 'avatar.jpg', createdAt: users[1].created_at },
          ],
        },
      });
    });

    it('should query workspace members when workspace_id is provided', async () => {
      req.query = { workspace_id: 'ws-123' };
      const users = [
        { id: 1, email: 'member@example.com', name: 'Member', role: 'member', avatar_url: null, created_at: new Date('2024-01-01') },
      ];
      query.mockResolvedValue({ rows: users });

      await getAllUsers(req, res);

      expect(query).toHaveBeenCalledWith(
        expect.stringContaining('JOIN workspace_members'),
        ['ws-123']
      );
      expect(res.json).toHaveBeenCalledWith({
        status: 'success',
        data: {
          users: [
            { id: 1, email: 'member@example.com', name: 'Member', role: 'member', avatarUrl: null, createdAt: users[0].created_at },
          ],
        },
      });
    });

    it('should return empty array when no users', async () => {
      query.mockResolvedValue({ rows: [] });

      await getAllUsers(req, res);

      expect(res.json).toHaveBeenCalledWith({
        status: 'success',
        data: {
          users: [],
        },
      });
    });

    it('should handle database errors', async () => {
      query.mockRejectedValue(new Error('Database error'));

      await getAllUsers(req, res);

      expect(res.status).toHaveBeenCalledWith(500);
      expect(res.json).toHaveBeenCalledWith({
        status: 'error',
        message: 'Error fetching users',
        error: 'Database error',
      });
    });
  });
});
