# SaaS Launch Plan — Phases 1–4 Completeness Review

This document reviews the implementation status of Phases 1–4 from `SAAS_LAUNCH_PLAN.md` against the actual codebase.

---

## Phase 1: Fix Critical Bugs and Security Holes

**Completion Label in Plan:** *(none — not marked as completed)*
**Actual Status: ~88% Complete (23 of 26 items done)**

### 1.1 Data Integrity Bugs — 3 of 4 DONE

| # | Item | Status | Evidence |
|---|------|--------|----------|
| 1 | Category reorder workspace_id filter | **NOT DONE** | `categoryController.js:461` — UPDATE uses `WHERE id = $2` without `AND workspace_id = $N`. While the function validates categories belong to the same workspace before updating, the UPDATE itself lacks the filter as a defense-in-depth measure. |
| 2 | Task assignment update transaction | DONE | `taskController.js:638-672` — Wrapped in `BEGIN`/`COMMIT` with `ROLLBACK` on error. |
| 3 | Task position reorder transaction | DONE | `taskController.js:800-837` — Wrapped in transaction with proper error handling. |
| 4 | getMyTasks workspace scope | DONE | `meController.js:418-422` — Adds `AND t.workspace_id = $N` when `workspace_id` is provided. |

### 1.2 Frontend Bugs — 4 of 4 DONE

| # | Item | Status | Evidence |
|---|------|--------|----------|
| 1 | Assignee filter uses `task.assignees` | DONE | Extracted to `hooks/useTaskFilters.js:47` — uses `task.assignees.some()` with fallback. |
| 2 | DatePicker portal ref null guard | DONE | `DatePicker.jsx:77-79` — Guards with `portalRef.current && document.body.contains(portalRef.current)`. |
| 3 | Delete confirmation stale task | DONE | `ListView.jsx:126-130` — `cancelDelete` resets `deletingTask` to null. |
| 4 | TaskDetailModal silent errors | DONE | `TaskDetailModal.jsx:145-174` — Catch blocks now call `toast.error()`. |

### 1.3 Security Hardening — 7 of 8 DONE, 1 PARTIALLY DONE

| # | Item | Status | Evidence |
|---|------|--------|----------|
| 1 | JWT 15-min access + refresh endpoint | DONE | `authController.js:13-18` generates 15m tokens; `routes/auth.js:24` has `/refresh` route; refresh logic at `authController.js:375-440`. |
| 2 | Remove localStorage token | DONE | `authStore.js:19` — `token: null` with comment "managed via httpOnly cookies only". No `localStorage.setItem('token')` found. |
| 3 | CSRF protection | DONE | `server/middleware/csrf.js` — Uses `csrf-csrf` with double-submit cookie pattern. |
| 4 | Rate limit invitations/uploads | DONE | `rateLimiter.js:41-63` — `inviteLimiter` (10/hour) and `uploadLimiter` (20/hour). |
| 5 | File upload security | **PARTIALLY DONE** | `routes/me.js:22-48` — Extension whitelist (`.jpg`, `.png`, `.webp`) and MIME type validation are implemented. **Missing:** Magic number / file-signature validation via `file-type` library. |
| 6 | ORDER BY injection | DONE | `meController.js:434-441` — Uses `SORT_COLUMNS` lookup map instead of string interpolation. |
| 7 | Error message leaks | DONE | Both `meController.js` and `commentController.js` use `safeError()` pattern consistently. |
| 8 | Workspace name length limit | DONE | `workspaceController.js:138,226` — Validates `name.trim().length > 100`. |

### 1.4 Database Indexes — DONE

All five composite indexes verified in `schema.sql:246-251`:
- `idx_tasks_workspace_due`
- `idx_tasks_workspace_status`
- `idx_tasks_workspace_category`
- `idx_workspace_members_role`
- `idx_invitations_workspace_email`

### Phase 1 Remaining Gaps

1. **Category reorder UPDATE** should add `AND workspace_id = $N` to the WHERE clause for defense-in-depth.
2. **File upload magic number validation** — the `file-type` library should be added to verify file signatures, not just MIME type and extension.

---

## Phase 2: SaaS Infrastructure

**Completion Label in Plan:** ✅ COMPLETED
**Actual Status: Correctly marked — all items done.**

### 2.1 Database Migration System — DONE

- `node-pg-migrate` v8.0.4 installed.
- `server/migrations/` directory with 3 numbered migration files.
- npm scripts present: `migrate:up`, `migrate:down`, `migrate:create`.

### 2.2 Billing Schema & Stripe Integration — DONE

- `stripe` v20.3.1 installed.
- `billingController.js` implements all 4 required endpoints (checkout, portal, subscription, webhook).
- `plans`, `subscriptions`, `invoices` tables created in migration `1738900001000_add-billing-tables.js`.
- `billingGuard.js` middleware enforces active subscription, returns 402 on expired/canceled.
- Webhook registered before `express.json()` for raw body signature verification.

### 2.3 Usage Limit Enforcement — DONE

- `planLimits.js` middleware with `checkTaskLimit`, `checkMemberLimit`, `checkWorkspaceLimit`.
- Applied to `POST /api/tasks`, `POST /api/workspaces`, `POST /api/workspaces/:id/invite`.
- Clear error messages matching the plan spec.

### 2.4 Pagination — DONE

- Cursor-based pagination on `GET /api/tasks` and `GET /api/categories` with `nextCursor`/`hasMore` response shape.
- Frontend `taskStore.js` has `loadMoreTasks` method.

### 2.5 Migration for Existing Data — DONE

- Migration `1738900002000_seed-plans-and-subscriptions.js` seeds free and pro plans.
- Creates free subscription for every existing workspace (idempotent with `ON CONFLICT DO NOTHING`).
- Composite indexes from Phase 1.4 included.

### Phase 2 Remaining Gaps

None identified. Phase 2 is fully implemented.

---

## Phase 3: Production Reliability

**Completion Label in Plan:** *(none — not marked as completed)*
**Actual Status: ~70% Complete — core items done, consistency gaps remain.**

### 3.1 Transaction Safety — 4 of 4 DONE

| Operation | Status | Evidence |
|-----------|--------|----------|
| Task assignment update | DONE | `taskController.js:638-672` — BEGIN/COMMIT/ROLLBACK |
| Task position reorder | DONE | `taskController.js:800-837` — Full transaction |
| Category batch reorder | DONE | `categoryController.js:455-471` — Full transaction |
| Workspace deletion | DONE | `workspaceController.js:296-321` — Transaction with cascaded record count logging |

### 3.2 Error Handling Standardization — PARTIALLY DONE

| Item | Status | Evidence |
|------|--------|----------|
| AppError.js custom error class | DONE | `server/lib/AppError.js` — Static factory methods: `badRequest()`, `unauthorized()`, `forbidden()`, `notFound()`, `conflict()`, `internal()` |
| Global error handler middleware | DONE | `server.js:228-237` — Catches unhandled errors, logs with context, returns safe response with requestId |
| withErrorHandling wrapper usage | **PARTIALLY DONE** | `server/lib/withErrorHandling.js` exists and works. Used in some routes (42 occurrences in `me.js`, `auth.js`). **Not applied to task, category, and workspace controllers** — ~65 `console.error()` calls remain across those controllers. |
| Request ID generation | DONE | `server/middleware/requestId.js` — `crypto.randomUUID()` per request, attached to `req.id` and `X-Request-Id` response header. |

### 3.3 Email Reliability — PARTIALLY DONE

| Item | Status | Evidence |
|------|--------|----------|
| email_queue table | DONE | `addProductionReliabilityTables.js:8-22` — Full schema with status checks and indexes. |
| EmailService uses queue | **PARTIALLY DONE** | `emailQueue.js` provides `queueEmail()` functions, but controllers still call `sendTaskAssignmentNotification()` from `emailService.js` directly (fire-and-forget). Not all email sends go through the queue. |
| Retry logic + cron processor | DONE | `emailQueueProcessor.js` — Exponential backoff (`POWER(2, attempts)`), batch processing (10 at a time). `emailQueueJob.js` runs every 30 seconds. |

### 3.4 Cron Job Reliability — 3 of 3 DONE

| Item | Status | Evidence |
|------|--------|----------|
| reminder_log table | DONE | `addProductionReliabilityTables.js:32-46` — Unique constraint on `(task_id, user_id, reminded_on)`. |
| Advisory lock | DONE | `emailQueueProcessor.js:21-26` (LOCK_ID 294837) and `reminderService.js:99-111` (LOCK_ID 583921). |
| Health check for cron status | DONE | `/api/health?queue=true` returns pending/sent/failed/retrying counts. |

### 3.5 Monitoring & Alerting — PARTIALLY DONE

| Item | Status | Evidence |
|------|--------|----------|
| Structured logging (pino) | DONE | `server/lib/logger.js` — JSON in production, readable in dev. Redacts sensitive fields. |
| Request ID in logs | DONE | `withErrorHandling.js:36` and job files include requestId in log context. |
| Sentry coverage | **PARTIALLY DONE** | Sentry initialized in `server/lib/sentry.js`. `Sentry.setupExpressErrorHandler(app)` registered. But only controllers wrapped with `withErrorHandling` report to Sentry — unwrapped controllers (task, category, workspace) bypass Sentry reporting. |

### Phase 3 Remaining Gaps

1. **withErrorHandling not applied to all controllers** — Task, category, and workspace controllers still use raw `try/catch` with `console.error()`. This means errors in these controllers don't go to Sentry and don't use structured logging.
2. **Email sending not fully queued** — Controllers call `emailService.js` directly instead of using `emailQueue.js`. The queue infrastructure exists but isn't the sole path for all outgoing emails.
3. **Sentry coverage incomplete** — Directly tied to gap #1. Wrapping all controllers with `withErrorHandling` would resolve both issues.

---

## Phase 4: UX & Performance for Paying Users

**Completion Label in Plan:** ✅ COMPLETED
**Actual Status: ~95% Complete — one item partially done.**

### 4.1 Frontend Performance — PARTIALLY DONE (1 gap)

| Item | Status | Evidence |
|------|--------|----------|
| useMemo on filtered lists | DONE | `TaskList.jsx:58-61,237-270` and `ListView.jsx:324-346` — Multiple memoized computations. |
| useCallback on inline handlers | DONE | `ListView.jsx:260-319` — `getSubtasks`, `toggleDropdown`, `handlePrioritySelect`, etc. all use `useCallback`. |
| CalendarView optimizations | DONE | `CalendarView.jsx:52-75,171-191,333-342` — Memoized computations; debounced holiday API (300ms). |
| React.lazy() + Suspense | DONE | `App.js:17-20,64` — `WorkspaceSelectionPage`, `UserArea`, `WorkspaceOnboarding`, `Billing` lazy loaded with `Suspense` + `PageLoader` fallback. |
| react-window list virtualization | **NOT DONE** | `react-window` v2.2.6 is installed in `package.json` but **not imported or used anywhere** in the codebase. ListView and TaskList render all rows. |

### 4.2 Deduplicate Logic — DONE

| Item | Status | Evidence |
|------|--------|----------|
| useTaskActions.js hook | DONE | Centralizes `handleToggleComplete` with `togglingTaskIds` state. Used in TaskList and ListView. |
| useTaskFilters.js hook | DONE | Centralizes filter logic (search, assignees, priorities, categories, hideCompleted). Used in TaskList and ListView. |

### 4.3 Loading & Error States — DONE

| Item | Status | Evidence |
|------|--------|----------|
| isSwitching state | DONE | `workspaceStore.js:16,95,109` — Tracks workspace switching for loading indicators. |
| Save button spinners | DONE | `TaskDetailModal.jsx:37,148-156` and `TaskModal.jsx:36,189,502` — `isSaving`/`isSubmitting` state with `ButtonSpinner`. |
| Async handleDrop + optimistic UI | DONE | `CalendarView.jsx:287-309` — Async with optimistic update; refetches on error to revert. |
| Drag-and-drop error recovery | DONE | `CalendarView.jsx:301-303` — Calls `fetchTasks()` on failure to revert. |

### 4.4 Accessibility — DONE

| Item | Status | Evidence |
|------|--------|----------|
| aria-label on icon-only buttons | DONE | Present in Dashboard, ListView, CalendarView, TaskDetailModal, UpgradeModal. |
| Non-color overdue indicator | DONE | `ListView.jsx:700-701` — `AlertCircle` icon + "Overdue" text label alongside red color. |
| Modal focus management | DONE | TaskModal auto-focuses title input (lines 65-73); TaskDetailModal auto-focuses on edit (lines 126-138); modals use `role="dialog"` and `aria-modal="true"`. |
| Keyboard navigation | DONE | Escape key handling in TaskDetailModal (lines 78-102); `role` attributes on custom dialogs; Tab-accessible elements. |

### 4.5 Unsaved Changes Warning — DONE

| Item | Status | Evidence |
|------|--------|----------|
| isDirty state tracking | DONE | `TaskModal.jsx:42-49` — Compares all form fields against initial values. |
| beforeunload handler | DONE | `TaskModal.jsx:52-62` — Prevents accidental browser close when dirty. |
| Confirmation dialog | DONE | `TaskModal.jsx:37,196-198` — `showUnsavedWarning` state triggers confirmation dialog on close. |

### 4.6 Billing UI — DONE

| Item | Status | Evidence |
|------|--------|----------|
| Billing.jsx page | DONE | Lazy loaded in App.js. Shows usage metrics, plan info, progress bars with color coding. |
| UpgradeModal.jsx | DONE | Three plan tiers (Free, Pro, Business) with proper dialog accessibility attributes. |
| PlanBadge.jsx | DONE | Displays plan status with icons (Sparkles for Pro, Crown for Business). Integrated in Dashboard header. |
| Usage indicators | DONE | `UsageBar` component in Billing.jsx with task/workspace/category/member counts and limits. |

### Phase 4 Remaining Gaps

1. **react-window not used** — The dependency is installed but never imported. ListView and TaskList render all rows without virtualization. This will cause performance issues with large task lists (500+ tasks).

---

## Summary

| Phase | Plan Label | Actual Completion | Key Gaps |
|-------|------------|-------------------|----------|
| **Phase 1** | *(unmarked)* | **~88%** (23/26 items) | Category reorder missing workspace_id in UPDATE; file upload missing magic number validation |
| **Phase 2** | ✅ COMPLETED | **100%** | None — correctly marked |
| **Phase 3** | *(unmarked)* | **~70%** | `withErrorHandling` not applied to all controllers; email sends not fully queued; Sentry coverage incomplete |
| **Phase 4** | ✅ COMPLETED | **~95%** | `react-window` installed but not used for list virtualization |

### Priority Remediation Items

1. **[Phase 3] Wrap all controllers with `withErrorHandling`** — This single change fixes both the inconsistent error handling and the Sentry coverage gap. Highest impact fix remaining.
2. **[Phase 3] Route all email sends through `emailQueue`** — Replace direct `emailService` calls in controllers with `emailQueue` equivalents.
3. **[Phase 4] Implement `react-window` in ListView** — The dependency is already installed; it just needs to be wired up.
4. **[Phase 1] Add workspace_id to category reorder UPDATE** — Simple WHERE clause addition for defense-in-depth.
5. **[Phase 1] Add `file-type` magic number validation** — Install the library and add validation to the upload route.
