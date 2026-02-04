# Todoria — Comprehensive Security Audit Report

**Date:** 2026-02-04
**Auditor:** Claude Code (Automated Security Audit)
**Scope:** Full application — client, server, database, infrastructure
**Codebase Root:** `/home/user/PMPROJECT/arena-pm-tool/`

---

## Executive Summary

**Overall Security Posture: YELLOW (Moderate Risk)**

The application demonstrates competent baseline security practices (parameterized queries, bcrypt hashing, rate limiting, Helmet headers, workspace-scoped data). However, several critical and high-severity issues were identified that could allow unauthorized data access, account compromise, or service abuse.

| Severity | Count |
|----------|-------|
| CRITICAL | 4 |
| HIGH | 11 |
| MEDIUM | 14 |
| LOW | 8 |
| **Total** | **37** |

---

## Phase 2 — Authentication & Session Security

### AUTH-01: JWT Token Stored in localStorage (HIGH)

**File:** `client/src/store/authStore.js:8,22,56`
**Description:** JWT tokens are stored in `localStorage`, which is accessible to any JavaScript running on the page. If an XSS vulnerability exists (or is introduced via a dependency), an attacker can exfiltrate the token and impersonate the user from any device.
**Remediation:** Store the JWT in an `httpOnly`, `Secure`, `SameSite=Strict` cookie. The server already sets cookies (`server/controllers/authController.js:127-133`) but the client reads from localStorage instead.

### AUTH-02: No Password Complexity Requirements (MEDIUM)

**File:** `server/controllers/authController.js:69`
**Description:** The only password validation is `password.length < 6`. There are no requirements for uppercase, lowercase, digits, or special characters. Combined with the 5-request auth rate limit, weak passwords remain guessable.
**Remediation:** Enforce a minimum 8-character password with at least one uppercase letter, one lowercase letter, and one digit. Consider integrating a breached-password check (e.g., HaveIBeenPwned k-Anonymity API).

### AUTH-03: No Token Rotation After Privilege Changes (MEDIUM)

**File:** `server/controllers/authController.js:120-135`
**Description:** Once a JWT is issued, it remains valid for its full lifetime (`JWT_EXPIRES_IN`, default 7 days). If a user's role changes (e.g., demoted from admin), the old token still carries the original claims. There is no token blacklist or rotation mechanism.
**Remediation:** Implement token rotation: issue a new JWT on role changes, and either use short-lived tokens with refresh tokens, or maintain a server-side token version/blacklist.

### AUTH-04: No Account Lockout Mechanism (MEDIUM)

**File:** `server/middleware/rateLimiter.js:24-40`
**Description:** The auth rate limiter (5 requests per 15 minutes per IP) resets the count for successful requests (`skipSuccessfulRequests: true`). This means an attacker who knows a valid credential can keep the rate-limit counter at zero while brute-forcing other accounts from the same IP. There is no per-account lockout after repeated failed attempts.
**Remediation:** Implement per-account lockout (e.g., lock after 10 failed attempts within 30 minutes) in addition to the per-IP rate limit. Remove `skipSuccessfulRequests: true`.

### AUTH-05: JWT Secret Not Validated for Strength (LOW)

**File:** `server/controllers/authController.js:13`
**Description:** `JWT_SECRET` is read from the environment variable with no validation of its entropy or length. A weak secret (e.g., `"secret"`) would allow trivial token forgery.
**Remediation:** At server startup, validate that `JWT_SECRET` is at least 32 characters and not a known default value.

### AUTH-06: Logout Does Not Invalidate Token Server-Side (MEDIUM)

**File:** `server/controllers/authController.js:232-252`
**Description:** The logout endpoint clears the cookie on the client but does not invalidate the JWT server-side. A stolen token remains valid until expiration.
**Remediation:** Implement a token blacklist (Redis or database) checked in `authMiddleware`, or switch to short-lived access tokens + refresh tokens stored in httpOnly cookies.

### AUTH-07: First Registered User Auto-Promoted to Admin (LOW)

**File:** `server/controllers/authController.js:75-80`
**Description:** The first user to register is automatically given the `admin` role. In a publicly accessible deployment, an attacker could register first and become admin.
**Remediation:** Require admin setup via an initial setup wizard with a setup token, or provision the first admin via an environment variable or seed script.

---

## Phase 3 — Authorization & Access Control

### AUTHZ-01: getCategoryById Has No Workspace Authorization Check (CRITICAL)

**File:** `server/controllers/categoryController.js:77-122`
**Description:** `getCategoryById` fetches a category by its numeric ID with `WHERE c.id = $1` and no workspace scoping. Any authenticated user can read any category from any workspace by guessing/iterating integer IDs.
**Remediation:** Add `AND c.workspace_id IN (SELECT workspace_id FROM workspace_members WHERE user_id = $1)` or call `verifyWorkspaceAccess()`.

### AUTHZ-02: getTaskById Has No Workspace Authorization Check (CRITICAL)

**File:** `server/controllers/taskController.js:166-235`
**Description:** `getTaskById` fetches a task by ID without verifying workspace membership. Any authenticated user can access any task in any workspace by iterating sequential IDs.
**Remediation:** Add workspace membership verification before returning the task.

### AUTHZ-03: getSubtasks Has No Workspace Authorization Check (HIGH)

**File:** `server/controllers/taskController.js:239-`
**Description:** The subtasks endpoint queries `WHERE t.parent_task_id = $1` without verifying the requesting user has access to the parent task's workspace.
**Remediation:** Join through the parent task to its workspace and verify membership.

### AUTHZ-04: Comment Endpoints Lack Workspace Scope Checks (HIGH)

**File:** `server/controllers/commentController.js:7-46, 49-118`
**Description:** `getCommentsByTaskId` and `createComment` only check that the task exists (`WHERE id = $1`), not that the requesting user is a member of the task's workspace. This allows cross-workspace comment reading and creation.
**Remediation:** Verify workspace membership by joining task -> workspace -> workspace_members.

### AUTHZ-05: updateComment/deleteComment Lack Workspace Verification (MEDIUM)

**File:** `server/controllers/commentController.js:121-196, 199-236`
**Description:** While these check `author_id !== userId`, they don't verify the user is still a member of the relevant workspace. A removed user can still edit/delete their old comments.
**Remediation:** Add workspace membership check in addition to authorship check.

### AUTHZ-06: reorderCategories Has No Workspace Scoping (HIGH)

**File:** `server/controllers/categoryController.js:350-422`
**Description:** Accepts an array of `categoryIds` and updates their positions without verifying they belong to the same workspace or that the user has access. An attacker can reorder categories across workspaces.
**Remediation:** Verify all category IDs belong to a single workspace the user is a member of.

### AUTHZ-07: updateCategory Name Collision Check Is Not Workspace-Scoped (MEDIUM)

**File:** `server/controllers/categoryController.js:273-283`
**Description:** The duplicate name check uses `WHERE LOWER(name) = LOWER($1) AND id != $2` without filtering by `workspace_id`. This means a valid rename could be blocked by a category name in a completely different workspace.
**Remediation:** Add `AND workspace_id = $3` to the uniqueness query.

### AUTHZ-08: No Admin-Only Enforcement on Workspace Destructive Actions (HIGH)

**File:** `server/controllers/workspaceController.js`
**Description:** Several workspace management actions (update, delete, invite, manage members) check workspace membership but rely on application-level role checks. The `updateMemberRole` action at line 668-716 verifies admin role properly, but `updateWorkspace` at line 174-234 and `deleteWorkspace` at line 236-276 only check membership, not admin role.
**Remediation:** Enforce `membership.role === 'admin'` for all destructive workspace operations (update, delete, invite).

### AUTHZ-09: RLS Policies Not Active for Application Queries (HIGH)

**File:** `docs/RLS_SECURITY_ANALYSIS.md:128-136`, `server/config/database.js`
**Description:** The application uses a direct `pg` pool connection. RLS policies exist in migrations but are only enforced when queries go through Supabase client or when `app.current_user_id` session variable is set. The application code never sets this variable, meaning **RLS policies provide zero protection** for application-level queries.
**Remediation:** Either (a) set `SET LOCAL app.current_user_id` before each query in middleware, or (b) migrate to Supabase client for all queries, or (c) rely solely on application-level authorization checks and ensure they are comprehensive (currently they are not — see AUTHZ-01/02).

### AUTHZ-10: /api/auth/users Returns All Users Globally (MEDIUM)

**File:** `server/controllers/authController.js:260-293`
**Description:** The `getAllUsers` endpoint returns all users in the system with their IDs, emails, names, and roles. No workspace scoping is applied. In a multi-workspace system, users in Workspace A can see the full user list including users who are only in Workspace B.
**Remediation:** Scope user listing to workspace membership, or remove this endpoint and use the workspace-specific `/api/workspaces/users` instead.

### Authorization Matrix Summary

| Action | Admin Enforced Server-Side | Member Enforced | Workspace-Scoped |
|--------|---------------------------|-----------------|-------------------|
| Create Task | - | Yes (workspace check) | Yes |
| Read Task by ID | - | **NO** | **NO** |
| Update Task | - | Yes (workspace check) | Yes |
| Delete Task | - | Yes (workspace check) | Yes |
| Read Category by ID | - | **NO** | **NO** |
| Create Category | - | Yes | Yes |
| Reorder Categories | - | **NO** | **NO** |
| Read Comments | - | **NO** | **NO** |
| Create Comment | - | **NO** (only task existence) | **NO** |
| Update Workspace | - | Yes (membership) | **NO ADMIN CHECK** |
| Delete Workspace | - | Yes (membership) | **NO ADMIN CHECK** |
| Invite to Workspace | Yes | Yes | Yes |
| Update Member Role | Yes | Yes | Yes |

---

## Phase 4 — Input Validation & Injection Prevention

### INJ-01: SQL Injection in initDatabase.js (HIGH)

**File:** `server/scripts/initDatabase.js:25-29`
**Description:** The database name from `process.env.DB_NAME` is interpolated directly into SQL via template literals (`CREATE DATABASE ${process.env.DB_NAME}`). If the environment variable is attacker-controlled, this enables SQL injection.
**Remediation:** Use a sanitized identifier (e.g., `pg-format` with `%I` identifier escaping) or validate the database name against `^[a-zA-Z0-9_]+$`.

### INJ-02: HTML Injection in Email Templates (HIGH)

**File:** `server/utils/emailService.js` (template rendering), `server/templates/email/workspaceInvite.html:28-29`
**Description:** Email templates use `{{inviterName}}` and `{{workspaceName}}` placeholders that are replaced via simple string substitution without HTML escaping. An attacker who creates a workspace named `<script>alert(1)</script>` or `<img src=x onerror=alert(1)>` can inject HTML into invitation emails, potentially leading to phishing or credential theft via crafted links.
**Remediation:** HTML-escape all user-provided values before inserting into email templates. Use a template engine with auto-escaping (e.g., Handlebars with default escaping).

### INJ-03: HTML Injection in Supabase Edge Function Email (HIGH)

**File:** `supabase/functions/send-invite/index.ts:96-97`
**Description:** Same issue as INJ-02 — `${inviterName}` and `${workspaceName}` are interpolated directly into HTML without escaping.
**Remediation:** HTML-escape all interpolated values.

### INJ-04: No CSRF Protection (MEDIUM)

**Description:** The application uses JWT Bearer tokens (not session cookies) for most requests, which provides inherent CSRF protection for API calls. However, the server also accepts JWT from cookies (`server/middleware/auth.js:19`), and cookies have `sameSite: 'none'` in development mode (`server/controllers/authController.js:130`). This means in development, CSRF attacks are possible against cookie-authenticated users.
**Remediation:** Set `sameSite: 'strict'` or `'lax'` for all environments. If cross-origin cookie auth is needed, implement CSRF tokens.

### INJ-05: No Input Length Validation on Task/Comment Content (LOW)

**File:** `server/controllers/taskController.js`, `server/controllers/commentController.js`
**Description:** Task titles (VARCHAR 500), descriptions (TEXT, unbounded), and comment content (TEXT, unbounded) have no application-level length validation. While the database enforces VARCHAR limits, TEXT columns have no limit, allowing arbitrarily large payloads.
**Remediation:** Add maximum length validation for all text inputs at the application level (e.g., description max 10,000 chars, comment max 5,000 chars).

### INJ-06: Avatar Upload MIME Type Check Is Bypassable (LOW)

**File:** `server/routes/me.js:32-38`
**Description:** The file filter checks `file.mimetype` which is set by the client in the `Content-Type` header. An attacker can upload a malicious file (e.g., SVG with embedded JavaScript, or an HTML file) by setting the MIME type to `image/jpeg`.
**Remediation:** Validate the actual file content by reading magic bytes, not just the MIME type. Use a library like `file-type` to verify the file signature matches.

### INJ-07: No Content Security Policy on Uploaded Files (MEDIUM)

**File:** `server/server.js:130` (static file serving at `/uploads`)
**Description:** Uploaded avatars are served as static files via Express. If an attacker manages to upload an HTML or SVG file (see INJ-06), it will be served with the default Content-Type, potentially enabling stored XSS.
**Remediation:** Serve uploaded files with `Content-Disposition: attachment` and `X-Content-Type-Options: nosniff`, or serve them from a separate cookieless domain.

---

## Phase 5 — API Security

### API-01: /api/db-test Exposes Database Information (CRITICAL)

**File:** `server/server.js:177-207`
**Description:** The `/api/db-test` endpoint is unauthenticated and returns the PostgreSQL version string and current timestamp. This reveals infrastructure details useful for targeted exploits.
**Remediation:** Remove this endpoint or gate it behind authentication + admin role check. It should never be publicly accessible.

### API-02: /api/health Leaks Environment Configuration (MEDIUM)

**File:** `server/server.js:138-175`
**Description:** The health endpoint reveals whether the app is running on Vercel, whether the database URL is configured, and other environment details. With `?db=true` it also probes the database.
**Remediation:** Return only `{ "status": "ok" }` for unauthenticated callers. Move detailed health info behind admin authentication.

### API-03: /api/reminders/trigger Lacks Authentication in Non-Vercel Environments (CRITICAL)

**File:** `server/routes/reminders.js:11-25`
**Description:** The CRON_SECRET check is only enforced when `process.env.VERCEL` is set. In any non-Vercel deployment (Docker, VPS, local), anyone can call `POST /api/reminders/trigger` to send email reminders to all users with upcoming tasks — enabling email spam/abuse.
**Remediation:** Always require authentication for this endpoint. Check `CRON_SECRET` regardless of deployment environment.

### API-04: error.message Exposed in All API Error Responses (MEDIUM)

**File:** All controllers (49 occurrences, see grep results)
**Description:** Every controller catch block includes `error: error.message` in the JSON response. This can leak internal details such as database column names, constraint names, query structure, and file paths.
**Remediation:** In production (`NODE_ENV === 'production'`), return generic error messages. Log the detailed error server-side only.

### API-05: No Request Body Size Limit Configured (MEDIUM)

**File:** `server/server.js:130`
**Description:** `express.json()` is used without a `limit` option. Express defaults to 100KB, but this should be explicitly set and potentially lowered for endpoints that don't need large payloads.
**Remediation:** Set `express.json({ limit: '100kb' })` explicitly, and use higher limits only on specific routes that need them (e.g., file upload).

### API-06: CORS Allows Null Origin (MEDIUM)

**File:** `server/server.js:87-89`
**Description:** The CORS origin callback contains `if (!origin) return callback(null, true)`. Requests without an `Origin` header (e.g., from server-side tools, Postman, or `file://` pages) bypass CORS entirely. While CORS is a browser mechanism, allowing null origin weakens the defense-in-depth posture.
**Remediation:** Only allow null origin in development mode. In production, require a valid origin from the allowed list.

### API-07: /api/reminders/status Unauthenticated Information Disclosure (LOW)

**File:** `server/routes/reminders.js:47-53`
**Description:** Returns whether the reminder system is enabled and the deployment environment without authentication.
**Remediation:** Gate behind authentication or remove.

### API-08: Static File Serving of Uploads Directory (LOW)

**File:** `server/server.js` (express.static for `/uploads`)
**Description:** The uploads directory is served statically. Without directory listing disabled explicitly (Express disables it by default), any uploaded file is accessible if the filename is known or guessable. Filenames follow the pattern `{userId}-{timestamp}.{ext}`.
**Remediation:** Use randomized, non-guessable filenames (UUIDs) for uploaded files. Consider serving through an authenticated endpoint instead of static files.

---

## Phase 6 — Data Security & Privacy

### DATA-01: User Object Cached in localStorage (HIGH)

**File:** `client/src/store/authStore.js:7,21,55,112,145,180,215,249,282,311`
**Description:** The full user object (including email, role, preferences) is serialized to `localStorage` at `localStorage.setItem('user', JSON.stringify(user))`. This data persists across sessions and is accessible to any JavaScript on the page.
**Remediation:** Store only the minimal necessary data (e.g., user ID and display name). Sensitive fields like role and email should be fetched from the server when needed.

### DATA-02: SSL Certificate Validation Disabled (HIGH)

**File:** `server/config/database.js:24,32`
**Description:** Database connections use `ssl: { rejectUnauthorized: false }`, which accepts any certificate including self-signed or MITM certificates. This effectively disables TLS security for the database connection.
**Remediation:** Set `rejectUnauthorized: true` and provide the database CA certificate via `ssl: { ca: fs.readFileSync('/path/to/ca.pem') }`. For Supabase, their CA cert is publicly documented.

### DATA-03: Demo Credentials Hardcoded in Scripts (MEDIUM)

**File:** `server/scripts/initDatabase.js:84-88`, `server/config/schema.sql` (seed data)
**Description:** Demo user credentials (`admin@arena.com` / `password123`) are hardcoded in initialization scripts and printed to console output. If these accounts exist in production, they provide trivial access.
**Remediation:** Ensure demo data is never seeded in production. Add an environment check to prevent running seed scripts in production mode.

### DATA-04: Password Field Excluded Correctly (POSITIVE FINDING)

**File:** All controllers
**Description:** Password hashes are never included in API responses. Controllers use explicit column selection that excludes `password`. This is a good practice.

### DATA-05: Invitation Token Visible in URL (LOW)

**Description:** Invitation tokens appear in URLs (`/invite/:token`). These URLs may be logged in server access logs, browser history, referrer headers, and analytics tools.
**Remediation:** Consider POST-based token exchange (the token in the URL redirects to a POST form that exchanges it for a session) or ensure tokens are single-use and short-lived (currently 7 days).

### DATA-06: Email Addresses Exposed in Comment Responses (LOW)

**File:** `server/controllers/commentController.js:28`
**Description:** Comment API responses include `author_email` for every comment author. This may unnecessarily expose email addresses.
**Remediation:** Remove `author_email` from comment responses unless specifically needed.

### DATA-07: No .env Files Committed to Repository (POSITIVE FINDING)

**Description:** No actual `.env` files were found in the repository. Only `.env.example` files exist, which is correct practice.

---

## Phase 7 — Dependency & Infrastructure Security

### DEP-01: Supabase Edge Function Has CORS `*` Wildcard (HIGH)

**File:** `supabase/functions/send-invite/index.ts:17`
**Description:** The Edge Function sets `Access-Control-Allow-Origin: *`, allowing any website to call it. Since this function sends emails, any malicious website can trigger invitation emails by crafting requests with valid tokens.
**Remediation:** Restrict the CORS origin to the production domain(s) only.

### DEP-02: Supabase Edge Function Has No Authentication (HIGH)

**File:** `supabase/functions/send-invite/index.ts:22`
**Description:** The Edge Function accepts any POST request with a valid body (email, token, workspaceName, inviterName). There is no authentication check — no JWT verification, no API key, no shared secret. Anyone who discovers the function URL can send arbitrary emails through the Resend API.
**Remediation:** Require a bearer token or shared secret that only the backend server knows. Validate it before processing the request.

### DEP-03: Abstract API Key Exposed in Server-Side URL (MEDIUM)

**File:** `server/controllers/holidayController.js:58`
**Description:** The Abstract API key is embedded in a URL string: `` `${ABSTRACT_API_URL}?api_key=${ABSTRACT_API_KEY}&...` ``. If this URL is logged (e.g., by a proxy, CDN, or error tracker), the API key leaks.
**Remediation:** Pass the API key as a header instead of a query parameter if the API supports it.

### DEP-04: No package-lock.json Integrity Verification (LOW)

**Description:** While `package-lock.json` files exist, there is no CI/CD step verified in the codebase to ensure `npm ci` is used instead of `npm install` (which can modify the lockfile).
**Remediation:** Use `npm ci` in CI/CD pipelines and add a pre-commit hook to prevent lockfile modifications.

### DEP-05: Sentry DSN Exposure Risk (LOW)

**File:** `server/lib/sentry.js:4,11`
**Description:** The Sentry DSN is read from `SENTRY_DSN` environment variable. If it's the same DSN used client-side, it could allow attackers to flood Sentry with fake errors. The current configuration only initializes Sentry server-side, which is correct.
**Remediation:** Ensure client and server use separate Sentry projects/DSNs if client-side error tracking is added later.

### DEP-06: Vercel Cron Job Configuration (LOW)

**File:** `vercel.json`
**Description:** The cron job at `0 9 * * *` calls `/api/reminders/trigger`. The `CRON_SECRET` protection is conditional (see API-03). Vercel preview deployments may also trigger this cron, potentially sending reminder emails from staging environments.
**Remediation:** Disable cron jobs in preview deployments via Vercel configuration, and unconditionally enforce `CRON_SECRET`.

---

## Phase 8 — Business Logic Security

### BIZ-01: No Limit on Workspace Creation (MEDIUM)

**File:** `server/controllers/workspaceController.js:62-115`
**Description:** Any authenticated user can create unlimited workspaces via `POST /api/workspaces`. There is no per-user or global limit.
**Remediation:** Implement a per-user workspace limit (e.g., 10 workspaces per user).

### BIZ-02: No Limit on Invitation Creation (MEDIUM)

**File:** `server/controllers/workspaceController.js:520-`
**Description:** A workspace admin can send unlimited invitations. Combined with the unauthenticated Edge Function (DEP-02), this could be abused for email bombing.
**Remediation:** Rate-limit invitation creation per workspace (e.g., 20 per hour) and per email address (e.g., 3 per hour to the same recipient).

### BIZ-03: Invitation Token Not Strictly Email-Bound on Server (MEDIUM)

**File:** `server/controllers/workspaceController.js:388-516`
**Description:** The `acceptInvitation` endpoint checks that the invitation email matches the authenticated user's email. However, the `getInviteInfo` endpoint is public and reveals the workspace name and inviter details to anyone with the token, even if they are not the intended recipient.
**Remediation:** Only reveal minimal information in `getInviteInfo` (e.g., "You have been invited to a workspace") without exposing workspace name or inviter name to unauthenticated users.

### BIZ-04: No Limit on Task/Category Creation Per Workspace (LOW)

**File:** `server/controllers/taskController.js`, `server/controllers/categoryController.js`
**Description:** There are no limits on the number of tasks or categories a user can create within a workspace. A malicious user could create millions of records.
**Remediation:** Implement per-workspace resource limits (e.g., 10,000 tasks, 100 categories).

### BIZ-05: Account Enumeration via Register Endpoint (MEDIUM)

**File:** `server/controllers/authController.js:82-87`
**Description:** The register endpoint returns `"Email already registered"` for duplicate emails. This allows an attacker to enumerate valid email addresses.
**Remediation:** Return a generic message like `"If this email is not already registered, you will receive a confirmation email."` Alternatively, since this is a team tool with known members, this may be acceptable depending on threat model.

### BIZ-06: Account Enumeration via Login Endpoint (MEDIUM)

**File:** `server/controllers/authController.js:183-188, 194-197`
**Description:** Login returns `"No account found with this email"` for non-existent emails and `"Invalid password"` for wrong passwords. This distinguishes between valid and invalid email addresses.
**Remediation:** Return a generic `"Invalid email or password"` for both cases.

### BIZ-07: User Limit (20) Enforced Only at Application Level (LOW)

**File:** `server/controllers/authController.js:73`
**Description:** The 20-user hard limit is checked via `SELECT COUNT(*)` in the register controller. Direct database inserts (e.g., via Supabase dashboard or migration scripts) bypass this check.
**Remediation:** Add a database-level CHECK or trigger to enforce the limit.

### BIZ-08: Accepted Invitations Not Cleaned Up (LOW)

**File:** Database schema
**Description:** Accepted and expired invitations remain in the `workspace_invitations` table indefinitely. Over time this accumulates stale data.
**Remediation:** Implement a periodic cleanup job that deletes invitations where `accepted_at IS NOT NULL` and `accepted_at < NOW() - INTERVAL '30 days'`, and expired unaccepted invitations.

---

## Phase 9 — Prioritized Remediation Plan

### Tier 1: Critical Fixes (Immediate)

| # | Finding | Severity | Effort |
|---|---------|----------|--------|
| 1 | **AUTHZ-01/02**: Add workspace authorization to `getCategoryById` and `getTaskById` | CRITICAL | Low |
| 2 | **API-01**: Remove or gate `/api/db-test` behind admin auth | CRITICAL | Low |
| 3 | **API-03**: Enforce `CRON_SECRET` on `/api/reminders/trigger` in all environments | CRITICAL | Low |
| 4 | **DEP-02**: Add authentication to Supabase Edge Function `send-invite` | CRITICAL → HIGH | Medium |

### Tier 2: High-Priority Fixes (This Sprint)

| # | Finding | Severity | Effort |
|---|---------|----------|--------|
| 5 | **AUTH-01**: Move JWT from localStorage to httpOnly cookies | HIGH | Medium |
| 6 | **INJ-02/03**: HTML-escape all user input in email templates | HIGH | Low |
| 7 | **AUTHZ-04**: Add workspace scope to comment read/create endpoints | HIGH | Low |
| 8 | **AUTHZ-03**: Add workspace scope to subtasks endpoint | HIGH | Low |
| 9 | **AUTHZ-06**: Add workspace verification to `reorderCategories` | HIGH | Low |
| 10 | **AUTHZ-08**: Enforce admin role for workspace update/delete | HIGH | Low |
| 11 | **AUTHZ-09**: Address RLS not being active for application queries | HIGH | High |
| 12 | **DATA-01**: Reduce data cached in localStorage | HIGH | Low |
| 13 | **DATA-02**: Enable SSL certificate validation for database | HIGH | Low |
| 14 | **DEP-01**: Restrict CORS on Supabase Edge Function | HIGH | Low |

### Tier 3: Medium-Priority Fixes (Next Sprint)

| # | Finding | Severity | Effort |
|---|---------|----------|--------|
| 15 | **AUTH-02**: Add password complexity requirements | MEDIUM | Low |
| 16 | **AUTH-03**: Implement token rotation on privilege changes | MEDIUM | Medium |
| 17 | **AUTH-04**: Implement per-account lockout | MEDIUM | Medium |
| 18 | **AUTH-06**: Implement server-side token invalidation on logout | MEDIUM | Medium |
| 19 | **INJ-04**: Fix cookie `sameSite` for development | MEDIUM | Low |
| 20 | **INJ-07**: Add Content-Disposition headers for uploaded files | MEDIUM | Low |
| 21 | **API-02**: Reduce health endpoint information disclosure | MEDIUM | Low |
| 22 | **API-04**: Remove `error.message` from production responses | MEDIUM | Low |
| 23 | **API-05**: Set explicit body size limits | MEDIUM | Low |
| 24 | **API-06**: Restrict null-origin CORS in production | MEDIUM | Low |
| 25 | **AUTHZ-07**: Fix category name collision check scoping | MEDIUM | Low |
| 26 | **AUTHZ-10**: Scope `/api/auth/users` to workspace | MEDIUM | Low |
| 27 | **AUTHZ-05**: Add workspace check to comment update/delete | MEDIUM | Low |
| 28 | **BIZ-01**: Add workspace creation limits | MEDIUM | Low |
| 29 | **BIZ-02**: Rate-limit invitation creation | MEDIUM | Low |
| 30 | **BIZ-03**: Reduce invite-info information disclosure | MEDIUM | Low |
| 31 | **BIZ-05/06**: Fix account enumeration in auth endpoints | MEDIUM | Low |
| 32 | **DATA-03**: Prevent demo seed in production | MEDIUM | Low |
| 33 | **DEP-03**: Move Abstract API key from URL to header | MEDIUM | Low |

### Tier 4: Low-Priority Improvements (Backlog)

| # | Finding | Severity | Effort |
|---|---------|----------|--------|
| 34 | **AUTH-05**: Validate JWT_SECRET strength at startup | LOW | Low |
| 35 | **AUTH-07**: Secure first-user admin setup | LOW | Medium |
| 36 | **INJ-05**: Add length validation to text fields | LOW | Low |
| 37 | **INJ-06**: Validate avatar file content via magic bytes | LOW | Low |
| 38 | **API-07**: Gate reminder status behind auth | LOW | Low |
| 39 | **API-08**: Use UUIDs for uploaded filenames | LOW | Low |
| 40 | **DATA-05**: Minimize token exposure in URLs | LOW | Medium |
| 41 | **DATA-06**: Remove email from comment responses | LOW | Low |
| 42 | **BIZ-04**: Add per-workspace resource limits | LOW | Medium |
| 43 | **BIZ-07**: Database-level user limit enforcement | LOW | Low |
| 44 | **BIZ-08**: Invitation cleanup job | LOW | Low |
| 45 | **DEP-04**: Enforce `npm ci` in CI/CD | LOW | Low |
| 46 | **DEP-05**: Separate client/server Sentry DSNs | LOW | Low |
| 47 | **DEP-06**: Disable cron in preview deployments | LOW | Low |

---

### Quick Wins (< 30 minutes each, minimal risk)

1. Remove `/api/db-test` endpoint entirely
2. Enforce `CRON_SECRET` regardless of `VERCEL` env
3. Add `AND workspace_id IN (...)` to `getCategoryById` and `getTaskById` queries
4. Add workspace membership joins to comment endpoints
5. HTML-escape email template variables
6. Set `express.json({ limit: '100kb' })`
7. Change login/register error messages to prevent enumeration
8. Set `ssl: { rejectUnauthorized: true }` with proper CA certificate
9. Remove `error: error.message` from production error responses
10. Set `Content-Disposition: attachment` for `/uploads/` static files

### Recommended Longer-Term Improvements

1. **Migrate token storage to httpOnly cookies** — eliminates XSS token theft vector
2. **Implement refresh token rotation** — limits blast radius of compromised tokens
3. **Add audit logging** — track security-sensitive operations (login, role changes, workspace modifications)
4. **Add automated security testing to CI/CD** — `npm audit`, dependency scanning, SAST
5. **Implement a WAF** — Vercel Edge Middleware or Cloudflare for additional protection
6. **Activate and enforce RLS** — either through Supabase client or session variable middleware
7. **Add input sanitization library** — use a library like `xss` or `DOMPurify` for any user content that could be rendered as HTML

---

### Positive Findings

- All SQL queries use parameterized queries (`$1`, `$2`, etc.) — no raw string concatenation in production queries
- Bcrypt with salt rounds of 10 for password hashing
- Rate limiting on auth endpoints (5 req/15 min)
- Global rate limiting (100 req/15 min)
- Helmet security headers enabled
- CORS with configurable allowed origins
- No `.env` files committed to repository
- Password hash never included in API responses
- File upload size limits (5MB) and type filtering
- Invitation tokens use `crypto.randomBytes(32)` — 256 bits of entropy
- Invitation expiration (7 days)
- Email-matching enforcement on invitation acceptance
- Workspace membership verification on most write operations
- `httpOnly` cookie option available for JWT (though client prefers localStorage)

---

*End of Security Audit Report*
