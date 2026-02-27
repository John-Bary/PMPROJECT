# Todoria - Launch Infrastructure Guide

Step-by-step checklist for every external and infrastructure task that requires human action before launching Todoria in production.

---

## Table of Contents
1. [Stripe Production Setup](#1-stripe-production-setup)
2. [Custom Domain Setup](#2-custom-domain-setup)
3. [Environment Separation](#3-environment-separation)
4. [Secrets Rotation](#4-secrets-rotation)
5. [Database Backups](#5-database-backups)
6. [Uptime Monitoring](#6-uptime-monitoring)
7. [CI/CD Pipeline Activation](#7-cicd-pipeline-activation)
8. [Email Configuration](#8-email-configuration)
9. [Error Monitoring](#9-error-monitoring)
10. [Analytics Setup](#10-analytics-setup)
11. [Pre-Launch Testing Checklist](#11-pre-launch-testing-checklist-manual)
12. [Post-Launch Monitoring](#12-post-launch-monitoring)

---

## 1. Stripe Production Setup

### 1.1 Create and Verify Account
- [ ] Create a Stripe account at https://dashboard.stripe.com/register
- [ ] Complete identity verification (government ID + business details)
- [ ] Activate your account for live payments (Settings > Account details)

### 1.2 Create the "Todoria Pro" Product
- [ ] Go to **Products** > **Add product**
- [ ] Name: `Todoria Pro`
- [ ] Pricing model: **Recurring**, billed **Monthly**
- [ ] Price: **EUR 3.00 per seat per month** (unit amount, metered by seat count)
- [ ] Copy the resulting `price_id` (starts with `price_`) -- you will need it for `STRIPE_PRO_PRICE_ID`

### 1.3 Configure Customer Portal
- [ ] Go to **Settings** > **Billing** > **Customer portal**
- [ ] Enable: Plan changes (upgrades and downgrades)
- [ ] Enable: Subscription cancellation
- [ ] Enable: Payment method updates
- [ ] Customize branding: Upload Todoria logo, set brand colors to match the app
- [ ] Set redirect URL to `https://todoria.com/dashboard`

### 1.4 Set Up Production Webhooks
- [ ] Go to **Developers** > **Webhooks** > **Add endpoint**
- [ ] Endpoint URL:
  ```
  https://todoria.com/api/billing/webhook
  ```
- [ ] Select events:
  - `invoice.paid`
  - `invoice.payment_failed`
  - `customer.subscription.updated`
  - `customer.subscription.deleted`
  - `customer.subscription.trial_will_end`
- [ ] Copy the **Signing secret** (`whsec_...`) -- this becomes `STRIPE_WEBHOOK_SECRET`

### 1.5 Test Full Billing Lifecycle (Test Mode)
Before going live, run through the complete billing lifecycle using Stripe test keys:

- [ ] Signup with a new account (free plan)
- [ ] Upgrade to Pro -- 14-day trial begins
- [ ] Wait for (or simulate) trial end -- first payment is charged
- [ ] Add seats (increase quantity on the subscription)
- [ ] Downgrade seats (decrease quantity)
- [ ] Cancel subscription -- verify status updates in Todoria
- [ ] Reactivate subscription -- verify it resumes correctly
- [ ] Test payment failure with card `4000000000000341` -- verify `invoice.payment_failed` webhook fires

### 1.6 Configure Stripe Tax (If Applicable)
- [ ] If selling to EU customers: enable **Stripe Tax** (Settings > Tax)
- [ ] Configure tax registrations for your country
- [ ] EU VAT reverse charge rules apply for B2B sales -- enable tax ID collection in the Customer Portal
- [ ] Verify invoices include correct VAT amounts

### 1.7 Store Production Keys
Add these to your production environment variables (see Section 4):
```
STRIPE_SECRET_KEY=sk_live_...
STRIPE_WEBHOOK_SECRET=whsec_...
STRIPE_PRO_PRICE_ID=price_...
```

---

## 2. Custom Domain Setup

### 2.1 Register or Configure Domain
- [ ] Register `todoria.com` (or verify you already own it) via your domain registrar

### 2.2 Add Domain to Vercel
- [ ] Open your Vercel project dashboard
- [ ] Go to **Settings** > **Domains**
- [ ] Add `todoria.com` and `www.todoria.com`

### 2.3 Point DNS Records
In your domain registrar's DNS settings:

| Type  | Name  | Value                    |
|-------|-------|--------------------------|
| A     | @     | `76.76.21.21`            |
| CNAME | www   | `cname.vercel-dns.com`   |

> Vercel IPs may change. Always check the current IP at https://vercel.com/docs/projects/domains/add-a-domain

- [ ] DNS records created
- [ ] Vercel shows domain as **Valid Configuration** (may take up to 48 hours for propagation)

### 2.4 SSL Certificate
- [ ] Vercel will automatically provision and renew a Let's Encrypt SSL certificate once DNS is validated. No manual action required.

### 2.5 Update Environment Variables
Update production environment variables to use the new domain:

```bash
ALLOWED_ORIGINS=https://todoria.com,https://www.todoria.com
CLIENT_URL=https://todoria.com
```

### 2.6 Verify HTTPS
- [ ] Visit `http://todoria.com` -- should redirect to `https://todoria.com`
- [ ] Visit `http://www.todoria.com` -- should redirect to `https://todoria.com`
- [ ] Open browser DevTools > Console -- verify **no mixed content warnings**
- [ ] Run SSL test: https://www.ssllabs.com/ssltest/analyze.html?d=todoria.com

---

## 3. Environment Separation

### 3.1 Vercel Projects
- [ ] Ensure separate Vercel projects (or use Vercel's preview/production environments):
  - **Staging**: auto-deployed from `main` branch pushes (or use Vercel Preview Deployments)
  - **Production**: deployed manually or via CI with approval gate

### 3.2 Supabase Projects
- [ ] Create separate Supabase projects:
  - `todoria-staging` -- for staging/preview
  - `todoria-production` -- for production
- [ ] Run all migrations on both projects:
  ```bash
  # Point DATABASE_URL to staging, then:
  cd server && npm run migrate:up

  # Point DATABASE_URL to production, then:
  cd server && npm run migrate:up
  ```

### 3.3 Environment Variables Per Environment
Each environment must have its own set of secrets. Never share keys between staging and production.

| Variable             | Staging                  | Production              |
|----------------------|--------------------------|-------------------------|
| `DATABASE_URL`       | Staging Supabase URL     | Production Supabase URL |
| `JWT_SECRET`         | Unique staging secret    | Unique production secret|
| `STRIPE_SECRET_KEY`  | `sk_test_...`            | `sk_live_...`           |
| `STRIPE_WEBHOOK_SECRET` | Test webhook secret   | Live webhook secret     |
| `RESEND_API_KEY`     | Staging Resend key       | Production Resend key   |
| `SENTRY_DSN`         | Staging Sentry DSN       | Production Sentry DSN   |
| `CRON_SECRET`        | Unique staging secret    | Unique production secret|
| `CLIENT_URL`         | Staging Vercel URL       | `https://todoria.com`   |
| `ALLOWED_ORIGINS`    | Staging Vercel URL       | `https://todoria.com,https://www.todoria.com` |

- [ ] Staging uses Stripe **test keys** (`sk_test_...`)
- [ ] Production uses Stripe **live keys** (`sk_live_...`)
- [ ] All other secrets are unique per environment

---

## 4. Secrets Rotation

Generate fresh, cryptographically random secrets for production. Never reuse development or staging secrets.

### 4.1 JWT Secret
```bash
node -e "console.log(require('crypto').randomBytes(64).toString('hex'))"
```
- [ ] Generated a new 128-character hex string
- [ ] Stored as `JWT_SECRET` in production environment

### 4.2 CRON Secret
```bash
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```
- [ ] Generated a new 64-character hex string
- [ ] Stored as `CRON_SECRET` in production environment

### 4.3 Stripe Keys
- [ ] Using **live** Stripe keys (`sk_live_...`), not test keys
- [ ] Webhook signing secret is from the **production** webhook endpoint

### 4.4 Resend API Key
- [ ] Created a new API key in the Resend dashboard specifically for production
- [ ] Stored as `RESEND_API_KEY` in production environment

### 4.5 Sentry DSN
- [ ] Created a separate Sentry project for production (e.g., `todoria-production`)
- [ ] Stored the DSN as `SENTRY_DSN` in production environment

### 4.6 Verification
- [ ] **No development secrets are used in production**
- [ ] **No production secrets are committed to git**
- [ ] All secrets are stored exclusively in Vercel environment variables (Settings > Environment Variables)

---

## 5. Database Backups

### 5.1 Supabase Automated Backups
- [ ] In Supabase dashboard: **Settings** > **Database** > **Backups**
- [ ] Verify daily automated backups are enabled (included on Pro plan)
- [ ] Supabase Pro plan includes **Point-in-Time Recovery (PITR)** -- enable it for continuous backup with restore to any second

### 5.2 Additional Off-Site Backups
For additional safety, use the existing backup script to dump to S3 or Cloudflare R2:

```bash
# Test the backup job locally
cd server && npm run db:backup
```

- [ ] Backup script (`server/scripts/backup.js`) is configured with S3/R2 credentials
- [ ] Set up a weekly cron (or use Vercel Cron) to run the backup:
  ```
  BACKUP_ENABLED=true
  ```
- [ ] Verified a backup file was created successfully

### 5.3 Test Restore Procedure
**Do this before launch.** A backup you cannot restore is not a backup.

```bash
# Restore to a test database (never directly to production)
cd server && npm run db:restore
```

- [ ] Restored a backup to a test Supabase project
- [ ] Verified data integrity after restore (spot-check users, workspaces, tasks)

---

## 6. Uptime Monitoring

### 6.1 Choose a Monitoring Service
- [ ] Sign up for one of:
  - **UptimeRobot** (free tier: 50 monitors, 5-min checks) -- https://uptimerobot.com
  - **Better Stack** (free tier: 10 monitors, 3-min checks) -- https://betterstack.com

### 6.2 Configure Health Check Monitor
- [ ] Monitor type: **HTTP(S)**
- [ ] URL:
  ```
  https://todoria.com/api/health?db=true&queue=true
  ```
- [ ] Check interval: **5 minutes**
- [ ] Expected response status: `200`
- [ ] Expected response body contains:
  ```json
  { "status": "healthy", "database": "connected" }
  ```

### 6.3 Configure Alerts
- [ ] Alert via **email** (primary contact)
- [ ] Alert via **Slack webhook** or **Discord webhook** (for team visibility)
- [ ] Set escalation: if down for >15 minutes, send a second alert

### 6.4 Status Page (Optional)
- [ ] Set up a public status page at `status.todoria.com`
- [ ] UptimeRobot: Settings > Public Status Pages
- [ ] Better Stack: Status Pages > Create
- [ ] Add CNAME record: `status` -> status page provider URL

---

## 7. CI/CD Pipeline Activation

The CI pipeline is already defined at `.github/workflows/ci.yml` with stages: backend tests, frontend tests, build, deploy staging, deploy production. The deploy steps are commented out and need to be activated.

### 7.1 Link Vercel to Your Project
```bash
# Run this locally to link the project
cd arena-pm-tool && npx vercel link
```
- [ ] After linking, note the values from `.vercel/project.json`:
  - `orgId` -- this is your `VERCEL_ORG_ID`
  - `projectId` -- this is your `VERCEL_PROJECT_ID`

### 7.2 Create a Vercel API Token
- [ ] Go to https://vercel.com/account/tokens
- [ ] Create a new token with a descriptive name (e.g., `github-actions-todoria`)
- [ ] Copy the token -- this is your `VERCEL_TOKEN`

### 7.3 Add GitHub Repository Secrets
- [ ] Go to your GitHub repo > **Settings** > **Secrets and variables** > **Actions**
- [ ] Add the following repository secrets:

| Secret Name         | Value                                |
|---------------------|--------------------------------------|
| `VERCEL_TOKEN`      | Token from Step 7.2                  |
| `VERCEL_ORG_ID`     | `orgId` from `.vercel/project.json`  |
| `VERCEL_PROJECT_ID` | `projectId` from `.vercel/project.json` |

### 7.4 Configure GitHub Environment Protection Rules
- [ ] Go to repo **Settings** > **Environments**
- [ ] Create `staging` environment:
  - No protection rules (auto-deploy on push to `main`)
- [ ] Create `production` environment:
  - Enable **Required reviewers** -- add at least one reviewer
  - This ensures production deploys require manual approval

### 7.5 Uncomment Deploy Steps in CI
- [ ] Edit `.github/workflows/ci.yml` and uncomment the `deploy-staging` and `deploy-production` job steps

### 7.6 Verify the Pipeline
- [ ] Push a small test commit to `main`
- [ ] Go to **Actions** tab in GitHub and verify all stages pass:
  - Backend tests (green)
  - Frontend tests (green)
  - Frontend build (green)
  - Deploy staging (green)
  - Deploy production (pending approval)
- [ ] Approve the production deploy and verify the live site updates

---

## 8. Email Configuration

### 8.1 Domain Authentication
- [ ] Log in to Resend: https://resend.com/domains
- [ ] Add your sending domain (e.g., `todoria.app` or `todoria.com`)
- [ ] Add the required DNS records to your domain registrar:

| Type  | Name                          | Value                                  |
|-------|-------------------------------|----------------------------------------|
| TXT   | `resend._domainkey`           | _(provided by Resend)_                |
| TXT   | `@`                           | `v=spf1 include:amazonses.com ~all`   |
| CNAME | `resend._domainkey`           | _(provided by Resend)_                |

- [ ] **SPF** record added and verified
- [ ] **DKIM** record added and verified
- [ ] **DMARC** record added (recommended):
  ```
  TXT  _dmarc  v=DMARC1; p=quarantine; rua=mailto:dmarc@todoria.com
  ```

### 8.2 Test Email Delivery
Run through every email type the app sends:

```bash
cd server && npm run email:test
```

- [ ] **Verification email**: Register a new account, receive verification link
- [ ] **Invitation email**: Invite a user to a workspace, receive invite link
- [ ] **Reminder email**: Trigger a task reminder, receive due-date notification
- [ ] **Password reset email**: Request a password reset, receive reset link
- [ ] **Assignment notification**: Assign a task, assignee receives notification

### 8.3 Monitor Delivery Rates
- [ ] Check the Resend dashboard after test sends
- [ ] Target: **>95% delivery rate**
- [ ] Set up Resend webhook alerts for bounces and complaints (if available)
- [ ] Investigate and resolve any bounced emails before launch

---

## 9. Error Monitoring

### 9.1 Verify Sentry Captures Errors
- [ ] Deploy to staging and trigger a test error:
  ```bash
  # Visit this URL (or add a test endpoint) to verify Sentry receives it
  curl https://staging.todoria.com/api/health
  ```
- [ ] Check your Sentry project dashboard: https://sentry.io -- verify events appear
- [ ] Verify both **server-side** (`@sentry/node`) and **client-side** (`@sentry/react`) errors are captured

### 9.2 Configure Source Maps
- [ ] Ensure the client build uploads source maps to Sentry for readable stack traces:
  ```bash
  # In your build step or CI, add:
  npx @sentry/cli sourcemaps upload --release=<version> ./client/build
  ```
- [ ] Verify a client-side error in Sentry shows the original source file and line number (not minified code)

### 9.3 Set Up Alert Rules
In Sentry > **Alerts** > **Create Alert Rule**:

- [ ] **High error rate**: Alert when error rate exceeds **0.5%** of requests over 1 hour
- [ ] **New issue type**: Alert immediately when a **new** (never-before-seen) error type occurs
- [ ] **Regression detection**: Alert when a previously resolved issue **regresses** (reappears)
- [ ] **P0 errors**: Alert immediately for any error with status code 500

### 9.4 Alert Routing
- [ ] Alerts sent to: email + Slack/Discord channel
- [ ] Assign default issue owner for triage

---

## 10. Analytics Setup

### 10.1 PostHog Account
PostHog is already integrated in the codebase at `client/src/utils/analytics.js`.

- [ ] Sign up at https://posthog.com (free tier: 1M events/month)
- [ ] Create a new project for Todoria
- [ ] Copy your **Project API Key** (`phc_...`) and **Host** URL

### 10.2 Configure Environment Variables
Add to the client `.env` (or Vercel environment variables):

```bash
REACT_APP_POSTHOG_KEY=phc_...
REACT_APP_POSTHOG_HOST=https://us.i.posthog.com
```

### 10.3 Install PostHog (If Not Already Installed)
```bash
cd client && npm install posthog-js
```

### 10.4 Verify Event Tracking
After deploying with PostHog configured:

- [ ] **Signup** event fires on new registration
- [ ] **Login** event fires on sign-in
- [ ] **task_created** event fires when creating a task
- [ ] **Onboarding step** events fire during workspace setup
- [ ] **Upgrade click** events fire when interacting with billing CTAs

Check events in PostHog > **Events** > **Live Events**.

### 10.5 Set Up PostHog Dashboards
Create the following dashboards in PostHog:

- [ ] **Signup funnel**: Landing page visit -> Register -> Verify email -> First login -> Create first task
- [ ] **Onboarding completion rate**: Started onboarding -> Completed all steps
- [ ] **Feature usage**: Board view vs. List view vs. Calendar view usage breakdown
- [ ] **Upgrade funnel**: Free plan -> View pricing -> Click upgrade -> Complete checkout

---

## 11. Pre-Launch Testing Checklist (Manual)

Run through every test below on the **staging** environment before deploying to production.

### Authentication
- [ ] Register a new account with email + password
- [ ] Receive and click the verification email
- [ ] Log in with verified account
- [ ] Refresh the page -- session persists (token refresh works)
- [ ] Forgot password -- receive reset email -- reset password successfully
- [ ] Log out -- session is cleared, protected routes redirect to login

### Billing
- [ ] Sign up on free plan
- [ ] Upgrade to Pro -- Stripe checkout opens, 14-day trial starts
- [ ] Complete payment with test card `4242424242424242`
- [ ] Add seats -- subscription quantity increases, next invoice updates
- [ ] Cancel subscription -- status changes, access transitions at period end
- [ ] Reactivate subscription -- access restored

### Plan Limits
- [ ] On free plan: hit the task limit -- UI shows upgrade prompt
- [ ] On free plan: hit the member limit -- invite is blocked with upgrade message
- [ ] On free plan: hit the workspace limit -- creation is blocked
- [ ] Upgrade to Pro -- all limits are removed

### Multi-Tenant Data Isolation
- [ ] Create 2 separate workspaces with different members
- [ ] Verify Workspace A's tasks do not appear in Workspace B
- [ ] Verify Workspace A's members do not appear in Workspace B
- [ ] Via API: attempt to access Workspace B resources using Workspace A credentials -- expect 403

### Invitations
- [ ] Send an invitation email to a new user
- [ ] New user receives the email with invite link
- [ ] New user accepts the invitation -- joins workspace with correct role
- [ ] Verify the invited member's role in the members list
- [ ] Remove the member -- they lose access immediately

### Task CRUD
- [ ] Create a new task with title, description, priority, due date, and assignee
- [ ] Edit the task -- change all fields
- [ ] Drag the task between categories (Board view)
- [ ] Assign the task to another user -- assignee receives notification
- [ ] Set priority to urgent -- visual indicator updates
- [ ] Mark task as completed -- moves to completed state
- [ ] Delete the task -- removed from all views

### Calendar View
- [ ] View tasks on the calendar -- tasks appear on their due dates
- [ ] Drag a task to a different date -- due date updates
- [ ] Click on a date -- create a new task for that date

### Email Delivery
- [ ] Verification email received and functional
- [ ] Invitation email received and functional
- [ ] Reminder email received (trigger manually or wait for cron)
- [ ] Password reset email received and functional
- [ ] Task assignment notification received

### Security
- [ ] Try XSS payloads in task title: `<script>alert('xss')</script>` -- should be sanitized
- [ ] Try XSS in task description and comments -- should be sanitized
- [ ] Access another workspace's API endpoint directly -- should return 403
- [ ] Use the app without authentication (clear cookies, hit protected routes) -- should redirect to login
- [ ] Verify CSRF protection: manually send a POST request without CSRF token -- should be rejected

### Performance
- [ ] Create a workspace with 500 tasks
- [ ] Scroll through all tasks in List view -- smooth, no jank (virtualized rendering)
- [ ] Apply a filter -- results appear in <2 seconds
- [ ] Use search -- results appear in <2 seconds
- [ ] Monitor network tab: API responses return in <500ms

### Mobile Responsiveness
- [ ] Open Chrome DevTools, set viewport to 375px width
- [ ] Complete the full task flow: create, edit, assign, complete, delete
- [ ] Navigation sidebar collapses to mobile overlay
- [ ] All modals and forms are usable on small screens

### Cross-Browser Testing
Test core flows (login, create task, drag & drop, upgrade) on:
- [ ] Chrome (latest)
- [ ] Firefox (latest)
- [ ] Safari (latest)
- [ ] Edge (latest)

---

## 12. Post-Launch Monitoring

### Churn Tracking
- [ ] Monitor Stripe webhook `customer.subscription.deleted` events
- [ ] Target: **<8% monthly churn rate**
- [ ] Set up a simple dashboard (Stripe Dashboard > Billing > Overview) to track:
  - Monthly Recurring Revenue (MRR)
  - Net new subscriptions vs. cancellations
  - Trial conversion rate

### Error Budget
- [ ] Sentry error rate target: **<0.5% of total requests**
- [ ] Review Sentry weekly for recurring issues
- [ ] If error rate exceeds 0.5%, pause feature work and focus on stability

### Email Delivery
- [ ] Monitor Resend dashboard weekly
- [ ] Target: **>95% delivery rate**
- [ ] Investigate any bounce rate above 5% immediately
- [ ] Monitor complaint rate -- target <0.1%

### NPS Survey
- [ ] Plan an in-app NPS survey at **30 days post-signup**
- [ ] Use PostHog Surveys or a lightweight library to ask: "How likely are you to recommend Todoria?" (0-10)
- [ ] Target: **NPS >30**
- [ ] Follow up with detractors (0-6) to understand pain points

### Response Time Monitoring
- [ ] Monitor `/api/health` response times via your uptime monitoring service
- [ ] Target: **p95 <500ms**
- [ ] Set up alerts if p95 exceeds 1 second
- [ ] If response times degrade, check:
  - Database query performance (Supabase Dashboard > Database > Query Performance)
  - Vercel function cold starts (Vercel Dashboard > Functions)
  - Connection pool exhaustion (check `DATABASE_URL` pool size)

---

## Quick Reference: All Production Environment Variables

```bash
# Core
NODE_ENV=production
PORT=5001
ALLOWED_ORIGINS=https://todoria.com,https://www.todoria.com
CLIENT_URL=https://todoria.com

# Database
DATABASE_URL=postgresql://user:password@host:5432/todoria

# Auth (generate fresh -- see Section 4.1)
JWT_SECRET=<128-char-hex-string>

# Email
RESEND_API_KEY=re_production_...
EMAIL_FROM=noreply@todoria.app
EMAIL_FROM_NAME=Todoria

# Billing
STRIPE_SECRET_KEY=sk_live_...
STRIPE_WEBHOOK_SECRET=whsec_...
STRIPE_PRO_PRICE_ID=price_...

# Scheduled Jobs (generate fresh -- see Section 4.2)
CRON_SECRET=<64-char-hex-string>
REMINDER_JOB_ENABLED=true
REMINDER_CRON_SCHEDULE=0 9 * * *
BACKUP_ENABLED=true
RETENTION_ENABLED=true

# Monitoring
SENTRY_DSN=https://...@sentry.io/production-project-id

# Analytics (client-side)
REACT_APP_POSTHOG_KEY=phc_...
REACT_APP_POSTHOG_HOST=https://us.i.posthog.com

# External APIs
ABSTRACT_API_KEY=<your-key>
```

---

**Last updated:** 2026-02-27
