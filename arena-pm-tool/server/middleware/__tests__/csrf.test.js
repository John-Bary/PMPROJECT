// Tests for CSRF middleware setup
// Since csrf-csrf relies on cookie signing and token generation internals,
// we test the module exports and behavior via mocking.

jest.mock('csrf-csrf', () => {
  const mockGenerateCsrfToken = jest.fn();
  const mockDoubleCsrfProtection = jest.fn();

  return {
    doubleCsrf: jest.fn(() => ({
      generateCsrfToken: mockGenerateCsrfToken,
      doubleCsrfProtection: mockDoubleCsrfProtection,
    })),
    __mockGenerateCsrfToken: mockGenerateCsrfToken,
    __mockDoubleCsrfProtection: mockDoubleCsrfProtection,
  };
});

const { doubleCsrf } = require('csrf-csrf');

describe('CSRF Middleware', () => {
  let req, res, csrfModule;

  beforeEach(() => {
    jest.clearAllMocks();
    req = createMockReq();
    res = createMockRes();

    // Re-require to get a fresh module with our mocks
    jest.isolateModules(() => {
      csrfModule = require('../csrf');
    });
  });

  describe('module exports', () => {
    it('should export doubleCsrfProtection middleware', () => {
      expect(csrfModule).toHaveProperty('doubleCsrfProtection');
      expect(typeof csrfModule.doubleCsrfProtection).toBe('function');
    });

    it('should export csrfTokenRoute handler', () => {
      expect(csrfModule).toHaveProperty('csrfTokenRoute');
      expect(typeof csrfModule.csrfTokenRoute).toBe('function');
    });
  });

  describe('doubleCsrf configuration', () => {
    it('should call doubleCsrf with correct cookie name', () => {
      expect(doubleCsrf).toHaveBeenCalledWith(
        expect.objectContaining({
          cookieName: '__csrf',
        })
      );
    });

    it('should use JWT_SECRET as the secret', () => {
      const config = doubleCsrf.mock.calls[0][0];
      const secret = config.getSecret();
      expect(secret).toBe(process.env.JWT_SECRET);
    });

    it('should configure httpOnly and sameSite strict cookie options', () => {
      const config = doubleCsrf.mock.calls[0][0];
      expect(config.cookieOptions).toEqual(
        expect.objectContaining({
          httpOnly: true,
          sameSite: 'strict',
          path: '/',
        })
      );
    });

    it('should set secure cookies only in production', () => {
      const config = doubleCsrf.mock.calls[0][0];
      // In test environment, secure should be false
      expect(config.cookieOptions.secure).toBe(false);
    });

    it('should extract CSRF token from x-csrf-token header', () => {
      const config = doubleCsrf.mock.calls[0][0];
      req.headers['x-csrf-token'] = 'test-csrf-token-123';

      const token = config.getCsrfTokenFromRequest(req);
      expect(token).toBe('test-csrf-token-123');
    });

    it('should extract CSRF token from body._csrf as fallback', () => {
      const config = doubleCsrf.mock.calls[0][0];
      req.body = { _csrf: 'body-csrf-token' };

      const token = config.getCsrfTokenFromRequest(req);
      expect(token).toBe('body-csrf-token');
    });

    it('should prefer header token over body token', () => {
      const config = doubleCsrf.mock.calls[0][0];
      req.headers['x-csrf-token'] = 'header-token';
      req.body = { _csrf: 'body-token' };

      const token = config.getCsrfTokenFromRequest(req);
      expect(token).toBe('header-token');
    });
  });

  describe('csrfTokenRoute', () => {
    it('should generate a CSRF token and return it as JSON', () => {
      const { __mockGenerateCsrfToken } = require('csrf-csrf');
      __mockGenerateCsrfToken.mockReturnValue('generated-csrf-token');

      csrfModule.csrfTokenRoute(req, res);

      expect(__mockGenerateCsrfToken).toHaveBeenCalledWith(req, res);
      expect(res.json).toHaveBeenCalledWith({
        csrfToken: 'generated-csrf-token',
      });
    });
  });
});
