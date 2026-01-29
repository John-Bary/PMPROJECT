# Vercel Deployment Guide - Todorio Monorepo

This guide explains how to deploy the Todorio monorepo to Vercel with the frontend (CRA) served as static files and the backend (Express) running as serverless functions.

## Architecture Overview

```
todorio/
├── api/              # Serverless function entry point
│   └── index.js      # Wraps Express app for Vercel
├── client/           # React (CRA) frontend → Static files
├── server/           # Express backend (business logic)
│   └── server.js     # Express app exported for serverless
└── vercel.json       # Vercel configuration
```

- **Frontend**: Built with Create React App, served as static files
- **Backend**: Express app exported as a serverless function handler
- **Routing**: All `/api/*` requests route to the serverless function; all other requests serve the SPA

## Environment Variables

### Required Server Variables (Set in Vercel Dashboard)

| Variable | Description | Example |
|----------|-------------|---------|
| `DATABASE_URL` | PostgreSQL connection string | `postgresql://user:pass@host:5432/db?sslmode=require` |
| `JWT_SECRET` | Secret key for JWT tokens | `your-strong-random-secret-key` |
| `JWT_EXPIRES_IN` | JWT token expiration | `7d` |
| `NODE_ENV` | Environment mode | `production` (auto-set by Vercel) |
| `ALLOWED_ORIGINS` | CORS allowed origins | `https://your-app.vercel.app` |

### Optional Server Variables

| Variable | Description | Example |
|----------|-------------|---------|
| `DB_SSL` | Enable SSL for database | `true` |
| `TRUST_PROXY` | Trust proxy headers | `true` |
| `SUPABASE_URL` | Supabase project URL | `https://xxx.supabase.co` |
| `SUPABASE_ANON_KEY` | Supabase anon key | `eyJ...` |
| `SUPABASE_SERVICE_ROLE_KEY` | Supabase service role key | `eyJ...` |
| `RESEND_API_KEY` | Resend API key | `re_your_api_key` |
| `EMAIL_FROM` | Sender email address | `noreply@yourapp.com` |
| `EMAIL_FROM_NAME` | Sender display name | `Todorio` |
| `CRON_SECRET` | Secret for cron job authentication | `your-cron-secret` |
| `ABSTRACT_API_KEY` | Holiday API key | `your-api-key` |
| `RATE_LIMIT_WINDOW_MS` | Rate limit window | `900000` |
| `RATE_LIMIT_MAX_REQUESTS` | Max requests per window | `100` |

### Client Variables (Build-time only)

| Variable | Description | When to Set |
|----------|-------------|-------------|
| `REACT_APP_API_URL` | API base URL | **Do NOT set in Vercel** - relative `/api` paths work automatically |
| `REACT_APP_SUPABASE_URL` | Supabase URL (client-side) | Only if using Supabase client-side features |
| `REACT_APP_SUPABASE_ANON_KEY` | Supabase anon key | Only if using Supabase client-side features |

## Deployment Steps

### 1. Connect Repository to Vercel

1. Go to [vercel.com/new](https://vercel.com/new)
2. Import your GitHub repository
3. Select the repository containing `todorio`

### 2. Configure Project Settings

| Setting | Value |
|---------|-------|
| **Root Directory** | `todorio` |
| **Framework Preset** | Other (auto-detected from vercel.json) |
| **Build Command** | Leave empty (uses vercel.json) |
| **Output Directory** | Leave empty (uses vercel.json) |

### 3. Set Environment Variables

1. In Vercel Dashboard, go to **Project Settings → Environment Variables**
2. Add all required server variables (see table above)
3. Set `ALLOWED_ORIGINS` to your Vercel deployment URL(s)

### 4. Deploy

1. Click **Deploy**
2. Vercel will:
   - Install dependencies for both client and server
   - Build the React app to `client/build`
   - Package the Express app as a serverless function
   - Deploy static files and serverless function

### 5. Verify Deployment

After deployment, verify these endpoints:

- **Frontend**: `https://your-app.vercel.app/` → Should load the React app
- **API Health**: `https://your-app.vercel.app/api/health` → Should return JSON:
  ```json
  {
    "status": "OK",
    "message": "Todorio API is running",
    "timestamp": "..."
  }
  ```
- **DB Test**: `https://your-app.vercel.app/api/db-test` → Should confirm database connection

## Local Development

For local development, both services run separately:

```bash
# Terminal 1 - Start backend
cd todorio/server
cp .env.example .env  # Configure local environment
npm install
npm run dev           # Runs on http://localhost:5001

# Terminal 2 - Start frontend
cd todorio/client
cp .env.example .env  # Set REACT_APP_API_URL=http://localhost:5001/api
npm install
npm start             # Runs on http://localhost:3000
```

## Troubleshooting

### API returns 404

- Check that routes start with `/api/`
- Verify `vercel.json` is in the correct location (`todorio/vercel.json`)

### CORS errors

- Ensure `ALLOWED_ORIGINS` includes your Vercel deployment URL
- For multiple origins, use comma-separated values: `https://app1.vercel.app,https://app2.vercel.app`

### Database connection fails

- Verify `DATABASE_URL` is correct
- Ensure database allows connections from Vercel's IP ranges
- Check that SSL mode is enabled if required (`?sslmode=require` in connection string)

### Serverless function timeout

- Default timeout is 30 seconds (configured in vercel.json)
- Optimize slow database queries
- Consider connection pooling services for high traffic

## File Structure Reference

```
todorio/
├── vercel.json              # Vercel deployment configuration
├── api/
│   └── index.js             # Serverless function entry point (imports server/server.js)
├── client/
│   ├── package.json         # CRA dependencies and scripts
│   ├── src/
│   │   └── utils/
│   │       └── api.js       # API client (uses relative /api paths)
│   └── build/               # Production build output (generated)
└── server/
    ├── package.json         # Express dependencies
    ├── server.js            # Express app (exports for serverless)
    ├── config/
    │   └── database.js      # Database connection (serverless-aware)
    └── routes/              # API route handlers
```
