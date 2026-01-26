# Database Deployment Guide

This guide covers deploying the Arena PM Tool database to various production platforms.

## Quick Start

1. Create a PostgreSQL database on your chosen platform
2. Get the connection credentials
3. Update your `.env` file with production credentials
4. Run `npm run db:deploy`

---

## Platform-Specific Instructions

### Option 1: Supabase (Recommended - Free Tier Available)

1. **Create Project**
   - Go to [supabase.com](https://supabase.com)
   - Create new project
   - Wait for database to provision (~2 minutes)

2. **Get Connection Details**
   - Go to Project Settings → Database
   - Copy the connection string or individual values:
     - Host: `db.[project-ref].supabase.co`
     - Port: `5432`
     - Database: `postgres`
     - User: `postgres`
     - Password: (your project password)

3. **Configure Environment**
   ```bash
   # Option A: Individual variables
   DB_HOST=db.xxxxx.supabase.co
   DB_PORT=5432
   DB_NAME=postgres
   DB_USER=postgres
   DB_PASSWORD=your-password
   DB_SSL=true

   # Option B: Connection string
   DATABASE_URL=postgresql://postgres:your-password@db.xxxxx.supabase.co:5432/postgres
   ```

4. **Deploy**
   ```bash
   npm run db:deploy
   ```

---

### Option 2: Railway

1. **Create Database**
   - Go to [railway.app](https://railway.app)
   - New Project → Add PostgreSQL
   - Click on PostgreSQL service

2. **Get Connection Details**
   - Go to Variables tab
   - Copy `DATABASE_URL`

3. **Configure Environment**
   ```bash
   DATABASE_URL=postgresql://postgres:xxxx@containers-xxx.railway.app:5432/railway
   ```

4. **Deploy**
   ```bash
   npm run db:deploy
   ```

---

### Option 3: Render

1. **Create Database**
   - Go to [render.com](https://render.com)
   - New → PostgreSQL
   - Select free tier or paid plan

2. **Get Connection Details**
   - Copy the Internal/External Database URL

3. **Configure Environment**
   ```bash
   DATABASE_URL=postgresql://user:pass@xxx.render.com:5432/dbname
   DB_SSL=true
   ```

---

### Option 4: Neon (Serverless PostgreSQL)

1. **Create Project**
   - Go to [neon.tech](https://neon.tech)
   - Create new project

2. **Get Connection String**
   - Dashboard → Connection Details
   - Copy the connection string

3. **Configure Environment**
   ```bash
   DATABASE_URL=postgresql://user:pass@xxx.neon.tech/neondb?sslmode=require
   ```

---

### Option 5: AWS RDS

1. **Create Instance**
   - AWS Console → RDS → Create Database
   - Choose PostgreSQL
   - Configure instance size and security groups

2. **Configure Security Group**
   - Allow inbound PostgreSQL (5432) from your IP/server

3. **Configure Environment**
   ```bash
   DB_HOST=your-instance.xxxx.region.rds.amazonaws.com
   DB_PORT=5432
   DB_NAME=arena_pm
   DB_USER=postgres
   DB_PASSWORD=your-password
   DB_SSL=true
   ```

---

## Deployment Commands

```bash
# Deploy to production database (interactive)
npm run db:deploy

# Deploy without confirmation (CI/CD)
npm run db:deploy -- --force

# Test connection only
npm run db:test

# Create backup before deploying
npm run db:backup
npm run db:deploy
```

---

## Connection Testing

Test your connection before deploying:

```bash
# Using psql (if installed)
psql "postgresql://user:pass@host:5432/dbname?sslmode=require"

# Using the app's test endpoint
curl http://localhost:5001/api/db-test
```

---

## Seeded Data

After deployment, you'll have:

### Users (5 accounts)
| Email | Name | Role | Password |
|-------|------|------|----------|
| haroldas@360arena.com | Haroldas Savickas | admin | password123 |
| gediminas@360arena.com | Gediminas Paulauskas | member | password123 |
| laurita@360arena.com | Laurita Trainyte | member | password123 |
| elvina@360arena.com | Elvina Radzevičiūtė | member | password123 |
| jonas@360arena.com | Jonas Barysas | admin | password123 |

### Categories (4)
- To Do
- In Progress
- Review
- Completed

### Demo Tasks (5)
Sample tasks assigned to various users.

---

## Troubleshooting

### Connection Refused
- Check host/port are correct
- Verify database server is running
- Check firewall/security group settings

### SSL Required
- Set `DB_SSL=true` in environment
- Most managed databases require SSL

### Authentication Failed
- Verify username and password
- Check if user has access to the database

### Permission Denied
- Ensure user has CREATE/DROP privileges
- For managed databases, use the admin user

---

## Post-Deployment Checklist

- [ ] Test login with seeded user
- [ ] Verify all tables exist
- [ ] Test creating a new task
- [ ] Set up automated backups
- [ ] Change default passwords for production users
