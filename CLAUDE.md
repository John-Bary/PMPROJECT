# CLAUDE.md - Todoria

## Project Overview

Todoria is a multi-workspace project management SaaS application. It provides task management with board/list/calendar views, drag & drop, team collaboration with role-based access, Stripe billing (free & pro plans), onboarding flows, and GDPR compliance features.

**Repository:** https://github.com/John-Bary/PMPROJECT
**Deployment:** Vercel (frontend + serverless API)

## Tech Stack

### Frontend (React)
- **Framework**: React 19 with Create React App
- **Styling**: Tailwind CSS 3.4 (indigo primary palette, Inter font)
- **State Management**: Zustand 5
- **Routing**: React Router DOM 7
- **HTTP Client**: Axios (with CSRF + cookie auth)
- **Drag & Drop**: @hello-pangea/dnd
- **Animations**: framer-motion (modal/page transitions)
- **Date Handling**: date-fns, react-day-picker
- **Icons**: lucide-react
- **Notifications**: sonner (toast.success/error/info)
- **Error Tracking**: @sentry/react
- **Virtualization**: react-window

### Backend (Node.js)
- **Framework**: Express 5
- **Database**: PostgreSQL (via pg) + Supabase
- **Authentication**: JWT (httpOnly cookies) + bcryptjs
- **Validation**: Zod
- **Email**: Resend
- **Billing**: Stripe
- **Security**: helmet, csrf-csrf, express-rate-limit
- **Logging**: Pino
- **Error Tracking**: @sentry/node
- **Scheduled Tasks**: node-cron
- **Migrations**: node-pg-migrate
- **File Uploads**: multer

## Project Structure

```
arena-pm-tool/
├── api/                         # Vercel serverless entry point
│   └── index.js
├── client/                      # React frontend
│   ├── src/
│   │   ├── components/          # Reusable UI components (28 files)
│   │   ├── contexts/            # React contexts (WorkspaceContext)
│   │   ├── hooks/               # Custom hooks (focus trap, keyboard shortcuts, task actions/filters)
│   │   ├── pages/               # Page components (22 files)
│   │   │   └── UserArea/        # User settings sub-pages (Profile, Preferences, Notifications, My Tasks, Team, Activity, Account)
│   │   ├── store/               # Zustand stores (auth, task, category, workspace, billing, user, holiday)
│   │   ├── types/               # TypeScript type definitions
│   │   ├── utils/               # Helpers (api, analytics, dateUtils, priorityStyles, supabase)
│   │   └── App.js               # Root component with routing
│   ├── tailwind.config.js
│   └── package.json
│
├── server/                      # Node.js backend
│   ├── config/                  # Database config (pg, supabase, schema.sql)
│   ├── controllers/             # Route handlers (10 controllers)
│   │   └── __tests__/           # Controller tests
│   ├── jobs/                    # Background jobs (reminder, email queue, backup, retention)
│   ├── lib/                     # Utilities (logger, AppError, sentry, activityLog, alerts, withErrorHandling)
│   ├── middleware/              # Express middleware (10 files: auth, csrf, rateLimiter, billingGuard, planLimits, validate, schemas, workspaceAuth, auditLog, requestId)
│   │   └── __tests__/           # Middleware tests
│   ├── migrations/              # node-pg-migrate migrations (5 files)
│   ├── routes/                  # API route definitions (10 files)
│   ├── scripts/                 # Database & utility scripts (18 files)
│   ├── templates/email/         # HTML email templates (7 templates)
│   ├── tests/                   # Integration tests
│   ├── uploads/                 # Avatar uploads
│   ├── utils/                   # Email service, queue, templates, reminder service
│   ├── server.js                # Express entry point
│   └── package.json
│
├── supabase/                    # Supabase config & migrations (10 SQL migrations)
├── docs/                        # Deployment & security docs
├── vercel.json                  # Production deployment config
└── package.json                 # Root monorepo scripts
```

## Development Commands

### Root (from `arena-pm-tool/`)
```bash
npm run dev              # Start both client & server concurrently
npm run dev:server       # Start server only (nodemon, port 5001)
npm run dev:client       # Start client only (port 3000)
npm run build            # Build client for production
```

### Frontend (from `arena-pm-tool/client/`)
```bash
npm start                # Dev server on port 3000
npm run build            # Production build
npm test                 # Run tests (Jest + Testing Library)
```

### Backend (from `arena-pm-tool/server/`)
```bash
npm run dev              # Dev server with nodemon
npm start                # Production server
npm test                 # Run tests with coverage (Jest + supertest)
npm run test:watch       # Watch mode

# Database
npm run db:init          # Initialize database schema
npm run db:reset         # Reset database (destructive)
npm run db:backup        # Backup database
npm run db:restore       # Restore database
npm run db:deploy        # Deploy database changes
npm run migrate:up       # Run node-pg-migrate migrations
npm run migrate:down     # Rollback migration
npm run migrate:create   # Create new migration

# Email & Reminders
npm run email:test       # Test email sending
npm run reminders:test   # Test reminder system
npm run reminders:run    # Run reminders once
npm run reminders:schedule  # Start reminder cron
```

### Supabase (from `arena-pm-tool/`)
```bash
npm run supabase:start   # Start local Supabase
npm run supabase:stop    # Stop local Supabase
npm run db:diff          # Generate migration diff
npm run db:push          # Push migrations to remote
npm run db:pull          # Pull remote schema
npm run supabase:gen-types  # Generate TypeScript types
```

## API Endpoints

### Authentication (`/api/auth`)
- `POST /register` - Register (requires ToS acceptance)
- `POST /login` - Login (returns JWT in httpOnly cookies)
- `POST /logout` - Logout (clears cookies)
- `POST /refresh` - Refresh access token
- `GET /me` - Get current user
- `GET /users` - Get workspace users (for assignee dropdown)
- `POST /forgot-password` - Request password reset
- `POST /reset-password` - Reset password with token
- `POST /verify-email` - Verify email
- `POST /resend-verification` - Resend verification email

### Workspaces (`/api/workspaces`)
- `GET /` - List user's workspaces
- `POST /` - Create workspace (plan-limited)
- `GET /:id` - Get workspace
- `PUT /:id` - Update workspace
- `DELETE /:id` - Delete workspace
- `GET /:id/members` - List members
- `GET /users` - Get workspace users
- `PATCH /:id/members/:memberId` - Update member role
- `DELETE /:id/members/:memberId` - Remove member
- `POST /:id/invite` - Invite user (sends email)
- `POST /accept-invite/:token` - Accept invitation
- `GET /invite-info/:token` - Get invite details (public)
- `GET /:id/invitations` - List pending invitations
- `DELETE /:id/invitations/:invitationId` - Cancel invitation
- `GET /:id/activity` - Activity feed
- `GET /:id/audit-log` - Audit log (admin only)
- `GET/POST/PUT/POST /:id/onboarding/*` - Onboarding endpoints

### Tasks (`/api/tasks`)
- `GET /` - List tasks (filters: category_id, assignee_ids, status, priority, search; cursor pagination)
- `GET /:id` - Get task
- `GET /:id/subtasks` - Get subtasks
- `POST /` - Create task (subscription + plan-limit enforced)
- `PUT /:id` - Update task
- `PATCH /:id/position` - Update position (drag & drop)
- `DELETE /:id` - Delete task
- `GET /:taskId/comments` - List comments
- `POST /:taskId/comments` - Create comment

### Categories (`/api/categories`)
- `GET /` - List categories (workspace-scoped, paginated)
- `GET /:id` - Get category
- `POST /` - Create category
- `PUT /:id` - Update category
- `DELETE /:id` - Delete category
- `PATCH /reorder` - Reorder categories

### Comments (`/api/comments`)
- `PUT /:id` - Update comment
- `DELETE /:id` - Delete comment

### User Profile (`/api/me`)
- `GET /` - Get profile
- `PATCH /` - Update profile
- `PATCH /preferences` - Update preferences (language, timezone)
- `PATCH /notifications` - Update notification settings
- `POST /avatar` - Upload avatar (5MB max, jpg/png/webp)
- `DELETE /avatar` - Delete avatar
- `POST /password` - Change password
- `DELETE /account` - Delete account (GDPR)
- `GET /tasks` - My tasks
- `GET /tasks/export` - Export tasks as CSV
- `GET /export` - Full GDPR data export

### Billing (`/api/billing`)
- `GET /plans` - Get available plans (public)
- `GET /subscription` - Get subscription & usage
- `POST /checkout` - Create Stripe checkout session
- `POST /portal` - Create Stripe portal session
- `POST /webhook` - Stripe webhook handler

### Other
- `GET /api/holidays?year=2026` - Lithuanian holidays
- `POST /api/reminders/trigger` - Trigger reminder job (CRON_SECRET)
- `GET /api/reminders/status` - Reminder system health
- `GET /api/admin/stats` - Admin dashboard stats
- `GET /api/health` - Health check (optional `?db=true&queue=true`)
- `GET /api/csrf-token` - Get CSRF token

## Environment Variables

### Server (`server/.env`)
```
# Core
NODE_ENV=development
PORT=5001
ALLOWED_ORIGINS=http://localhost:3000
CLIENT_URL=http://localhost:3000

# Database
DATABASE_URL=postgresql://user:password@localhost:5432/todoria

# Auth
JWT_SECRET=your-secret-key-min-32-chars

# Email (Resend)
RESEND_API_KEY=re_your_key
EMAIL_FROM=noreply@todoria.app
EMAIL_FROM_NAME=Todoria

# Billing (Stripe)
STRIPE_SECRET_KEY=sk_test_...
STRIPE_WEBHOOK_SECRET=whsec_...
STRIPE_PRO_PRICE_ID=price_...

# Scheduled Jobs
CRON_SECRET=your-cron-secret
REMINDER_JOB_ENABLED=true
REMINDER_CRON_SCHEDULE=0 9 * * *
BACKUP_ENABLED=false
RETENTION_ENABLED=true

# Monitoring
SENTRY_DSN=https://...

# External APIs
ABSTRACT_API_KEY=your-key (holidays)
```

### Client (`client/.env`)
```
REACT_APP_API_URL=http://localhost:5001/api
```

## Database Schema

### Core Tables
- **users** — id, email, password, name, first_name, last_name, avatar_url, avatar_color, role, language, timezone, email_verified, tos_accepted_at, deleted_at, created_at
- **workspaces** — id (uuid), name, owner_id, created_at
- **workspace_members** — id, workspace_id, user_id, role (admin/member/viewer), joined_at
- **workspace_invitations** — id, workspace_id, email, role, token, invited_by, expires_at, accepted_at
- **workspace_onboarding_progress** — id, workspace_id, user_id, current_step, steps_completed (jsonb), completed_at

### Task Tables
- **tasks** — id, title, description, category_id, priority (low/medium/high/urgent), status (todo/in_progress/completed), due_date, completed_at, position, parent_task_id, created_by, workspace_id
- **task_assignments** — task_id, user_id (composite PK) — enables multiple assignees
- **categories** — id, name, color, position, created_by, workspace_id
- **comments** — id, task_id, author_id, content, created_at

### Billing Tables
- **plans** — id ('free'/'pro'), name, price_per_seat_cents, max_members, max_tasks_per_workspace, features (jsonb)
- **subscriptions** — id, workspace_id, plan_id, stripe_customer_id, stripe_subscription_id, status, seat_count
- **invoices** — id, workspace_id, stripe_invoice_id, amount_cents, status, pdf_url

### Compliance Tables
- **audit_logs** — id, workspace_id, user_id, action, resource_type, resource_id, details (jsonb), ip_address

## Key Features

1. **Multi-workspace** — Create/switch workspaces, invite members, role-based access (admin/member/viewer)
2. **Task management** — CRUD with subtasks, multiple assignees, priorities, categories, comments
3. **Three views** — Board (drag & drop Kanban), List, Calendar
4. **Activity feed** — Workspace activity log accessible from Settings > Activity tab (`/user/activity`)
5. **Stripe billing** — Free & Pro plans with seat-based pricing, plan limits enforcement
6. **Onboarding** — Guided workspace setup flow for new users
7. **Email system** — Queue-based with templates for verification, invites, reminders, assignments
8. **GDPR compliance** — Data export, account deletion, audit logging, ToS/privacy acceptance tracking
9. **Security** — httpOnly JWT cookies, CSRF protection, rate limiting, Helmet headers, Zod validation
10. **Monitoring** — Sentry error tracking, Pino structured logging, health check endpoint
11. **Background jobs** — Task reminders, email queue processor, database backups, data retention

## UI Design System

- **Primary color**: Indigo scale (`primary-50` #EEF2FF through `primary-900`, main: `primary-600` #4F46E5)
- **Typography**: Inter font (400/500/600/700), loaded via Google Fonts with system stack fallback
- **Layout**: Collapsible sidebar navigation (260px expanded / 64px collapsed) with mobile overlay
- **Surfaces**: White cards with `border-[#E8EBF0]`, `rounded-xl`, layered shadows (`shadow-card`, `shadow-elevated`, `shadow-modal`)
- **Priority colors**: Urgent (red), High (orange), Medium (amber), Low (blue) — used in pill badges and card left borders
- **Animations**: framer-motion for modal open/close (`scale: 0.98→1`), page view crossfades via `AnimatePresence`
- **Navigation**: `/` renders public LandingPage; `/login` for auth; `/dashboard` for main app (sidebar with Board/List/Calendar views)
- **Dark-theme pages**: AcceptInvite, WorkspaceOnboarding, UserArea/* use `bg-neutral-900` containers intentionally

## Code Style

- Functional components with hooks
- Zustand for global state (all stores are workspace-aware)
- HttpOnly cookie auth — no tokens in localStorage; user data sanitized via `sanitizeUserForStorage()` before localStorage (strips email, keeps id/name/role/avatarUrl/emailVerified)
- CSRF token auto-fetched and attached to mutations via Axios interceptor
- `sonner` for all user notifications (`import { toast } from 'sonner'`; use `toast.success()`, `toast.error()`)
- Tailwind CSS utility classes with custom design tokens defined in `tailwind.config.js` (colors, shadows, fonts)
- `withErrorHandling` wrapper for controller error handling on the server
- `AppError` class for operational errors with status codes
- Pino logger (not console.log/console.error) on the server

## Common Patterns

### API Calls (Frontend)
```javascript
// All API functions are in client/src/utils/api.js
import { tasksAPI, categoriesAPI, workspacesAPI } from '../utils/api';

// Stores auto-include workspace_id
const response = await tasksAPI.getAll({ workspace_id: workspaceId, ...filters });
```

### Zustand Store Pattern
```javascript
import { create } from 'zustand';
import useWorkspaceStore from './workspaceStore';

const getWorkspaceId = () => useWorkspaceStore.getState().currentWorkspaceId;

const useStore = create((set, get) => ({
  items: [],
  isLoading: false,
  fetchItems: async () => { /* ... */ },
}));
```

### Protected Routes (Backend)
```javascript
const authMiddleware = require('../middleware/auth');
const { workspaceAuth } = require('../middleware/workspaceAuth');
const { billingGuard } = require('../middleware/billingGuard');

router.post('/', authMiddleware, billingGuard, controller.create);
router.get('/:id/members', authMiddleware, workspaceAuth('admin', 'member'), controller.getMembers);
```

### Custom Hooks
```javascript
// useTaskActions — shared task toggle logic
// useTaskFilters — shared filtering with debounced search
// useKeyboardShortcuts — global keyboard shortcut handler
// useFocusTrap — accessible modal focus management
```

## Testing

### Frontend (Jest + React Testing Library)
- Store tests: `client/src/store/__tests__/` (auth, task, category stores)
- Component tests: `ErrorBoundary.test.js`, `SubtaskList.test.js`
- App routing tests: `App.test.js` (mocks framer-motion, sonner, IntersectionObserver, LandingPage)
- API tests: `client/src/utils/api.test.js`
- 7 test suites, 53 tests total

### Backend (Jest + supertest)
- Controller tests: `server/controllers/__tests__/` (auth, billing, category, comment, task)
- Middleware tests: `server/middleware/__tests__/` (auth, planLimits)
- Config: `server/jest.config.js`

```bash
# Run all tests
cd server && npm test        # Backend with coverage
cd client && npm test        # Frontend
```
