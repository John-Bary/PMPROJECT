// Test setup file for Jest

// Set up test environment variables
process.env.JWT_SECRET = 'test-jwt-secret-key';
process.env.NODE_ENV = 'test';

// Global test utilities
global.mockUser = {
  id: 1,
  email: 'test@example.com',
  name: 'Test User',
  role: 'member'
};

global.mockAdminUser = {
  id: 2,
  email: 'admin@example.com',
  name: 'Admin User',
  role: 'admin'
};

// Helper to create mock request object
global.createMockReq = (overrides = {}) => ({
  cookies: {},
  headers: {},
  body: {},
  params: {},
  query: {},
  user: null,
  ...overrides
});

// Helper to create mock response object
global.createMockRes = () => {
  const res = {};
  res.status = jest.fn().mockReturnValue(res);
  res.json = jest.fn().mockReturnValue(res);
  res.cookie = jest.fn().mockReturnValue(res);
  res.clearCookie = jest.fn().mockReturnValue(res);
  return res;
};

// Helper to create mock next function
global.createMockNext = () => jest.fn();
