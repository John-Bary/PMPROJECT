// CSRF Protection Middleware
// Uses the double-submit cookie pattern via csrf-csrf

const { doubleCsrf } = require('csrf-csrf');

const {
  generateToken,
  doubleCsrfProtection,
} = doubleCsrf({
  getSecret: () => process.env.JWT_SECRET,
  cookieName: '__csrf',
  cookieOptions: {
    httpOnly: true,
    sameSite: 'strict',
    secure: process.env.NODE_ENV === 'production',
    path: '/',
  },
  getTokenFromRequest: (req) =>
    req.headers['x-csrf-token'] || req.body?._csrf,
});

// Endpoint to get a CSRF token (called by the SPA on load)
const csrfTokenRoute = (req, res) => {
  const token = generateToken(req, res);
  res.json({ csrfToken: token });
};

module.exports = {
  doubleCsrfProtection,
  csrfTokenRoute,
};
