# Database Setup Guide

## Prerequisites

You need PostgreSQL installed on your machine.

### Install PostgreSQL

**macOS (using Homebrew):**
```bash
brew install postgresql@14
brew services start postgresql@14
```

**Linux (Ubuntu/Debian):**
```bash
sudo apt-get update
sudo apt-get install postgresql postgresql-contrib
sudo systemctl start postgresql
```

**Windows:**
Download and install from: https://www.postgresql.org/download/windows/

## Setup Steps

### 1. Verify PostgreSQL is Running

```bash
psql --version
```

### 2. Access PostgreSQL

**macOS/Linux:**
```bash
psql postgres
```

**If you get permission errors, try:**
```bash
sudo -u postgres psql
```

### 3. Create a PostgreSQL User (if needed)

If you don't have a postgres user, create one:

```sql
CREATE USER postgres WITH PASSWORD 'postgres';
ALTER USER postgres WITH SUPERUSER;
```

Exit psql:
```
\q
```

### 4. Update Environment Variables

Make sure your `.env` file has the correct database credentials:

```env
DB_HOST=localhost
DB_PORT=5432
DB_NAME=todorio
DB_USER=postgres
DB_PASSWORD=postgres
```

### 5. Initialize the Database

Run the initialization script:

```bash
cd server
npm run db:init
```

This will:
- Create the `todorio` database
- Create all tables (users, categories, tasks, task_assignments)
- Add demo data (5 users, 4 categories, 5 sample tasks)

### 6. Verify Setup

Check that the database was created successfully:

```bash
psql -U postgres -d todorio -c "SELECT table_name FROM information_schema.tables WHERE table_schema = 'public';"
```

## Database Schema

### Tables

1. **users** - Application users (5 team members)
   - id, email, password, name, avatar_url, role, created_at, updated_at

2. **categories** - Task categories/columns
   - id, name, color, position, created_by, created_at, updated_at

3. **tasks** - Project tasks
   - id, title, description, category_id, assignee_id, priority, status, due_date, completed_at, position, created_by, created_at, updated_at

4. **task_assignments** - Task-user assignments (for multi-assignee)
   - id, task_id, user_id, assigned_at

## Demo Credentials

After initialization, you can log in with these accounts:

**Admin:**
- Email: `admin@todorio.com`
- Password: `password123`

**Team Members:**
- `john@todorio.com` - password123
- `jane@todorio.com` - password123
- `mike@todorio.com` - password123
- `sarah@todorio.com` - password123

## Useful Commands

### Reset Database (WARNING: Deletes all data)
```bash
npm run db:reset
```

### Connect to Database
```bash
psql -U postgres -d todorio
```

### Common SQL Queries

**View all users:**
```sql
SELECT id, email, name, role FROM users;
```

**View all categories:**
```sql
SELECT id, name, color, position FROM categories ORDER BY position;
```

**View all tasks:**
```sql
SELECT t.id, t.title, c.name as category, u.name as assignee, t.priority, t.status
FROM tasks t
LEFT JOIN categories c ON t.category_id = c.id
LEFT JOIN users u ON t.assignee_id = u.id
ORDER BY t.created_at DESC;
```

**Count tasks by status:**
```sql
SELECT status, COUNT(*) FROM tasks GROUP BY status;
```

## Troubleshooting

### "database does not exist"
Run `npm run db:init` from the server directory.

### "password authentication failed"
Check your `.env` file and make sure DB_USER and DB_PASSWORD match your PostgreSQL credentials.

### "FATAL: role does not exist"
Create the postgres user as shown in step 3 above.

### Connection refused
Make sure PostgreSQL is running:
```bash
# macOS
brew services list

# Linux
sudo systemctl status postgresql
```

## Next Steps

After successful setup:
1. Start the server: `npm run dev`
2. Test the database connection: http://localhost:5001/api/db-test
3. Proceed to Step 3: Authentication implementation
