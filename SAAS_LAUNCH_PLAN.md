# Todoria SaaS Launch Plan — $3/workspace seat/month

## Executive Summary

After a thorough audit of the Todoria codebase (Arena PM Tool), the app has solid foundations: workspace-scoped multi-tenancy, role-based access control, drag-and-drop task management, calendar views, email notifications, and a clean React + Express + PostgreSQL stack. However, it is **not production-ready for paid SaaS** in its current state. This plan identifies every gap — bugs, security holes, missing infrastructure, and missing business logic — and lays out the exact sequence of work to go from "working side project" to "product people pay $3/seat/month for."

The plan is organized into 6 phases, ordered by dependency and risk. Each phase has concrete deliverables, the specific files that need changes, and the rationale for why it matters.

---

## Current State Assessment

### What Works Well
- Multi-workspace architecture with UUID-based workspace IDs
- Role-based access control (admin/member/viewer) at the workspace level
- Workspace invitations with expiring tokens and email delivery
- Task CRUD with drag-and-drop reordering across categories
- Calendar view with task display
- Subtasks, comments, and multiple assignees per task
- Email reminders via Resend + node-cron
- Security basics: Helmet, CORS, rate limiting, parameterized SQL, bcrypt, JWT
- Sentry integration for error tracking
- Vercel-ready serverless deployment

### What's Broken or Missing

**Bugs (code-level):**
1. Assignee filter uses wrong field (`task.assigneeId` instead of `task.assignees[]`) in `client/src/components/TaskList.jsx:268-269` — board-view filtering is broken
2. Category reorder query missing workspace_id filter in `server/controllers/categoryController.js:548-552` — reordering affects ALL workspaces globally
3. Task assignment update (delete + insert) not wrapped in a transaction in `server/controllers/taskController.js:614-638` — race condition can lose assignments
4. Task position reordering not wrapped in a transaction in `server/controllers/taskController.js:765-789` — concurrent drags corrupt positions
5. DatePicker portal ref set to null then accessed later in `client/src/components/DatePicker.jsx:77-79` — potential crash
6. Delete confirmation in ListView can reference stale task after backdrop dismiss in `client/src/pages/ListView.jsx:1070-1104`
7. TaskDetailModal silent error swallowing (empty catch blocks) in `client/src/components/TaskDetailModal.jsx:145-171`
8. `meController.js` getMyTasks uses `assignee_id` field without workspace scope check — data leakage across workspaces
9. Error responses in `meController.js` and `commentController.js` leak `error.message` in non-production environments

**Security gaps:**
1. JWT expiration set to 7 days with no refresh token mechanism
2. JWT stored in localStorage (XSS-vulnerable) redundantly alongside httpOnly cookie
3. No CSRF protection despite cookie-based auth
4. Missing rate limiting on workspace invitations, avatar uploads
5. File upload validates MIME type only — extension not whitelisted, no magic-number check
6. ORDER BY injection risk in `meController.js:431` via string interpolation
7. No audit logging for any operations
8. Workspace name has no max-length validation

**Missing SaaS infrastructure:**
1. No billing, subscriptions, or payment processing
2. No usage limits enforcement (tasks per workspace, members per workspace)
3. No proper database migration system (manual scripts only)
4. No pagination on any list endpoint
5. No data export functionality (GDPR compliance)
6. No account deletion flow (GDPR compliance)
7. No terms of service / privacy policy acceptance tracking
8. No onboarding completion analytics
9. No admin dashboard for operators

**Performance:**
1. No list virtualization — all tasks rendered at once
2. No memoization on filtered task lists (`TaskList.jsx`, `ListView.jsx`)
3. Subtask count is a separate COUNT query on every task fetch
4. No query result caching
5. Connection pool capped at 2 for serverless (bottleneck under load)

---

## Phase 1: Fix Critical Bugs and Security Holes

**Goal:** Make the existing features actually work correctly and safely before adding anything new.

**Why first:** You cannot charge money for software with data-corruption bugs and cross-workspace data leakage.

### 1.1 Fix Data Integrity Bugs

| # | Issue | File(s) | Fix |
|---|-------|---------|-----|
| 1 | Category reorder affects all workspaces | `server/controllers/categoryController.js:548-552` | Add `AND workspace_id = $N` to the UPDATE query |
| 2 | Task assignment update not transactional | `server/controllers/taskController.js:614-638` | Wrap DELETE + INSERT in `BEGIN`/`COMMIT` with `ROLLBACK` on error |
| 3 | Task position reorder not transactional | `server/controllers/taskController.js:765-789` | Wrap multi-statement position updates in a transaction |
| 4 | `getMyTasks` missing workspace scope | `server/controllers/meController.js:407-408` | Add workspace_id filter to the WHERE clause or join through workspace_members |

### 1.2 Fix Frontend Bugs

| # | Issue | File(s) | Fix |
|---|-------|---------|-----|
| 1 | Assignee filter broken in board view | `client/src/components/TaskList.jsx:268-269` | Change `task.assigneeId` to check `task.assignees` array (use `.some()`) |
| 2 | DatePicker portal ref crash | `client/src/components/DatePicker.jsx:77-79` | Guard `portalRef.current` access with null check before DOM operations |
| 3 | Delete confirmation stale task | `client/src/pages/ListView.jsx:1070-1104` | Reset `deletingTask` state on backdrop dismiss |
| 4 | TaskDetailModal silent errors | `client/src/components/TaskDetailModal.jsx:145-171` | Add `toast.error()` in catch blocks |

### 1.3 Harden Security

| # | Issue | Fix |
|---|-------|-----|
| 1 | JWT 7-day expiry, no refresh | Reduce access token to 15 min; add `/auth/refresh` endpoint using httpOnly refresh token cookie (7-day expiry); add token rotation |
| 2 | Remove localStorage token storage | `client/src/store/authStore.js` — Remove `localStorage.setItem('token')`; rely exclusively on httpOnly cookies; update axios interceptor to not send Authorization header (cookie handles it) |
| 3 | Add CSRF protection | Install `csrf-csrf` (double-submit cookie pattern); add CSRF token endpoint; include token in all state-changing requests from frontend |
| 4 | Rate limit invitations/uploads | `server/middleware/rateLimiter.js` — Add `inviteLimiter` (5/hour) and `uploadLimiter` (3/min); apply to respective routes |
| 5 | Fix file upload security | `server/routes/me.js` — Whitelist extensions (`.jpg`, `.png`, `.webp` only); reject user-provided extension; add `file-type` magic number validation |
| 6 | Fix ORDER BY injection | `server/controllers/meController.js:431` — Use a lookup map instead of string interpolation: `const SORT_COLUMNS = { title: 't.title', due_date: 't.due_date', ... }` |
| 7 | Fix error message leaks | `server/controllers/meController.js` and `commentController.js` — Use the existing `safeError()` pattern consistently; never return `error.message` to client |
| 8 | Add workspace name length limit | `server/controllers/workspaceController.js:211` — Add `name.length > 100` check |

### 1.4 Add Missing Composite Indexes

```sql
CREATE INDEX idx_tasks_workspace_due ON tasks(workspace_id, due_date);
CREATE INDEX idx_tasks_workspace_status ON tasks(workspace_id, status);
CREATE INDEX idx_tasks_workspace_category ON tasks(workspace_id, category_id);
CREATE INDEX idx_workspace_members_role ON workspace_members(workspace_id, role);
CREATE INDEX idx_invitations_workspace_email ON workspace_invitations(workspace_id, email) WHERE accepted_at IS NULL;
```

**Deliverable:** All existing features work correctly, data stays within workspace boundaries, auth is hardened, no silent failures.

---

## Phase 2: SaaS Infrastructure

**Goal:** Add the systems that make a SaaS product operate: billing, usage limits, migrations, and compliance.

**Why second:** You need this before letting anyone pay. Without billing, there is no business. Without migrations, you can't deploy schema changes safely.

### 2.1 Database Migration System

Replace the current manual scripts approach:

1. Install `node-pg-migrate` (lightweight, battle-tested, no ORM dependency)
2. Create `server/migrations/` directory with numbered migration files
3. Add `migrations` table to track applied migrations
4. Create initial migration from current `schema.sql`
5. Add npm scripts: `npm run migrate:up`, `npm run migrate:down`, `npm run migrate:create`
6. Add migration step to deployment pipeline (run before server starts)

### 2.2 Billing Schema & Stripe Integration

New database tables:

```sql
-- Plans define pricing tiers
CREATE TABLE plans (
    id VARCHAR(50) PRIMARY KEY,         -- 'free', 'pro'
    name VARCHAR(100) NOT NULL,
    price_per_seat_cents INTEGER NOT NULL, -- 300 for $3.00
    max_members INTEGER,                 -- NULL = unlimited
    max_tasks_per_workspace INTEGER,     -- NULL = unlimited
    features JSONB DEFAULT '{}'::jsonb,
    active BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Each workspace has a subscription
CREATE TABLE subscriptions (
    id SERIAL PRIMARY KEY,
    workspace_id UUID NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
    plan_id VARCHAR(50) NOT NULL REFERENCES plans(id),
    stripe_customer_id VARCHAR(255),
    stripe_subscription_id VARCHAR(255),
    status VARCHAR(20) NOT NULL DEFAULT 'active'
        CHECK (status IN ('active', 'past_due', 'canceled', 'trialing')),
    trial_ends_at TIMESTAMPTZ,
    current_period_start TIMESTAMPTZ,
    current_period_end TIMESTAMPTZ,
    seat_count INTEGER NOT NULL DEFAULT 1,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    CONSTRAINT one_subscription_per_workspace UNIQUE (workspace_id)
);

-- Invoices for record-keeping
CREATE TABLE invoices (
    id SERIAL PRIMARY KEY,
    workspace_id UUID NOT NULL REFERENCES workspaces(id),
    stripe_invoice_id VARCHAR(255),
    amount_cents INTEGER NOT NULL,
    status VARCHAR(20) NOT NULL,
    period_start TIMESTAMPTZ,
    period_end TIMESTAMPTZ,
    pdf_url TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);
```

Implementation:

1. **Install Stripe SDK** (`stripe` npm package)
2. **Create `server/controllers/billingController.js`:**
   - `POST /api/billing/checkout` — Create Stripe Checkout Session for workspace
   - `POST /api/billing/portal` — Create Stripe Customer Portal session (manage subscription)
   - `GET /api/billing/subscription` — Get current workspace subscription status
   - `POST /api/billing/webhook` — Stripe webhook handler (invoice.paid, subscription.updated, subscription.deleted, customer.subscription.trial_will_end)
3. **Create `server/middleware/billingGuard.js`:**
   - Middleware that checks workspace subscription status before allowing actions
   - Returns `402 Payment Required` for expired/canceled subscriptions
   - Enforces plan limits (member count, task count)
4. **Pricing model:**
   - **Free tier:** 1 workspace, 3 members, 50 tasks — lets people try the product
   - **Pro tier:** $3/seat/month — unlimited tasks, up to 50 members, email reminders, all features
   - 14-day free trial of Pro on signup

### 2.3 Usage Limit Enforcement

Add limit checks as middleware on relevant endpoints:

```
server/middleware/planLimits.js
```

| Action | Limit check |
|--------|------------|
| `POST /api/tasks` | Count tasks in workspace vs. plan limit |
| `POST /api/workspaces/:id/invite` | Count members + pending invites vs. plan limit |
| `POST /api/workspaces` | Count user's workspaces vs. plan limit |
| All write operations | Check subscription status is active/trialing |

Return clear error messages: `"Your workspace has reached the 50-task limit on the Free plan. Upgrade to Pro for unlimited tasks."`

### 2.4 Pagination

Add cursor-based pagination to all list endpoints:

| Endpoint | Implementation |
|----------|---------------|
| `GET /api/tasks` | Add `?cursor=<last_id>&limit=50`; return `{ data: [...], nextCursor: <id>, hasMore: true }` |
| `GET /api/categories` | Same pattern, default limit 50 |
| `GET /api/tasks/:id/comments` | Same pattern, default limit 20 |
| `GET /api/workspaces/:id/members` | Same pattern, default limit 50 |

Frontend: Add infinite scroll or "Load more" button to `TaskList.jsx` and `ListView.jsx`.

### 2.5 Proper Database Migration for Existing Data

Create a migration that:
1. Adds the `plans`, `subscriptions`, `invoices` tables
2. Seeds default plans (free, pro)
3. Creates a free subscription for every existing workspace
4. Adds composite indexes from Phase 1.4

**Deliverable:** Stripe integration working in test mode, usage limits enforced, all schema changes via versioned migrations, list endpoints paginated.

---

## Phase 3: Production Reliability

**Goal:** Make the system resilient enough that paying customers won't lose data or encounter downtime.

**Why third:** You're about to have real users depending on this. Reliability is table stakes.

### 3.1 Transaction Safety

Wrap all multi-statement database operations in transactions:

| Operation | File | Current state |
|-----------|------|--------------|
| User registration + workspace creation | `authController.js:92-121` | Already transactional ✓ |
| Workspace creation + member add | `workspaceController.js:151-168` | Already transactional ✓ |
| Invitation acceptance | `workspaceController.js:546-642` | Already transactional ✓ |
| Task assignment update | `taskController.js:614-638` | **NEEDS TRANSACTION** |
| Task position reorder | `taskController.js:765-789` | **NEEDS TRANSACTION** |
| Category batch reorder | `categoryController.js:437-443` | **NEEDS TRANSACTION** |
| Workspace deletion | `workspaceController.js:282` | Relies on CASCADE — add explicit transaction with logging |

### 3.2 Error Handling Standardization

Create a unified error handling strategy:

1. **Create `server/lib/AppError.js`** — Custom error class with status code, user-safe message, and internal details
2. **Create global error handler middleware** — Catches all unhandled errors, logs to Sentry with context, returns safe response
3. **Replace all `try/catch` blocks in controllers** with the `withErrorHandling` wrapper (already exists at `server/lib/withErrorHandling.js` but only used partially)
4. **Add request ID** — Generate UUID per request, include in all log entries and error responses, pass to Sentry

### 3.3 Email Reliability

Current state: Single send attempt, no retry, no queue. This is unacceptable for paid SaaS.

Options (pick one):
- **Option A (simpler):** Add a `pending_emails` table; write emails to DB; process with cron job; retry failed sends 3x with exponential backoff; mark as sent/failed
- **Option B (better for scale):** Use a managed queue service (AWS SQS, BullMQ with Redis); process asynchronously; automatic retries

For launch, **Option A** is sufficient:

```sql
CREATE TABLE email_queue (
    id SERIAL PRIMARY KEY,
    to_email VARCHAR(255) NOT NULL,
    template VARCHAR(50) NOT NULL,
    template_data JSONB NOT NULL,
    attempts INTEGER DEFAULT 0,
    max_attempts INTEGER DEFAULT 3,
    status VARCHAR(20) DEFAULT 'pending',
    last_error TEXT,
    sent_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW()
);
```

Modify `emailService.js` to insert into queue instead of sending directly. Add cron job to process queue every 30 seconds.

### 3.4 Cron Job Reliability

Current state: If the process restarts, reminders are missed. No duplicate prevention.

Fixes:
1. Add `reminder_log` table to track sent reminders (prevents duplicates)
2. Add distributed lock (advisory lock in PostgreSQL: `SELECT pg_try_advisory_lock(...)`) before running reminder job
3. Add health check endpoint for cron job status
4. Log all reminder activity to structured logs

### 3.5 Monitoring & Alerting

1. **Sentry:** Already integrated — ensure ALL controllers use the error wrapper
2. **Uptime monitoring:** Add `/health` endpoint that checks DB connectivity (already exists) — connect to UptimeRobot or Better Stack
3. **Structured logging:** Replace `console.log/console.error` with `pino` (fast, structured JSON logging). Add request ID, user ID, workspace ID to all log entries
4. **Key metrics to alert on:**
   - Error rate > 5% of requests
   - Response time p95 > 2 seconds
   - Database connection pool exhaustion
   - Email queue backlog > 100
   - Failed payment webhooks

**Deliverable:** All writes are transactional, errors are handled uniformly, emails are queued and retried, cron jobs are idempotent, structured logging and monitoring in place.

---

## Phase 4: UX & Performance for Paying Users ✅ COMPLETED

**Goal:** Make the product feel professional enough that people justify $3/seat/month.

**Why fourth:** The previous phases ensure correctness and reliability. Now we make it fast and polished.

### 4.1 Frontend Performance

| Fix | File(s) | Approach |
|-----|---------|----------|
| Memoize filtered task lists | `TaskList.jsx`, `ListView.jsx` | Wrap filter logic in `useMemo` with proper dependency arrays |
| Virtualize long lists | `ListView.jsx` | Add `react-window` for table rows; render only visible rows |
| Memoize inline functions | `ListView.jsx:276-303` | Extract `getSubtasks` and `toggleDropdown` into `useCallback` |
| Fix CalendarView dependencies | `CalendarView.jsx:156-178` | Add missing deps to `useMemo`; debounce holiday API calls |
| Lazy load routes | `App.js` | Use `React.lazy()` + `Suspense` for CalendarView, UserArea pages |

### 4.2 Deduplicate Logic

The same task-completion toggle logic exists in 3 places. Extract into a shared hook:

```javascript
// client/src/hooks/useTaskActions.js
export function useTaskActions() {
  const { updateTask } = useTaskStore();

  const toggleComplete = useCallback(async (task) => {
    const newStatus = task.status === 'completed' ? 'todo' : 'completed';
    await updateTask(task.id, {
      status: newStatus,
      completed_at: newStatus === 'completed' ? new Date().toISOString() : null
    });
  }, [updateTask]);

  return { toggleComplete };
}
```

Replace duplicated code in:
- `client/src/pages/ListView.jsx:148-164`
- `client/src/components/TaskList.jsx:115-131`
- `client/src/components/TaskDetailModal.jsx:173-199`

Same for filter logic duplicated between `ListView.jsx:342-361` and `TaskList.jsx:259-281`.

### 4.3 Loading & Error States

| Gap | Fix |
|-----|-----|
| Workspace switch has no loading indicator | Add `isSwitching` state to `workspaceStore.js`; show skeleton UI during switch |
| Partial saves show no feedback | Add spinner to save buttons in `TaskDetailModal.jsx` for all field updates, not just title/description |
| CalendarView drag-and-drop doesn't await | Make `handleDrop` await the update and show optimistic UI with rollback on failure |
| Network errors during drag-and-drop | Add retry logic or revert to previous position on failure |

### 4.4 Accessibility Fixes

| Issue | Fix |
|-------|-----|
| Missing ARIA labels on buttons | Add `aria-label` to all icon-only buttons (filter, edit, delete, checkbox) across all components |
| Color-only overdue indicator | Add icon or text label alongside red color for overdue tasks |
| Modal focus management | Auto-focus first input on modal open; trap focus within modal; return focus on close |
| Keyboard navigation | Ensure all interactive elements are reachable via Tab; add `role` attributes to custom dropdowns |

### 4.5 Add Unsaved Changes Warning

In `TaskModal.jsx`: Track `isDirty` state by comparing form values to initial values. Show confirmation dialog on close/navigate-away when dirty. Use `beforeunload` event for browser back/refresh.

### 4.6 Billing UI

New frontend pages/components:

1. **`client/src/pages/Billing.jsx`** — Shows current plan, seat count, next billing date, usage stats
2. **`client/src/components/UpgradeModal.jsx`** — Triggered when user hits a plan limit; shows pricing comparison; links to Stripe Checkout
3. **`client/src/components/PlanBadge.jsx`** — Shows current plan in workspace header ("Free" or "Pro")
4. **Usage indicators** — Show task count/limit, member count/limit in sidebar

**Deliverable:** Snappy UI, no unnecessary re-renders, accessible, professional loading/error states, billing pages ready.

---

## Phase 5: Compliance & Legal

**Goal:** Meet the minimum legal and compliance requirements for a paid B2B SaaS.

**Why fifth:** You need this before launch but not before building.

### 5.1 GDPR Compliance

| Requirement | Implementation |
|-------------|----------------|
| Right to data export | Add `GET /api/me/export` — returns JSON of all user data, tasks, comments |
| Right to deletion | Add `DELETE /api/me/account` — deletes user, anonymizes their content, removes from all workspaces |
| Data processing agreement | Create a DPA page linked from settings |
| Cookie consent | Add cookie consent banner (only needed if using analytics cookies; httpOnly auth cookies are exempt) |
| Privacy policy | Write and host a privacy policy; track user acceptance with timestamp |

### 5.2 Terms of Service

1. Write ToS covering: acceptable use, payment terms, data ownership, liability limits
2. Add `tos_accepted_at TIMESTAMPTZ` column to users table
3. Require ToS acceptance on registration
4. Add ToS acceptance to workspace creation for new workspaces

### 5.3 Audit Logging

Create an audit log system for security and compliance:

```sql
CREATE TABLE audit_logs (
    id BIGSERIAL PRIMARY KEY,
    workspace_id UUID REFERENCES workspaces(id) ON DELETE SET NULL,
    user_id INTEGER REFERENCES users(id) ON DELETE SET NULL,
    action VARCHAR(50) NOT NULL,    -- 'task.created', 'member.invited', 'role.changed'
    resource_type VARCHAR(30),       -- 'task', 'category', 'member', 'workspace'
    resource_id VARCHAR(50),
    details JSONB,
    ip_address INET,
    user_agent TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_audit_workspace ON audit_logs(workspace_id, created_at DESC);
CREATE INDEX idx_audit_user ON audit_logs(user_id, created_at DESC);
```

Add middleware that logs state-changing operations automatically. Workspace admins can view audit logs via `GET /api/workspaces/:id/audit-log`.

### 5.4 Data Retention

1. Auto-delete expired invitations older than 30 days (cron job)
2. Auto-anonymize audit logs older than 2 years
3. Document retention policy in privacy policy

**Deliverable:** GDPR-compliant data export/deletion, ToS acceptance, audit logging, retention policies.

---

## Phase 6: Launch Preparation

**Goal:** Go live with paying customers.

### 6.1 Deployment Hardening

| Item | Action |
|------|--------|
| Environment separation | Separate staging and production Vercel projects; separate databases |
| Database backups | Automated daily backups with point-in-time recovery (Supabase provides this; if self-hosted, use `pg_dump` cron + S3) |
| SSL everywhere | Verify all cookies have `Secure` flag; HSTS headers active; no mixed content |
| Secrets management | Audit all env vars; rotate JWT secret; use separate Stripe keys per environment |
| CI/CD | GitHub Actions: lint → test → build → deploy to staging → deploy to production (manual approval) |
| Database connection pool | Increase serverless pool to 5; add PgBouncer for production if on managed Postgres |

### 6.2 Landing Page & Marketing Site

The existing `LandingPage.jsx` needs to become a conversion page:

1. **Hero section:** Clear value prop — "Simple task management for small teams. $3/seat/month."
2. **Feature highlights:** Workspaces, drag-and-drop, calendar, email reminders, team collaboration
3. **Pricing section:** Free vs. Pro comparison table
4. **Social proof:** (Gather from beta users or show feature screenshots)
5. **CTA:** "Start free — no credit card required"
6. **Footer:** Links to ToS, Privacy Policy, contact

### 6.3 Onboarding Flow

The existing onboarding (`WorkspaceOnboarding.jsx`) needs to guide users to their "aha moment":

1. **Step 1:** Create workspace (name it)
2. **Step 2:** Create first category
3. **Step 3:** Create first task
4. **Step 4:** Invite a team member
5. **Step 5:** (Optional) Set up email reminders

Track completion rates per step to identify drop-off.

### 6.4 Stripe Setup Checklist

1. Create Stripe account; complete identity verification
2. Create Product: "Todoria Pro" with price: $3.00/seat/month (recurring)
3. Configure Customer Portal: allow plan changes, cancellation, payment method updates
4. Set up webhooks: `invoice.paid`, `invoice.payment_failed`, `customer.subscription.updated`, `customer.subscription.deleted`, `customer.subscription.trial_will_end`
5. Test full lifecycle in Stripe test mode: signup → trial → first payment → upgrade seats → cancel
6. Configure Stripe Tax if needed for your jurisdiction

### 6.5 Pre-Launch Testing Checklist

| Area | Test |
|------|------|
| Auth | Register → Login → Refresh token → Logout flow |
| Billing | Free signup → Trial → Upgrade → Downgrade → Cancel |
| Limits | Hit task limit → See upgrade prompt → Upgrade → Limit removed |
| Multi-tenant | Create 2 workspaces; verify complete data isolation |
| Invitations | Invite by email → Accept → Verify role → Remove member |
| Task CRUD | Create → Edit inline → Drag between categories → Complete → Delete |
| Calendar | View tasks → Drag to reschedule → Create from date click |
| Email | Receive invitation email → Receive reminder email → Receive assignment notification |
| Security | Attempt XSS in task title → Attempt accessing other workspace's data → Attempt API without auth |
| Performance | Load 500 tasks → Scroll → Filter → Search → Verify <2s response |
| Mobile | Complete full task flow on mobile viewport |

### 6.6 Metrics to Track Post-Launch

| Metric | Tool | Target |
|--------|------|--------|
| Signup → First task created | PostHog or Mixpanel | >60% |
| Trial → Paid conversion | Stripe + custom | >5% |
| Monthly churn | Stripe | <8% |
| NPS score | In-app survey (30 days post-signup) | >30 |
| Error rate | Sentry | <0.5% of requests |
| p95 response time | Structured logs | <500ms |
| Email delivery rate | Resend dashboard | >95% |

---

## Implementation Priority & Sequencing

```
Phase 1: Fix Bugs & Security          ← Do first (1-2 weeks)
  ├── 1.1 Data integrity bugs         (2-3 days)
  ├── 1.2 Frontend bugs               (1-2 days)
  ├── 1.3 Security hardening          (3-4 days)
  └── 1.4 Database indexes            (half day)

Phase 2: SaaS Infrastructure          ← Do second (2-3 weeks)
  ├── 2.1 Migration system            (1-2 days)
  ├── 2.2 Billing + Stripe            (5-7 days)
  ├── 2.3 Usage limits                (2 days)
  ├── 2.4 Pagination                  (2 days)
  └── 2.5 Data migration              (1 day)

Phase 3: Production Reliability        ← Do third (1-2 weeks)
  ├── 3.1 Transaction safety           (1-2 days)
  ├── 3.2 Error handling               (2 days)
  ├── 3.3 Email queue                  (2-3 days)
  ├── 3.4 Cron reliability             (1 day)
  └── 3.5 Monitoring                   (1-2 days)

Phase 4: UX & Performance             ← Do fourth (1-2 weeks)
  ├── 4.1 Frontend performance         (2-3 days)
  ├── 4.2 Dedup logic                  (1 day)
  ├── 4.3 Loading/error states         (1-2 days)
  ├── 4.4 Accessibility                (1-2 days)
  ├── 4.5 Unsaved changes warning      (half day)
  └── 4.6 Billing UI                   (2-3 days)

Phase 5: Compliance & Legal            ← Do fifth (1 week)
  ├── 5.1 GDPR compliance             (2-3 days)
  ├── 5.2 Terms of service            (1 day)
  ├── 5.3 Audit logging               (2 days)
  └── 5.4 Data retention              (1 day)

Phase 6: Launch Prep                   ← Do last (1 week)
  ├── 6.1 Deployment hardening        (1-2 days)
  ├── 6.2 Landing page                (1-2 days)
  ├── 6.3 Onboarding polish           (1 day)
  ├── 6.4 Stripe setup                (half day)
  ├── 6.5 Testing                     (2 days)
  └── 6.6 Metrics setup               (half day)
```

**Total estimated effort: 8-11 weeks** for a single developer working full-time.

---

## Revenue Projections

At $3/seat/month:

| Scenario | Workspaces | Avg seats | MRR | ARR |
|----------|------------|-----------|-----|-----|
| 3 months post-launch | 20 | 4 | $240 | $2,880 |
| 6 months | 80 | 5 | $1,200 | $14,400 |
| 12 months | 250 | 5 | $3,750 | $45,000 |
| 24 months | 800 | 6 | $14,400 | $172,800 |

Key levers: free-to-paid conversion rate, team size growth within workspaces, churn rate.

---

## What NOT to Build Before Launch

Resist the urge to add these before you have paying customers:

- **Integrations** (Slack, GitHub, Jira) — build after customers ask
- **Custom fields on tasks** — add when teams outgrow the current schema
- **Time tracking** — different product category; don't dilute
- **Gantt charts** — complexity magnet; wait for demand signal
- **Mobile native apps** — responsive web is sufficient for launch
- **AI features** — shiny but won't drive initial conversions
- **SSO/SAML** — enterprise feature; not relevant at $3/seat
- **Webhooks/API keys** — build when integration demand appears
- **Task templates** — nice-to-have, not a blocker
- **Activity feed** — build after audit logging (Phase 5)

The product already has the core features people pay for: task management with categories, assignees, priorities, due dates, calendar, drag-and-drop, team collaboration, and email reminders. The work is in making it **reliable, secure, and billable** — not in adding more features.
