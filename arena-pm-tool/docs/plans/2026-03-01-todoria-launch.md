# Todoria Launch Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Complete all remaining external/infrastructure tasks to launch Todoria.com for live paying users.

**Architecture:** All application code is production-ready (1,622 tests, 99.59% server coverage). Remaining work is Stripe setup, domain configuration, environment separation, secrets rotation, monitoring, CI/CD activation, email authentication, analytics, and manual QA testing. Detailed step-by-step instructions exist in `docs/LAUNCH_GUIDE.md`.

**Tech Stack:** Vercel (deploy), Stripe (billing), Supabase (DB), Resend (email), Sentry (errors), PostHog (analytics), GitHub Actions (CI/CD), UptimeRobot/Better Stack (monitoring)

---

### Task 1: Generate and Document Production Secrets

**Files:**
- Reference: `docs/LAUNCH_GUIDE.md:170-204` (Section 4)
- Reference: `server/.env.example`

**Step 1: Generate JWT_SECRET for production**

Run:
```bash
node -e "console.log('JWT_SECRET=' + require('crypto').randomBytes(64).toString('hex'))"
```
Expected: A 128-character hex string prefixed with `JWT_SECRET=`

**Step 2: Generate CRON_SECRET for production**

Run:
```bash
node -e "console.log('CRON_SECRET=' + require('crypto').randomBytes(32).toString('hex'))"
```
Expected: A 64-character hex string prefixed with `CRON_SECRET=`

**Step 3: Create a production secrets checklist file**

Create file `docs/PRODUCTION_SECRETS.md` with the generated secrets and blanks for external service keys that must be filled in during dashboard setup:

```markdown
# Todoria Production Secrets

Generated: 2026-03-01

## Instructions
1. Copy each value to Vercel > Settings > Environment Variables (Production only)
2. NEVER commit actual secret values to git
3. After copying to Vercel, delete this file or keep it in .gitignore

## Generated Secrets
- [ ] JWT_SECRET=<paste generated value>
- [ ] CRON_SECRET=<paste generated value>

## External Service Keys (fill during setup)
- [ ] STRIPE_SECRET_KEY=sk_live_... (from Stripe Dashboard)
- [ ] STRIPE_WEBHOOK_SECRET=whsec_... (from Stripe Webhook config)
- [ ] STRIPE_PRO_PRICE_ID=price_... (from Stripe Product setup)
- [ ] RESEND_API_KEY=re_... (from Resend Dashboard)
- [ ] SENTRY_DSN=https://...@sentry.io/... (from Sentry project)
- [ ] REACT_APP_POSTHOG_KEY=phc_... (from PostHog project)
- [ ] DATABASE_URL=postgresql://... (from Supabase production project)
- [ ] ABSTRACT_API_KEY=... (from Abstract API)

## Fixed Production Values
- NODE_ENV=production
- ALLOWED_ORIGINS=https://todoria.com,https://www.todoria.com
- CLIENT_URL=https://todoria.com
- EMAIL_FROM=noreply@todoria.app
- EMAIL_FROM_NAME=Todoria
- REACT_APP_POSTHOG_HOST=https://us.i.posthog.com
- REMINDER_JOB_ENABLED=true
- REMINDER_CRON_SCHEDULE=0 9 * * *
- BACKUP_ENABLED=true
- RETENTION_ENABLED=true
```

**Step 4: Add PRODUCTION_SECRETS.md to .gitignore**

In `arena-pm-tool/.gitignore`, add:
```
docs/PRODUCTION_SECRETS.md
```

**Step 5: Commit**

```bash
git add docs/PRODUCTION_SECRETS.md .gitignore
git commit -m "chore: add production secrets template and gitignore entry"
```

---

### Task 2: Verify CI/CD Pipeline Configuration

**Files:**
- Verify: `.github/workflows/ci.yml`
- Reference: `docs/LAUNCH_GUIDE.md:275-322` (Section 7)

**Step 1: Verify deploy jobs are NOT commented out**

Read `.github/workflows/ci.yml` and confirm the `deploy-staging` and `deploy-production` jobs are active (not commented).

Run:
```bash
cd /Users/jonasbarysas/Desktop/WEBDEVPROJECTS/TODORIA20250210/PMPROJECT/arena-pm-tool && grep -n "deploy-staging\|deploy-production" .github/workflows/ci.yml
```
Expected: Lines showing both job names without `#` prefix

**Step 2: Verify Sentry source map upload is conditional**

Confirm the source map upload step in `deploy-production` has an `if` condition checking for `SENTRY_AUTH_TOKEN`:

```bash
grep -A2 "Upload Sentry" .github/workflows/ci.yml
```
Expected: `if: ${{ secrets.SENTRY_AUTH_TOKEN != '' }}`

**Step 3: Verify environment protection references**

```bash
grep "environment:" .github/workflows/ci.yml
```
Expected: Shows `staging` and `production` environment names

**Step 4: Document required GitHub secrets**

Verify the following secrets are referenced in the workflow and create a checklist:

```
Required GitHub Repository Secrets:
- [ ] VERCEL_TOKEN (from https://vercel.com/account/tokens)
- [ ] SENTRY_AUTH_TOKEN (from Sentry > Settings > Auth Tokens)
- [ ] SENTRY_ORG (your Sentry org slug)
- [ ] SENTRY_PROJECT (your Sentry project slug)

Required GitHub Environments:
- [ ] staging (no protection rules)
- [ ] production (require reviewer approval)
```

No code changes expected. This is a verification task.

---

### Task 3: Verify Security Headers and SSL Configuration

**Files:**
- Verify: `vercel.json`
- Verify: `vercel.staging.json`
- Verify: `server/server.js` (Helmet config)
- Reference: `docs/LAUNCH_GUIDE.md:87-126` (Section 2)

**Step 1: Verify vercel.json security headers**

Read `vercel.json` and confirm ALL of these headers are present:
- `X-Content-Type-Options: nosniff`
- `X-Frame-Options: DENY`
- `Referrer-Policy: strict-origin-when-cross-origin`
- `Permissions-Policy: camera=(), microphone=(), geolocation=()`
- `Strict-Transport-Security: max-age=31536000; includeSubDomains; preload`
- `Content-Security-Policy` with `default-src 'self'`

**Step 2: Verify Helmet configuration in server.js**

Read `server/server.js` and confirm Helmet is imported and used with secure defaults.

```bash
grep -n "helmet" server/server.js
```
Expected: Shows helmet import and `app.use(helmet(...))` call

**Step 3: Verify cookie security flags**

```bash
grep -rn "httpOnly\|secure\|sameSite" server/
```
Expected: Cookies set with `httpOnly: true`, `secure: true` (or conditional on production), `sameSite: 'strict'` or `'lax'`

**Step 4: Verify CORS configuration**

```bash
grep -n "ALLOWED_ORIGINS\|cors" server/server.js
```
Expected: CORS configured using `ALLOWED_ORIGINS` env var

No code changes expected. This is a verification task.

---

### Task 4: Verify Database Backup Infrastructure

**Files:**
- Verify: `server/scripts/backupDatabase.js` (or `server/scripts/backup.js`)
- Verify: `server/jobs/backupJob.js`
- Reference: `docs/LAUNCH_GUIDE.md:207-238` (Section 5)

**Step 1: Locate and verify backup script exists**

```bash
find server/scripts -name "*backup*" -o -name "*Backup*" 2>/dev/null
find server/jobs -name "*backup*" -o -name "*Backup*" 2>/dev/null
```

**Step 2: Verify backup job is triggered by env var**

Read the backup job file and confirm it checks `BACKUP_ENABLED` before running.

**Step 3: Verify db:backup npm script exists**

```bash
cd server && grep "db:backup" package.json
```
Expected: Shows `"db:backup": "node scripts/backupDatabase.js"` or similar

No code changes expected. This is a verification task.

---

### Task 5: Run Full Test Suite and Verify Coverage

**Files:**
- Run: `server/` tests
- Run: `client/` tests

**Step 1: Run server tests with coverage**

Run:
```bash
cd /Users/jonasbarysas/Desktop/WEBDEVPROJECTS/TODORIA20250210/PMPROJECT/arena-pm-tool/server && npm test
```
Expected: 973 tests passing, >99% statement coverage

**Step 2: Run client tests**

Run:
```bash
cd /Users/jonasbarysas/Desktop/WEBDEVPROJECTS/TODORIA20250210/PMPROJECT/arena-pm-tool/client && CI=true npm test -- --watchAll=false
```
Expected: 649 tests passing

**Step 3: Verify no test failures**

Both test suites should show 0 failures. If any failures exist, STOP and report them before proceeding.

---

### Task 6: Verify Production Build Succeeds

**Files:**
- Build: `client/`

**Step 1: Run production build**

Run:
```bash
cd /Users/jonasbarysas/Desktop/WEBDEVPROJECTS/TODORIA20250210/PMPROJECT/arena-pm-tool/client && npm run build
```
Expected: Build succeeds with no errors. Warnings about bundle size are acceptable.

**Step 2: Verify build output exists**

```bash
ls -la client/build/
ls -la client/build/static/js/
```
Expected: `build/` directory with `index.html` and `static/js/*.js` files

---

### Task 7: Create Pre-Launch Verification Script

**Files:**
- Create: `server/scripts/prelaunchCheck.js`

**Step 1: Write the pre-launch verification script**

This script verifies all required environment variables are set and external services are reachable.

```javascript
#!/usr/bin/env node

/**
 * Pre-launch verification script
 * Run: node server/scripts/prelaunchCheck.js
 *
 * Checks that all required environment variables are set
 * and external services are reachable before deploying to production.
 */

const https = require('https');

const REQUIRED_SERVER_VARS = [
  'DATABASE_URL',
  'JWT_SECRET',
  'CLIENT_URL',
  'ALLOWED_ORIGINS',
  'STRIPE_SECRET_KEY',
  'STRIPE_WEBHOOK_SECRET',
  'STRIPE_PRO_PRICE_ID',
  'RESEND_API_KEY',
  'CRON_SECRET',
  'SENTRY_DSN',
  'EMAIL_FROM',
  'EMAIL_FROM_NAME',
];

const REQUIRED_CLIENT_VARS = [
  'REACT_APP_POSTHOG_KEY',
  'REACT_APP_POSTHOG_HOST',
];

const OPTIONAL_VARS = [
  'BACKUP_ENABLED',
  'REMINDER_JOB_ENABLED',
  'RETENTION_ENABLED',
  'ABSTRACT_API_KEY',
];

let passed = 0;
let failed = 0;
let warnings = 0;

function check(label, condition, detail) {
  if (condition) {
    console.log(`  PASS  ${label}`);
    passed++;
  } else {
    console.log(`  FAIL  ${label}${detail ? ` -- ${detail}` : ''}`);
    failed++;
  }
}

function warn(label, condition, detail) {
  if (condition) {
    console.log(`  PASS  ${label}`);
    passed++;
  } else {
    console.log(`  WARN  ${label}${detail ? ` -- ${detail}` : ''}`);
    warnings++;
  }
}

console.log('\n=== Todoria Pre-Launch Check ===\n');

// Check required server vars
console.log('Server Environment Variables:');
for (const v of REQUIRED_SERVER_VARS) {
  check(v, !!process.env[v], 'not set');
}

// Check JWT_SECRET length
if (process.env.JWT_SECRET) {
  check('JWT_SECRET length >= 32', process.env.JWT_SECRET.length >= 32,
    `only ${process.env.JWT_SECRET.length} chars`);
}

// Check Stripe keys are live (not test)
if (process.env.STRIPE_SECRET_KEY) {
  check('STRIPE_SECRET_KEY is live key',
    process.env.STRIPE_SECRET_KEY.startsWith('sk_live_'),
    'using test key (sk_test_)');
}

// Check CLIENT_URL is not localhost
if (process.env.CLIENT_URL) {
  check('CLIENT_URL is not localhost',
    !process.env.CLIENT_URL.includes('localhost'),
    process.env.CLIENT_URL);
}

console.log('\nClient Environment Variables:');
for (const v of REQUIRED_CLIENT_VARS) {
  check(v, !!process.env[v], 'not set');
}

console.log('\nOptional Variables:');
for (const v of OPTIONAL_VARS) {
  warn(v, !!process.env[v], 'not set (optional)');
}

console.log('\n--- Summary ---');
console.log(`  Passed:   ${passed}`);
console.log(`  Failed:   ${failed}`);
console.log(`  Warnings: ${warnings}`);
console.log(`  Result:   ${failed === 0 ? 'READY FOR LAUNCH' : 'NOT READY -- fix failures above'}`);
console.log('');

process.exit(failed > 0 ? 1 : 0);
```

**Step 2: Add npm script**

In `server/package.json`, add to `"scripts"`:
```json
"prelaunch": "node scripts/prelaunchCheck.js"
```

**Step 3: Test the script locally (expect failures since we're in dev)**

Run:
```bash
cd server && node scripts/prelaunchCheck.js
```
Expected: FAIL for missing/test values (this is correct in development). The script will pass once production env vars are configured.

**Step 4: Commit**

```bash
git add server/scripts/prelaunchCheck.js server/package.json
git commit -m "feat: add pre-launch environment verification script"
```

---

### Task 8: Create Launch Runbook

**Files:**
- Create: `docs/LAUNCH_RUNBOOK.md`

**Step 1: Write the launch runbook**

This is the step-by-step execution order combining all external tasks with verification gates. Each step references the detailed instructions in LAUNCH_GUIDE.md.

```markdown
# Todoria Launch Runbook

Ordered execution steps for launch day. Each step references detailed instructions in LAUNCH_GUIDE.md.

## Pre-Requisites
- [ ] All tests pass (Task 5 of implementation plan)
- [ ] Production build succeeds (Task 6 of implementation plan)
- [ ] Pre-launch check script created (Task 7 of implementation plan)

---

## Phase 1: External Accounts (Week 1)

### 1.1 Stripe Account
See LAUNCH_GUIDE.md Section 1.

- [ ] Create Stripe account and verify identity
- [ ] Create "Todoria Pro" product: EUR 3.00/seat/month recurring
- [ ] Copy `price_id` -> save as STRIPE_PRO_PRICE_ID
- [ ] Configure Customer Portal (plan changes, cancellation, payment methods)
- [ ] **GATE:** Log into Stripe Dashboard, verify product exists with correct price

### 1.2 PostHog Account
See LAUNCH_GUIDE.md Section 10.

- [ ] Sign up at posthog.com
- [ ] Create "Todoria" project
- [ ] Copy Project API Key (phc_...) -> save as REACT_APP_POSTHOG_KEY
- [ ] Copy Host URL -> save as REACT_APP_POSTHOG_HOST
- [ ] **GATE:** PostHog dashboard loads with project name "Todoria"

### 1.3 Sentry Production Project
See LAUNCH_GUIDE.md Section 9.

- [ ] Create "todoria-production" project in Sentry
- [ ] Copy DSN -> save as SENTRY_DSN
- [ ] Create auth token -> save as SENTRY_AUTH_TOKEN (for GitHub Actions)
- [ ] Note org slug -> save as SENTRY_ORG
- [ ] Note project slug -> save as SENTRY_PROJECT
- [ ] **GATE:** Sentry project dashboard loads, DSN is valid

### 1.4 Resend Production Setup
See LAUNCH_GUIDE.md Section 8.

- [ ] Create production API key in Resend
- [ ] Save as RESEND_API_KEY
- [ ] Add todoria.app domain to Resend
- [ ] Add DNS records: SPF, DKIM, DMARC
- [ ] **GATE:** Resend shows domain as "Verified"

---

## Phase 2: Infrastructure (Week 2)

### 2.1 Supabase Production Project
See LAUNCH_GUIDE.md Section 3.

- [ ] Create "todoria-production" project in Supabase
- [ ] Run migrations: `cd server && DATABASE_URL=<prod-url> npm run migrate:up`
- [ ] Copy connection string -> save as DATABASE_URL
- [ ] Enable PITR backups (Supabase Pro plan)
- [ ] **GATE:** Connect to production DB, verify tables exist

### 2.2 Custom Domain
See LAUNCH_GUIDE.md Section 2.

- [ ] Add todoria.com to Vercel project
- [ ] Add DNS records (A record + CNAME for www)
- [ ] Wait for DNS propagation (up to 48h)
- [ ] **GATE:** `curl -I https://todoria.com` returns 200 with valid SSL

### 2.3 Generate Production Secrets
See Task 1 of this plan + LAUNCH_GUIDE.md Section 4.

- [ ] Generate JWT_SECRET (128-char hex)
- [ ] Generate CRON_SECRET (64-char hex)
- [ ] **GATE:** Both secrets are 32+ characters

### 2.4 Configure Vercel Environment Variables
- [ ] Add ALL production env vars to Vercel (see docs/PRODUCTION_SECRETS.md)
- [ ] Set environment scope to "Production" only
- [ ] Add client vars (REACT_APP_*) as well
- [ ] **GATE:** Run pre-launch check in Vercel deployment logs

### 2.5 Stripe Webhooks (requires domain)
See LAUNCH_GUIDE.md Section 1.4.

- [ ] Add webhook endpoint: `https://todoria.com/api/billing/webhook`
- [ ] Select events: invoice.paid, invoice.payment_failed, customer.subscription.updated, customer.subscription.deleted, customer.subscription.trial_will_end
- [ ] Copy signing secret -> save as STRIPE_WEBHOOK_SECRET in Vercel
- [ ] **GATE:** Stripe shows webhook endpoint as "Active"

### 2.6 Enable Database Backups
See LAUNCH_GUIDE.md Section 5.

- [ ] Set BACKUP_ENABLED=true in Vercel env vars
- [ ] Verify Supabase daily backups are enabled
- [ ] Run manual backup test: `npm run db:backup`
- [ ] **GATE:** Backup file created successfully

---

## Phase 3: CI/CD & Monitoring (Week 3)

### 3.1 GitHub Actions Setup
See LAUNCH_GUIDE.md Section 7.

- [ ] Link Vercel project: `npx vercel link`
- [ ] Add GitHub secrets: VERCEL_TOKEN, SENTRY_AUTH_TOKEN, SENTRY_ORG, SENTRY_PROJECT
- [ ] Create GitHub environments: staging (no rules), production (require reviewer)
- [ ] **GATE:** Push test commit, all CI stages pass through staging

### 3.2 Uptime Monitoring
See LAUNCH_GUIDE.md Section 6.

- [ ] Sign up for UptimeRobot or Better Stack
- [ ] Add monitor: `https://todoria.com/api/health?db=true&queue=true`
- [ ] Set check interval: 5 minutes
- [ ] Configure alerts: email + Slack/Discord
- [ ] **GATE:** Monitor shows "UP" status

### 3.3 Sentry Alert Rules
See LAUNCH_GUIDE.md Section 9.3.

- [ ] Create alert: error rate >0.5% over 1 hour
- [ ] Create alert: new issue type (immediate)
- [ ] Create alert: regression detection
- [ ] Create alert: any 500 error (immediate)
- [ ] **GATE:** Test alert fires on staging test error

---

## Phase 4: Testing & Validation (Week 4)

### 4.1 Stripe Test Mode Lifecycle
See LAUNCH_GUIDE.md Section 1.5.

- [ ] Full lifecycle on staging: signup -> trial -> payment -> add seats -> cancel -> reactivate
- [ ] Test payment failure with card 4000000000000341
- [ ] **GATE:** All billing states update correctly in app

### 4.2 Manual QA on Staging
See LAUNCH_GUIDE.md Section 11.

- [ ] Auth flow (register, verify, login, refresh, forgot password, logout)
- [ ] Billing flow (free -> trial -> pro -> cancel)
- [ ] Plan limits (hit task/member/workspace limits on free)
- [ ] Multi-tenant isolation (2 workspaces, verify zero leakage)
- [ ] Invitation flow (invite, accept, verify role, remove)
- [ ] Task CRUD (create, edit, drag, assign, complete, delete)
- [ ] Calendar view (view, drag to reschedule, create from date)
- [ ] Email delivery (all 5 email types)
- [ ] Security (XSS, cross-workspace API, no-auth access, CSRF)
- [ ] Performance (500 tasks, scroll, filter, search <2s)
- [ ] Mobile viewport (375px full task flow)
- [ ] Cross-browser (Chrome, Firefox, Safari, Edge)
- [ ] **GATE:** All manual tests pass on staging

### 4.3 Legal Review
- [ ] Send Terms.jsx content to lawyer for review
- [ ] Send Privacy.jsx content to lawyer for review
- [ ] Apply any required changes
- [ ] **GATE:** Lawyer signs off on both documents

---

## Phase 5: Go Live (Week 5)

### 5.1 Final Pre-Launch Check
- [ ] Run `npm run prelaunch` with production env vars
- [ ] All checks pass (0 failures)

### 5.2 Switch Stripe to Live Mode
- [ ] Replace sk_test_ with sk_live_ in Vercel env vars
- [ ] Replace test webhook secret with live webhook secret
- [ ] **GATE:** Stripe Dashboard shows live mode active

### 5.3 Deploy to Production
- [ ] Merge latest to main
- [ ] CI pipeline runs: tests -> build -> staging deploy
- [ ] Approve production deploy in GitHub Actions
- [ ] **GATE:** `https://todoria.com` loads correctly

### 5.4 Post-Deploy Smoke Test
- [ ] Register a new account on production
- [ ] Create a workspace and a task
- [ ] Verify email is received
- [ ] Check Sentry for any errors
- [ ] Check PostHog for signup event
- [ ] **GATE:** All production smoke tests pass

### 5.5 Post-Launch Monitoring Setup
See LAUNCH_GUIDE.md Section 12.

- [ ] Set up PostHog dashboards (signup funnel, onboarding, feature usage, upgrade funnel)
- [ ] Monitor Stripe Dashboard for trial conversions
- [ ] Review Sentry weekly (target <0.5% error rate)
- [ ] Monitor Resend delivery (target >95%)
- [ ] **GATE:** All monitoring dashboards are active

---

## Summary

| Phase | Tasks | Duration |
|-------|-------|----------|
| 1. External Accounts | Stripe, PostHog, Sentry, Resend | Week 1 |
| 2. Infrastructure | Supabase, Domain, Secrets, Webhooks, Backups | Week 2 |
| 3. CI/CD & Monitoring | GitHub Actions, Uptime, Sentry Alerts | Week 3 |
| 4. Testing & Validation | Stripe test, Manual QA, Legal review | Week 4 |
| 5. Go Live | Pre-launch check, Deploy, Smoke test, Monitoring | Week 5 |

**Estimated time:** 4-5 weeks with one developer working full-time.

**Code tasks (automatable by Claude):** Tasks 1, 2, 3, 4, 5, 6, 7 of this implementation plan.
**Human-only tasks:** All of Phase 1-5 runbook steps (external dashboards, DNS, legal).
```

**Step 2: Commit**

```bash
git add docs/plans/2026-03-01-todoria-launch.md docs/LAUNCH_RUNBOOK.md
git commit -m "docs: add launch implementation plan and runbook"
```

---

## Execution Order

Tasks 1-7 are **code tasks** that can be executed now by Claude:
- **Batch 1 (Tasks 1-3):** Generate secrets, verify CI/CD, verify security headers
- **Batch 2 (Tasks 4-6):** Verify backups, run test suite, verify production build
- **Batch 3 (Tasks 7-8):** Create pre-launch check script, create launch runbook

Task 8 (Launch Runbook) creates the **human-executable** checklist for the 5-week external/infrastructure work that follows.
