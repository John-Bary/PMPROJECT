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
