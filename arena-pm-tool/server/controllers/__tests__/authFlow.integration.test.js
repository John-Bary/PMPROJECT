/**
 * Auth Flow Integration Tests
 * Tests the complete authentication lifecycle:
 * register → verify email → login → refresh token → logout
 */

const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const crypto = require('crypto');
const {
  register,
  login,
  logout,
  refreshAccessToken,
  verifyEmail,
  forgotPassword,
  resetPassword,
} = require('../authController');

// Mock dependencies
jest.mock('bcryptjs');
jest.mock('jsonwebtoken');
jest.mock('../../config/database');
jest.mock('../../utils/emailQueue', () => ({
  queueWelcomeEmail: jest.fn().mockResolvedValue(true),
  queueVerificationEmail: jest.fn().mockResolvedValue(true),
  queuePasswordResetEmail: jest.fn().mockResolvedValue(true),
}));
jest.mock('../../lib/logger', () => ({
  info: jest.fn(),
  error: jest.fn(),
  warn: jest.fn(),
  fatal: jest.fn(),
}));

const { query, getClient } = require('../../config/database');
const { queueVerificationEmail, queueWelcomeEmail } = require('../../utils/emailQueue');

describe('Auth Flow Integration', () => {
  let req, res;

  // Simulate a transaction client
  const mockClient = {
    query: jest.fn(),
    release: jest.fn(),
  };

  beforeEach(() => {
    req = createMockReq();
    res = createMockRes();
    jest.clearAllMocks();
    getClient.mockResolvedValue(mockClient);
  });

  describe('Full registration → verification → login → refresh → logout flow', () => {
    const testUser = {
      id: 1,
      email: 'newuser@example.com',
      name: 'New User',
      role: 'admin',
      email_verified: false,
      created_at: new Date('2026-01-01'),
    };

    it('Step 1: Register creates user, workspace, sets cookies', async () => {
      req.body = {
        email: 'NewUser@Example.com',
        password: 'SecurePass1',
        name: 'New User',
        tos_accepted: true,
      };

      // Transaction mocks (sequential calls within client.query)
      mockClient.query
        .mockResolvedValueOnce(undefined) // BEGIN (not checked)
        // Actually, let's trace the register flow:
        // 1. Check existing user
        .mockResolvedValueOnce({ rows: [] })
        // 2. Hash password (handled by bcrypt mock)
        // 3. BEGIN
        // Actually, register calls client.query for everything after getClient()

      // Let me re-read the register function flow:
      // 1. getClient() -> mockClient
      // 2. client.query('SELECT id FROM users WHERE email = $1') - check existing
      // 3. client.query('BEGIN')
      // 4. client.query('SELECT COUNT(*) FROM users') - user count
      // 5. client.query('INSERT INTO users ...') - create user
      // 6. client.query('INSERT INTO workspaces ...') - create workspace
      // 7. client.query('INSERT INTO workspace_members ...') - add member
      // 8. client.query('INSERT INTO categories ...') - seed categories
      // 9. client.query('INSERT INTO tasks ...') - seed tasks
      // 10. client.query('INSERT INTO tasks ...') - seed subtasks
      // 11. client.query('COMMIT')

      mockClient.query.mockReset();
      mockClient.query
        .mockResolvedValueOnce({ rows: [] }) // check existing user
        .mockResolvedValueOnce(undefined) // BEGIN
        .mockResolvedValueOnce({ rows: [{ count: '0' }] }) // user count (first user = admin)
        .mockResolvedValueOnce({ rows: [testUser] }) // INSERT user
        .mockResolvedValueOnce({ rows: [{ id: 'ws-uuid-1', name: "New User's Workspace" }] }) // INSERT workspace
        .mockResolvedValueOnce({ rows: [] }) // INSERT workspace_members
        .mockResolvedValueOnce({ rows: [ // INSERT categories
          { id: 10, name: 'To Do' },
          { id: 11, name: 'In Progress' },
          { id: 12, name: 'Completed' },
        ]})
        .mockResolvedValueOnce({ rows: [ // INSERT tasks
          { id: 100, title: 'Invite your team members' },
          { id: 101, title: 'Customize your categories' },
          { id: 102, title: 'Explore the board' },
          { id: 103, title: 'Create your first workspace' },
        ]})
        .mockResolvedValueOnce({ rows: [] }) // INSERT subtasks
        .mockResolvedValueOnce(undefined); // COMMIT

      bcrypt.genSalt.mockResolvedValue('salt');
      bcrypt.hash.mockResolvedValue('hashed-password');
      jwt.sign.mockReturnValue('access-token-123');

      await register(req, res);

      // User was created with lowercase email
      expect(mockClient.query).toHaveBeenCalledWith(
        'SELECT id FROM users WHERE email = $1',
        ['newuser@example.com']
      );

      // Cookies were set
      expect(res.cookie).toHaveBeenCalledWith('token', 'access-token-123', expect.objectContaining({
        httpOnly: true,
        sameSite: 'strict',
      }));
      expect(res.cookie).toHaveBeenCalledWith('refreshToken', expect.any(String), expect.objectContaining({
        httpOnly: true,
        path: '/api/auth/refresh',
      }));

      // Success response
      expect(res.status).toHaveBeenCalledWith(201);
      expect(res.json).toHaveBeenCalledWith(expect.objectContaining({
        status: 'success',
        data: expect.objectContaining({
          user: expect.objectContaining({
            id: 1,
            email: 'newuser@example.com',
            role: 'admin',
          }),
          workspace: expect.objectContaining({
            id: 'ws-uuid-1',
          }),
        }),
      }));

      // Verification email was queued
      expect(queueVerificationEmail).toHaveBeenCalledWith(expect.objectContaining({
        to: 'newuser@example.com',
      }));
    });

    it('Step 2: Verify email marks user as verified', async () => {
      const rawToken = 'verification-token-abc';
      const hashedToken = crypto.createHash('sha256').update(rawToken).digest('hex');

      req.body = { token: rawToken };

      // Query to find user by hashed verification token
      query.mockResolvedValueOnce({
        rows: [{ id: 1, email: 'newuser@example.com', name: 'New User' }],
      });
      // Query to update email_verified
      query.mockResolvedValueOnce({ rows: [] });

      await verifyEmail(req, res);

      // Verified the hashed token was used in the query
      expect(query).toHaveBeenCalledWith(
        expect.stringContaining('email_verification_token'),
        [hashedToken]
      );

      // User marked as verified
      expect(query).toHaveBeenCalledWith(
        expect.stringContaining('email_verified = true'),
        [1]
      );

      // Welcome email queued
      expect(queueWelcomeEmail).toHaveBeenCalledWith(expect.objectContaining({
        to: 'newuser@example.com',
      }));

      expect(res.json).toHaveBeenCalledWith(expect.objectContaining({
        status: 'success',
        message: 'Email verified successfully!',
      }));
    });

    it('Step 3: Login with valid credentials sets auth cookies', async () => {
      req.body = { email: 'newuser@example.com', password: 'SecurePass1' };

      query.mockResolvedValueOnce({
        rows: [{
          id: 1,
          email: 'newuser@example.com',
          password: 'hashed-password',
          name: 'New User',
          role: 'admin',
          avatar_url: null,
          email_verified: true,
        }],
      });
      bcrypt.compare.mockResolvedValue(true);
      jwt.sign.mockReturnValue('new-access-token');

      await login(req, res);

      expect(res.cookie).toHaveBeenCalledWith('token', 'new-access-token', expect.objectContaining({
        httpOnly: true,
      }));
      expect(res.json).toHaveBeenCalledWith(expect.objectContaining({
        status: 'success',
        data: expect.objectContaining({
          user: expect.objectContaining({
            id: 1,
            emailVerified: true,
          }),
        }),
      }));
    });

    it('Step 4: Refresh token issues new access token', async () => {
      req.cookies = { refreshToken: 'valid-refresh-token' };

      jwt.verify.mockReturnValue({ userId: 1, type: 'refresh' });
      query.mockResolvedValueOnce({
        rows: [{ id: 1, email: 'newuser@example.com', name: 'New User', role: 'admin' }],
      });
      jwt.sign.mockReturnValue('refreshed-access-token');

      await refreshAccessToken(req, res);

      expect(res.cookie).toHaveBeenCalledWith('token', 'refreshed-access-token', expect.objectContaining({
        httpOnly: true,
      }));
      expect(res.json).toHaveBeenCalledWith(expect.objectContaining({
        status: 'success',
        data: { token: 'refreshed-access-token' },
      }));
    });

    it('Step 5: Logout clears all auth cookies', async () => {
      await logout(req, res);

      expect(res.clearCookie).toHaveBeenCalledWith('token');
      expect(res.clearCookie).toHaveBeenCalledWith('refreshToken', { path: '/api/auth/refresh' });
      expect(res.json).toHaveBeenCalledWith(expect.objectContaining({
        status: 'success',
      }));
    });
  });

  describe('Registration error cases', () => {
    it('rejects registration without ToS acceptance', async () => {
      req.body = {
        email: 'test@example.com',
        password: 'SecurePass1',
        name: 'Test',
        tos_accepted: false,
      };

      await register(req, res);

      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith(expect.objectContaining({
        message: expect.stringContaining('Terms of Service'),
      }));
    });

    it('rejects weak passwords (no uppercase)', async () => {
      req.body = {
        email: 'test@example.com',
        password: 'weakpass1',
        name: 'Test',
        tos_accepted: true,
      };

      await register(req, res);

      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith(expect.objectContaining({
        message: expect.stringContaining('uppercase'),
      }));
    });

    it('rejects passwords shorter than 8 characters', async () => {
      req.body = {
        email: 'test@example.com',
        password: 'Short1',
        name: 'Test',
        tos_accepted: true,
      };

      await register(req, res);

      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith(expect.objectContaining({
        message: expect.stringContaining('8 characters'),
      }));
    });

    it('returns generic error for duplicate email (prevents enumeration)', async () => {
      req.body = {
        email: 'existing@example.com',
        password: 'SecurePass1',
        name: 'Test',
        tos_accepted: true,
      };

      mockClient.query.mockResolvedValueOnce({ rows: [{ id: 99 }] }); // user exists

      await register(req, res);

      expect(res.status).toHaveBeenCalledWith(400);
      // Should NOT reveal "user already exists" - BIZ-05
      expect(res.json).toHaveBeenCalledWith(expect.objectContaining({
        message: expect.not.stringContaining('already exists'),
      }));
    });
  });

  describe('Login error cases', () => {
    it('rejects login with wrong password', async () => {
      req.body = { email: 'test@example.com', password: 'WrongPass1' };

      query.mockResolvedValueOnce({
        rows: [{ id: 1, email: 'test@example.com', password: 'hashed', name: 'Test', role: 'member' }],
      });
      bcrypt.compare.mockResolvedValue(false);

      await login(req, res);

      expect(res.status).toHaveBeenCalledWith(401);
      // Generic message (no enumeration)
      expect(res.json).toHaveBeenCalledWith(expect.objectContaining({
        message: 'Invalid email or password.',
      }));
    });

    it('rejects login for non-existent user with same generic message', async () => {
      req.body = { email: 'nobody@example.com', password: 'AnyPass1' };
      query.mockResolvedValueOnce({ rows: [] });

      await login(req, res);

      expect(res.status).toHaveBeenCalledWith(401);
      expect(res.json).toHaveBeenCalledWith(expect.objectContaining({
        message: 'Invalid email or password.',
      }));
    });
  });

  describe('Refresh token error cases', () => {
    it('rejects when no refresh token cookie', async () => {
      req.cookies = {};

      await refreshAccessToken(req, res);

      expect(res.status).toHaveBeenCalledWith(401);
    });

    it('rejects expired refresh token', async () => {
      req.cookies = { refreshToken: 'expired-token' };
      jwt.verify.mockImplementation(() => {
        const err = new Error('Token expired');
        err.name = 'TokenExpiredError';
        throw err;
      });

      await refreshAccessToken(req, res);

      expect(res.status).toHaveBeenCalledWith(401);
      expect(res.json).toHaveBeenCalledWith(expect.objectContaining({
        message: expect.stringContaining('expired'),
      }));
    });

    it('rejects access token used as refresh token', async () => {
      req.cookies = { refreshToken: 'access-token-misused' };
      jwt.verify.mockReturnValue({ userId: 1, type: undefined }); // no type = access token

      await refreshAccessToken(req, res);

      expect(res.status).toHaveBeenCalledWith(401);
      expect(res.json).toHaveBeenCalledWith(expect.objectContaining({
        message: 'Invalid token type',
      }));
    });

    it('rejects refresh token for deleted user', async () => {
      req.cookies = { refreshToken: 'valid-refresh' };
      jwt.verify.mockReturnValue({ userId: 999, type: 'refresh' });
      query.mockResolvedValueOnce({ rows: [] }); // user not found

      await refreshAccessToken(req, res);

      expect(res.status).toHaveBeenCalledWith(401);
    });
  });

  describe('Email verification error cases', () => {
    it('rejects invalid verification token', async () => {
      req.body = { token: 'invalid-token' };
      query.mockResolvedValueOnce({ rows: [] }); // no match

      await verifyEmail(req, res);

      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith(expect.objectContaining({
        message: expect.stringContaining('expired'),
      }));
    });

    it('rejects missing verification token', async () => {
      req.body = {};

      await verifyEmail(req, res);

      expect(res.status).toHaveBeenCalledWith(400);
    });
  });

  describe('Password reset flow', () => {
    it('forgot password returns success even for unknown email (anti-enumeration)', async () => {
      req.body = { email: 'nobody@example.com' };
      query.mockResolvedValueOnce({ rows: [] }); // no user

      await forgotPassword(req, res);

      // Should still return success
      expect(res.json).toHaveBeenCalledWith(expect.objectContaining({
        status: 'success',
        message: expect.stringContaining('If an account'),
      }));
    });

    it('reset password validates complexity', async () => {
      req.body = { token: 'valid-token', password: 'weak' };

      await resetPassword(req, res);

      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith(expect.objectContaining({
        message: expect.stringContaining('8 characters'),
      }));
    });

    it('reset password rejects expired token', async () => {
      req.body = { token: 'expired-token', password: 'NewSecure1' };
      query.mockResolvedValueOnce({ rows: [] }); // no match (expired)

      await resetPassword(req, res);

      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith(expect.objectContaining({
        message: expect.stringContaining('expired'),
      }));
    });
  });
});
