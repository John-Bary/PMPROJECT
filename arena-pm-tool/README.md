# Todorio - Simple To Do App

A simple to do app built with React, Node.js, and PostgreSQL.

## Features

- User authentication (5 team members)
- Task list with inline editing
- Drag & drop task reordering
- Calendar view
- Category management
- Email reminders
- Search and filters

## Tech Stack

**Frontend:**
- React
- Tailwind CSS
- React Router DOM
- @hello-pangea/dnd (drag & drop)
- react-day-picker (calendar)
- Zustand (state management)
- Axios (HTTP client)

**Backend:**
- Node.js + Express
- PostgreSQL
- JWT Authentication
- Resend (email reminders)
- Node-cron (scheduled tasks)

## Project Structure

```
todorio/
├── client/                 # React frontend
│   ├── src/
│   │   ├── components/    # Reusable components
│   │   ├── pages/         # Page components
│   │   ├── store/         # Zustand state management
│   │   ├── utils/         # Helper functions
│   │   └── App.js
│   └── package.json
│
├── server/                 # Node.js backend
│   ├── config/            # Database config & schema
│   ├── controllers/       # Route controllers
│   ├── middleware/        # Custom middleware
│   ├── routes/            # API routes
│   ├── scripts/           # Database scripts
│   ├── server.js          # Entry point
│   └── package.json
│
├── supabase/              # Supabase migrations
│   ├── migrations/        # SQL migration files
│   └── config.toml        # Supabase CLI config
│
├── package.json           # Root package with db scripts
└── README.md
```

## Getting Started

### Prerequisites

- Node.js (v14 or higher)
- PostgreSQL (v12 or higher)
- npm or yarn

### Installation

1. Clone the repository
2. Install dependencies:

```bash
# Install server dependencies
cd server
npm install

# Install client dependencies
cd ../client
npm install
```

3. Set up environment variables:
   - Copy `server/.env.example` to `server/.env`
   - Update the values with your configuration

4. Set up the database:
   - Create a PostgreSQL database named `todorio`
   - Run migrations (see [Database Migrations](#database-migrations) below)

### Running the Application

**Backend:**
```bash
cd server
npm run dev
```
Server will run on http://localhost:5001

**Frontend:**
```bash
cd client
npm start
```
React app will run on http://localhost:3000

## Database Migrations

This project uses [Supabase CLI](https://supabase.com/docs/guides/cli) for database migrations, providing a robust workflow for schema changes.

### Prerequisites

Install the Supabase CLI and project dependencies:

```bash
# Install root dependencies (includes Supabase CLI)
npm install

# Or install Supabase CLI globally
npm install -g supabase
```

### Migration Commands

Run these commands from the project root (`todorio/`):

| Command | Description |
|---------|-------------|
| `npm run db:diff -- <name>` | Generate a new migration by diffing local vs remote schema |
| `npm run db:push` | Push all pending migrations to the remote database |
| `npm run db:pull` | Pull remote schema changes into local migrations |
| `npm run db:migrate` | Apply pending migrations locally |
| `npm run db:status` | List all migrations and their status |
| `npm run db:migrate:new -- <name>` | Create a new empty migration file |

From the server directory (`todorio/server/`):

| Command | Description |
|---------|-------------|
| `npm run db:init` | Initialize database with full schema |
| `npm run db:reset` | Reset database (destructive) |
| `npm run db:backup` | Create a database backup |
| `npm run db:restore` | Restore from backup |

### Setting Up Supabase

#### Option 1: Using Supabase Cloud

1. Create a project at [supabase.com](https://supabase.com)

2. Link your local project:
   ```bash
   npx supabase link --project-ref <your-project-ref>
   ```

3. Push the initial migration:
   ```bash
   npm run db:push
   ```

4. Update your `.env` with Supabase credentials:
   ```
   SUPABASE_URL=https://your-project.supabase.co
   SUPABASE_ANON_KEY=your-anon-key
   SUPABASE_SERVICE_ROLE_KEY=your-service-role-key
   ```

#### Option 2: Local Development with Supabase

1. Start local Supabase:
   ```bash
   npm run supabase:start
   ```

2. Apply migrations:
   ```bash
   npm run db:migrate
   ```

3. Check status:
   ```bash
   npm run supabase:status
   ```

### Creating New Migrations

When making schema changes:

1. **Auto-generate from changes** (recommended):
   ```bash
   # Make changes to your local database
   # Then generate a migration capturing those changes
   npm run db:diff -- add_new_feature
   ```

2. **Create empty migration** (manual SQL):
   ```bash
   npm run db:migrate:new -- add_new_feature
   # Edit the file in supabase/migrations/
   ```

3. **Push to remote**:
   ```bash
   npm run db:push
   ```

### Migration File Structure

Migrations are stored in `supabase/migrations/` with timestamped filenames:

```
supabase/migrations/
├── 20240101000000_initial_schema.sql    # Initial tables
└── 20240215120000_add_new_feature.sql   # Future migrations
```

### TypeScript Types Generation

Generate TypeScript types from your database schema:

```bash
npm run supabase:gen-types
```

This creates `client/src/types/database.types.ts` with full type definitions.

### Best Practices

1. **Never edit applied migrations** - Create new migrations for changes
2. **Test migrations locally** before pushing to production
3. **Use descriptive names** - `add_user_preferences` not `update_1`
4. **Include rollback logic** when possible (use `DROP IF EXISTS`)
5. **Review generated diffs** before committing

## Deploying to Vercel

This is a monorepo with separate frontend and backend. Deploy them as **two separate Vercel projects**.

### Step 1: Deploy the Server (API)

1. Create a new Vercel project
2. Set the **Root Directory** to `todorio/server`
3. Vercel will auto-detect the Node.js configuration from `vercel.json`
4. Add these **Environment Variables**:

   | Variable | Value |
   |----------|-------|
   | `DATABASE_URL` | Your PostgreSQL connection string (or use Supabase) |
   | `JWT_SECRET` | A strong random secret |
   | `ALLOWED_ORIGINS` | Your client's Vercel URL (after deploying client) |
   | `CRON_SECRET` | A random string for cron job verification |
   | `NODE_ENV` | `production` |
   | `TRUST_PROXY` | `true` |

5. Deploy and note the URL (e.g., `https://todorio-api.vercel.app`)

### Step 2: Deploy the Client (Frontend)

1. Create another Vercel project
2. Set the **Root Directory** to `todorio/client`
3. Vercel will auto-detect Create React App
4. Add these **Environment Variables**:

   | Variable | Value |
   |----------|-------|
   | `REACT_APP_API_URL` | `https://your-server-url.vercel.app/api` |

5. Deploy

### Step 3: Update CORS

After both are deployed:
1. Go to your **server** project settings
2. Update `ALLOWED_ORIGINS` to include your client URL (e.g., `https://todorio.vercel.app`)
3. Redeploy the server

### Database Options

- **Supabase** (recommended): Free tier available, use `DATABASE_URL` from Supabase dashboard
- **Vercel Postgres**: Available in Vercel dashboard
- **Other PostgreSQL**: Any PostgreSQL provider (Railway, Neon, etc.)

### Cron Jobs

The server includes a Vercel Cron job for daily email reminders (9 AM UTC). This is configured in `server/vercel.json`. Ensure `CRON_SECRET` is set for security.

## Development Progress

- [x] Step 1: Project initialization
- [x] Step 2: Database schema
- [x] Step 3: Authentication
- [x] Step 4: Task management
- [x] Step 5: Categories & UI
- [x] Step 6: Supabase migrations setup

## License

MIT
