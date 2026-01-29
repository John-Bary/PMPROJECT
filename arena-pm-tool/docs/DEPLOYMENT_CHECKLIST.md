# Todorio - Deployment Checklist

Complete guide for publishing to GitHub, connecting Supabase, and deploying on Vercel.

---

## Table of Contents
1. [Prerequisites](#1-prerequisites)
2. [GitHub Repository Setup](#2-github-repository-setup)
3. [Supabase Project Setup](#3-supabase-project-setup)
4. [Vercel Server Deployment](#4-vercel-server-deployment)
5. [Vercel Client Deployment](#5-vercel-client-deployment)
6. [Post-Deployment Verification](#6-post-deployment-verification)
7. [Environment Variables Reference](#7-environment-variables-reference)

---

## 1. Prerequisites

### Tools Required
```bash
# Verify installations
node --version    # v18+ required
npm --version     # v9+ required
git --version     # Any recent version
npx supabase --version  # Install if missing: npm install -g supabase
vercel --version  # Install if missing: npm install -g vercel
```

### Accounts Needed
- [ ] GitHub account (https://github.com)
- [ ] Supabase account (https://supabase.com)
- [ ] Vercel account (https://vercel.com)

---

## 2. GitHub Repository Setup

### Step 2.1: Create GitHub Repository
1. Go to https://github.com/new
2. Repository name: `todorio` (or your preferred name)
3. Set visibility: **Private** (recommended for production apps)
4. Do NOT initialize with README (we have one)
5. Click **Create repository**

### Step 2.2: Push Code to GitHub
```bash
cd /home/user/PMPROJECT/todorio

# Add remote (replace YOUR_USERNAME with your GitHub username)
git remote add origin https://github.com/YOUR_USERNAME/todorio.git

# Verify no secrets are committed
git status
cat .gitignore  # Ensure .env files are ignored

# Push to GitHub
git branch -M main
git push -u origin main
```

### Step 2.3: Verify .gitignore Security
Ensure these patterns exist in `.gitignore`:
```
# Environment files (NEVER commit these)
.env
.env.local
.env.production
.env*.local
*.env

# Supabase local files
supabase/.branches
supabase/.temp
```

**Files**: `/todorio/.gitignore`, `/todorio/client/.gitignore`, `/todorio/server/.gitignore`

---

## 3. Supabase Project Setup

### Step 3.1: Create Supabase Project
1. Go to https://supabase.com/dashboard
2. Click **New Project**
3. Configure:
   - **Organization**: Select or create
   - **Project name**: `todorio`
   - **Database password**: Generate a strong password and **SAVE IT SECURELY**
   - **Region**: Choose closest to your users
   - **Pricing plan**: Free tier works for development
4. Click **Create new project**
5. Wait for project to be provisioned (~2 minutes)

### Step 3.2: Collect Supabase Credentials
Navigate to **Project Settings > API** and note these values:

| Credential | Location | Usage |
|------------|----------|-------|
| `Project URL` | Settings > API | `SUPABASE_URL` env var |
| `anon public` key | Settings > API | `REACT_APP_SUPABASE_ANON_KEY` (client only) |
| `service_role` key | Settings > API | `SUPABASE_SERVICE_ROLE_KEY` (server only, NEVER expose to client) |

Navigate to **Project Settings > Database** for:

| Credential | Location | Usage |
|------------|----------|-------|
| `Connection string` | Settings > Database > Connection string > URI | `DATABASE_URL` env var |

**Connection String Format:**
```
postgresql://postgres.[PROJECT_REF]:[YOUR_PASSWORD]@aws-0-[REGION].pooler.supabase.com:6543/postgres
```

### Step 3.3: Run Database Migrations
```bash
cd /home/user/PMPROJECT/todorio

# Link to your Supabase project (get project ref from dashboard URL)
npx supabase link --project-ref YOUR_PROJECT_REF

# Push migrations to Supabase
npx supabase db push

# Verify migrations applied
npx supabase db diff
```

**What gets created:**
- `users` table with roles (admin/member)
- `categories` table with position ordering
- `tasks` table with priority, status, due dates
- `task_assignments` junction table
- `comments` table
- All RLS policies for secure multi-tenant access
- Helper functions for authorization checks

### Step 3.4: Configure Supabase Authentication (Optional)

If migrating to Supabase Auth later, configure these settings:

**Settings > Authentication > URL Configuration:**
| Setting | Value |
|---------|-------|
| Site URL | `https://your-client.vercel.app` |
| Redirect URLs | `https://your-client.vercel.app/auth/callback` |

**Settings > Authentication > Email Templates:**
- Customize confirmation, recovery, and magic link emails

**Settings > Authentication > Providers:**
- Enable email/password (default)
- Optionally enable OAuth providers (Google, GitHub, etc.)

### Step 3.5: RLS Policies Verification

The migrations create comprehensive Row Level Security. Verify policies are active:

```sql
-- Run in Supabase SQL Editor (Dashboard > SQL Editor)
SELECT schemaname, tablename, policyname, permissive, roles, cmd, qual
FROM pg_policies
WHERE schemaname = 'public'
ORDER BY tablename, policyname;
```

**Expected policies per table:**
| Table | Policies |
|-------|----------|
| users | select_users, update_own_user, delete_users_admin |
| categories | select_categories, insert_categories, update_categories, delete_categories |
| tasks | select_tasks, insert_tasks, update_tasks, delete_tasks |
| task_assignments | select_task_assignments, insert_task_assignments, delete_task_assignments |
| comments | select_comments, insert_comments, update_comments, delete_comments |

### Step 3.6: Enable RLS on All Tables

```sql
-- Run in Supabase SQL Editor to ensure RLS is enforced
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE tasks ENABLE ROW LEVEL SECURITY;
ALTER TABLE task_assignments ENABLE ROW LEVEL SECURITY;
ALTER TABLE comments ENABLE ROW LEVEL SECURITY;

-- Force RLS even for table owners (extra security)
ALTER TABLE users FORCE ROW LEVEL SECURITY;
ALTER TABLE categories FORCE ROW LEVEL SECURITY;
ALTER TABLE tasks FORCE ROW LEVEL SECURITY;
ALTER TABLE task_assignments FORCE ROW LEVEL SECURITY;
ALTER TABLE comments FORCE ROW LEVEL SECURITY;
```

---

## 4. Vercel Server Deployment

### Step 4.1: Generate Secrets
```bash
# Generate JWT_SECRET (64 random bytes, base64 encoded)
openssl rand -base64 64 | tr -d '\n'

# Generate CRON_SECRET (32 random bytes, base64 encoded)
openssl rand -base64 32 | tr -d '\n'
```

**Save these values securely - you'll need them for Vercel.**

### Step 4.2: Deploy Server to Vercel
```bash
cd /home/user/PMPROJECT/todorio/server

# Login to Vercel (if not already)
vercel login

# Deploy (follow prompts)
vercel

# Answer prompts:
# - Set up and deploy? Y
# - Which scope? [Select your account]
# - Link to existing project? N
# - Project name? todorio-api
# - Directory? ./
# - Override settings? N
```

### Step 4.3: Configure Server Environment Variables

Go to Vercel Dashboard > Your Server Project > Settings > Environment Variables

Add these variables for **Production** (and optionally Preview):

| Variable | Value | Notes |
|----------|-------|-------|
| `NODE_ENV` | `production` | Required |
| `DATABASE_URL` | `postgresql://postgres.[ref]:[pass]@...` | From Supabase Step 3.2 |
| `JWT_SECRET` | `[your generated secret]` | From Step 4.1 |
| `JWT_EXPIRES_IN` | `7d` | Token expiration |
| `ALLOWED_ORIGINS` | `https://your-client.vercel.app` | Client URL (add after client deploy) |
| `CRON_SECRET` | `[your generated secret]` | From Step 4.1 |
| `RESEND_API_KEY` | `re_your_api_key` | For email reminders (optional) |
| `EMAIL_FROM` | `noreply@yourdomain.com` | Sender email address |
| `EMAIL_FROM_NAME` | `Todorio` | Sender display name |

### Step 4.4: Configure Vercel Cron Job

The cron job is defined in `server/vercel.json`:
```json
{
  "crons": [{
    "path": "/api/reminders/trigger",
    "schedule": "0 9 * * *"
  }]
}
```

**Secure the cron endpoint:**
1. Go to Vercel Dashboard > Settings > Environment Variables
2. Ensure `CRON_SECRET` is set
3. Vercel automatically sends this in `Authorization` header

### Step 4.5: Deploy to Production
```bash
cd /home/user/PMPROJECT/todorio/server

# Deploy to production
vercel --prod

# Note the production URL (e.g., https://todorio-api.vercel.app)
```

**Save the server URL** - you'll need it for the client configuration.

### Step 4.6: Verify Server Deployment
```bash
# Test health endpoint
curl https://your-server.vercel.app/api/health

# Expected response: {"status":"ok","timestamp":"..."}
```

---

## 5. Vercel Client Deployment

### Step 5.1: Deploy Client to Vercel
```bash
cd /home/user/PMPROJECT/todorio/client

# Deploy (follow prompts)
vercel

# Answer prompts:
# - Set up and deploy? Y
# - Which scope? [Select your account]
# - Link to existing project? N
# - Project name? todorio
# - Directory? ./
# - Override settings? N (vercel.json handles it)
```

### Step 5.2: Configure Client Environment Variables

Go to Vercel Dashboard > Your Client Project > Settings > Environment Variables

Add these variables for **Production** (and optionally Preview):

| Variable | Value | Notes |
|----------|-------|-------|
| `REACT_APP_API_URL` | `https://your-server.vercel.app/api` | Server URL from Step 4.5 |
| `REACT_APP_SUPABASE_URL` | `https://[ref].supabase.co` | From Supabase Step 3.2 |
| `REACT_APP_SUPABASE_ANON_KEY` | `eyJ...` | Public anon key (safe for client) |

### Step 5.3: Configure Build Settings

Verify in Vercel Dashboard > Your Client Project > Settings > General:

| Setting | Value |
|---------|-------|
| Framework Preset | Create React App |
| Build Command | `npm run build` |
| Output Directory | `build` |
| Install Command | `npm install` |

### Step 5.4: Deploy to Production
```bash
cd /home/user/PMPROJECT/todorio/client

# Deploy to production
vercel --prod

# Note the production URL (e.g., https://todorio.vercel.app)
```

### Step 5.5: Update Server CORS

Go back to Server project and update `ALLOWED_ORIGINS`:

Vercel Dashboard > Server Project > Settings > Environment Variables

| Variable | New Value |
|----------|-----------|
| `ALLOWED_ORIGINS` | `https://todorio.vercel.app,https://todorio-git-main-yourname.vercel.app` |

Include both production and preview URLs if needed.

**Redeploy server to apply:**
```bash
cd /home/user/PMPROJECT/todorio/server
vercel --prod
```

---

## 6. Post-Deployment Verification

### Step 6.1: Test Core Functionality

```bash
# 1. Health check
curl https://your-server.vercel.app/api/health

# 2. Test registration
curl -X POST https://your-server.vercel.app/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{"email":"test@example.com","password":"SecurePass123!","name":"Test User"}'

# 3. Test login
curl -X POST https://your-server.vercel.app/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"test@example.com","password":"SecurePass123!"}'
```

### Step 6.2: Browser Testing Checklist

Navigate to `https://your-client.vercel.app` and verify:

- [ ] Registration page loads
- [ ] Can create new account
- [ ] Can login with created account
- [ ] Dashboard loads after login
- [ ] Can create categories
- [ ] Can create tasks
- [ ] Drag and drop works
- [ ] Calendar view works
- [ ] Logout works

### Step 6.3: Security Verification

```bash
# Verify no sensitive headers exposed
curl -I https://your-server.vercel.app/api/health | grep -i "x-powered-by"
# Should return nothing (header removed)

# Verify CORS blocks unauthorized origins
curl -X OPTIONS https://your-server.vercel.app/api/health \
  -H "Origin: https://malicious-site.com" \
  -H "Access-Control-Request-Method: GET" -v
# Should NOT include Access-Control-Allow-Origin for malicious-site.com
```

### Step 6.4: Monitor Deployment

**Vercel Dashboard:**
- Check Functions tab for API logs
- Check Analytics for performance metrics
- Set up alerts for errors

**Supabase Dashboard:**
- Check Database > Logs for query performance
- Check Auth > Users for registered users
- Set up database alerts

---

## 7. Environment Variables Reference

### Server Environment Variables (Vercel)

| Variable | Required | Secret? | Description |
|----------|----------|---------|-------------|
| `NODE_ENV` | Yes | No | `production` |
| `DATABASE_URL` | Yes | **YES** | PostgreSQL connection string |
| `JWT_SECRET` | Yes | **YES** | 64+ character random string |
| `JWT_EXPIRES_IN` | No | No | Token expiry (default: `7d`) |
| `ALLOWED_ORIGINS` | Yes | No | Comma-separated allowed CORS origins |
| `CRON_SECRET` | Yes | **YES** | Vercel cron job authentication |
| `RESEND_API_KEY` | No | **YES** | Resend API key for email |
| `EMAIL_FROM` | No | No | Sender email address |
| `EMAIL_FROM_NAME` | No | No | Sender display name |

### Client Environment Variables (Vercel)

| Variable | Required | Secret? | Description |
|----------|----------|---------|-------------|
| `REACT_APP_API_URL` | Yes | No | Server API base URL |
| `REACT_APP_SUPABASE_URL` | No | No | Supabase project URL |
| `REACT_APP_SUPABASE_ANON_KEY` | No | No | Supabase public anon key (safe for client) |

### Supabase Credentials (DO NOT EXPOSE)

| Credential | Where to Use | NEVER Expose To |
|------------|--------------|-----------------|
| `service_role` key | Server-side only (if using Supabase client) | Client, Git, Logs |
| Database password | `DATABASE_URL` on server | Client, Git, Logs |

---

## Quick Reference Commands

```bash
# --- Supabase ---
npx supabase link --project-ref YOUR_REF    # Link local to remote
npx supabase db push                         # Push migrations
npx supabase db diff                         # Show schema differences
npx supabase db reset                        # Reset local database

# --- Vercel ---
vercel                    # Deploy to preview
vercel --prod             # Deploy to production
vercel env pull           # Pull env vars to local .env
vercel logs               # View deployment logs
vercel domains            # Manage custom domains

# --- Git ---
git push origin main      # Push to GitHub
git pull origin main      # Pull latest changes
```

---

## Troubleshooting

### Database Connection Errors
- Verify `DATABASE_URL` format includes `?sslmode=require` for Supabase
- Check Supabase dashboard for connection limits
- Ensure password doesn't have special characters that need URL encoding

### CORS Errors
- Verify `ALLOWED_ORIGINS` includes exact client URL (no trailing slash)
- Include both `https://` and preview URLs
- Redeploy server after changing CORS settings

### Authentication Failures
- Verify `JWT_SECRET` is identical on server
- Check token expiration in browser dev tools
- Clear cookies and local storage, try again

### Cron Job Not Running
- Verify `CRON_SECRET` is set in Vercel
- Check Vercel Functions logs for cron execution
- Cron jobs only run on production deployments

---

## Security Checklist

- [ ] No `.env` files committed to Git
- [ ] `service_role` key NEVER used in client code
- [ ] `JWT_SECRET` is 64+ random characters
- [ ] `DATABASE_URL` uses SSL (`?sslmode=require`)
- [ ] `ALLOWED_ORIGINS` is restrictive (not `*`)
- [ ] RLS policies are active on all tables
- [ ] HTTPS enforced on all endpoints
- [ ] Rate limiting configured on auth endpoints
- [ ] No sensitive data in error messages

---

*Last updated: January 2026*
