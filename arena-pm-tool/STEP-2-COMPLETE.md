# Step 2: Database Schema & Setup - COMPLETE ✅

## What We Built

Created a complete PostgreSQL database schema with tables, indexes, triggers, and initialization scripts for the Arena PM Tool.

## Files Created

### Database Configuration
**File: `server/config/database.js`**
- PostgreSQL connection pool setup
- Query helper functions
- Error handling and logging
- Connection monitoring

**File: `server/config/schema.sql`**
- Complete database schema with 4 tables
- Indexes for performance optimization
- Triggers for auto-updating timestamps
- Demo data (5 users, 4 categories, 5 tasks)

### Database Scripts
**File: `server/scripts/initDatabase.js`**
- Creates database if it doesn't exist
- Runs schema SQL
- Verifies table creation
- Shows demo credentials

**File: `server/scripts/resetDatabase.js`**
- Drops and recreates all tables
- Resets to initial state with demo data
- WARNING: Deletes all data

### Documentation
**File: `DATABASE-SETUP.md`**
- PostgreSQL installation instructions
- Step-by-step setup guide
- Demo credentials
- Troubleshooting tips
- Useful SQL queries

### Updated Files
**File: `server/package.json`**
- Added `db:init` script
- Added `db:reset` script

**File: `server/server.js`**
- Import database pool
- New endpoint: `/api/db-test` to verify database connection

## Database Schema

### Tables Created

1. **users** (5 demo users)
   - Stores team member information
   - Fields: id, email, password (hashed), name, avatar_url, role
   - Roles: 'admin' or 'member'

2. **categories** (4 default categories)
   - Task groupings/columns
   - Fields: id, name, color (hex), position
   - Default: To Do, In Progress, Review, Completed

3. **tasks** (5 demo tasks)
   - Main task data
   - Fields: id, title, description, category_id, assignee_id, priority, status, due_date, position
   - Priority levels: low, medium, high, urgent
   - Status: todo, in_progress, completed

4. **task_assignments** (for future multi-assignee)
   - Many-to-many relationship
   - Fields: id, task_id, user_id, assigned_at

### Features
- ✅ Foreign key constraints
- ✅ Cascading deletes
- ✅ Indexes on frequently queried columns
- ✅ Auto-updating timestamps (updated_at)
- ✅ Position fields for drag & drop ordering

## Demo Data

### Users (All passwords: `password123`)
- admin@arena.com (Admin)
- john@arena.com (Member)
- jane@arena.com (Member)
- mike@arena.com (Member)
- sarah@arena.com (Member)

### Categories
- To Do (#3B82F6 - Blue)
- In Progress (#F59E0B - Orange)
- Review (#8B5CF6 - Purple)
- Completed (#10B981 - Green)

### Sample Tasks
- 5 demo tasks with various priorities and due dates

## NPM Scripts

```bash
# Initialize database (create DB and tables)
npm run db:init

# Reset database (WARNING: deletes all data)
npm run db:reset
```

## API Endpoints

### New Endpoint
**GET /api/db-test**
- Tests database connection
- Returns PostgreSQL version and current time
- Use to verify database is connected

## File Paths Reference

```
server/
├── config/
│   ├── database.js          # Database connection pool
│   └── schema.sql           # SQL schema with demo data
├── scripts/
│   ├── initDatabase.js      # Initialize DB script
│   └── resetDatabase.js     # Reset DB script
├── server.js                # Updated with DB import and test endpoint
└── package.json             # Added db:init and db:reset scripts
```

## Testing Instructions

### Before Testing: Install PostgreSQL

You need PostgreSQL installed on your system:

**macOS:**
```bash
brew install postgresql@14
brew services start postgresql@14
```

**Linux:**
```bash
sudo apt-get install postgresql postgresql-contrib
sudo systemctl start postgresql
```

### Step-by-Step Testing

1. **Install PostgreSQL** (see above)

2. **Initialize the database:**
```bash
cd server
npm run db:init
```

Expected output:
```
🔧 Starting database initialization...
1️⃣ Creating database if not exists...
   ✅ Database 'arena_pm_tool' created
2️⃣ Running schema SQL...
   ✅ Schema created successfully
3️⃣ Verifying tables...
   ✅ Tables created:
      - categories
      - task_assignments
      - tasks
      - users
4️⃣ Checking demo data...
   ✅ Users: 5
   ✅ Categories: 4
   ✅ Tasks: 5
✨ Database initialization completed successfully!
```

3. **Test database connection:**

Start the server (if not already running):
```bash
npm run dev
```

Test the endpoint:
```bash
curl http://localhost:5001/api/db-test
```

Expected response:
```json
{
  "status": "OK",
  "message": "Database connection successful",
  "data": {
    "current_time": "2026-01-20T...",
    "postgres_version": "PostgreSQL 14.x..."
  }
}
```

4. **Verify in PostgreSQL:**
```bash
psql -U postgres -d arena_pm_tool
```

Then run:
```sql
SELECT email, name, role FROM users;
```

## Important Notes

- PostgreSQL must be installed and running
- Default credentials: user=`postgres`, password=`postgres`
- Update `.env` if your PostgreSQL credentials are different
- The `db:init` script is safe to run multiple times (checks if DB exists)
- The `db:reset` script will DELETE ALL DATA

## Next Steps

After successful database setup:

**Ready for Step 3: Authentication Implementation**
- User registration endpoint
- Login endpoint with JWT
- Password hashing with bcrypt
- JWT middleware for protected routes
- Cookie-based authentication

## Troubleshooting

**"PostgreSQL not installed"**
- Follow installation instructions in DATABASE-SETUP.md

**"Connection refused"**
- Make sure PostgreSQL service is running
- macOS: `brew services start postgresql@14`
- Linux: `sudo systemctl start postgresql`

**"Password authentication failed"**
- Update `.env` with correct PostgreSQL credentials
- Default is user=postgres, password=postgres

**"Database already exists"**
- This is fine! The script will skip creation and just run the schema
- To start fresh, use `npm run db:reset`
