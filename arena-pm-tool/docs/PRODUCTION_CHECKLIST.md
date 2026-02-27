# Production Deployment Checklist

## Pre-Deployment Verification

### 1. Environment Configuration
- [ ] Production `.env` file created with secure values
- [ ] `JWT_SECRET` is a strong, unique random string (64+ chars)
- [ ] Database credentials point to production database
- [ ] `ALLOWED_ORIGINS` contains only production domains
- [ ] Email credentials are configured for production
- [ ] `NODE_ENV=production` is set

### 2. Security Checks
- [ ] All secrets removed from code
- [ ] No hardcoded credentials
- [ ] `.env` files are in `.gitignore`
- [ ] Helmet security headers enabled
- [ ] Rate limiting configured
- [ ] CORS properly restricted

### 3. Database
- [ ] Production database created
- [ ] Schema migrations applied (`npm run db:init`)
- [ ] Database backup script tested (`npm run db:backup`)
- [ ] Backup schedule configured (cron or managed service)
- [ ] Connection pooling configured appropriately

### 4. Build Verification
- [ ] Client builds without errors: `npm run build`
- [ ] No console errors in production build
- [ ] `REACT_APP_API_URL` points to production API
- [ ] Static assets load correctly

### 5. Local Production Test
Run: `./scripts/test-production.sh`

- [ ] Server starts without errors
- [ ] Health check responds: `GET /api/health`
- [ ] Authentication works (login/register)
- [ ] CRUD operations work (tasks, categories)
- [ ] Rate limiting triggers after threshold
- [ ] CORS blocks unauthorized origins

### 6. Performance
- [ ] Database queries use indexes
- [ ] Connection pool size appropriate
- [ ] Large responses are paginated
- [ ] Static files will be served from CDN

### 7. Monitoring (Post-Deploy)
- [ ] Error logging configured
- [ ] Health check endpoint monitored
- [ ] Database backup verification
- [ ] SSL certificate valid

---

## Deployment Steps

1. **Push code to repository**
2. **Configure environment variables on hosting platform**
   - Copy values from `.env.production.example`
   - Generate new `JWT_SECRET` for production
3. **Deploy backend** (Railway/Render/Heroku)
4. **Run database migrations if needed**
5. **Deploy frontend** (Vercel/Netlify)
6. **Verify all endpoints work**
7. **Configure DNS/SSL**
8. **Set up monitoring alerts**

---

## Quick Commands Reference

```bash
# Build client for production
cd client && npm run build

# Start server in production mode
cd server && NODE_ENV=production npm start

# Create database backup
cd server && npm run db:backup

# Restore from backup
cd server && npm run db:restore -- --file=backups/backup.sql

# Test health endpoint
curl http://localhost:5001/api/health

# Check security headers
curl -I http://localhost:5001/api/health
```

---

## Environment Variables Reference

### Server (Required)
| Variable | Description | Example |
|----------|-------------|---------|
| `PORT` | Server port | `5001` |
| `NODE_ENV` | Environment | `production` |
| `DB_HOST` | Database host | `db.example.com` |
| `DB_PORT` | Database port | `5432` |
| `DB_NAME` | Database name | `todoria_prod` |
| `DB_USER` | Database user | `todoria_user` |
| `DB_PASSWORD` | Database password | `strong_password` |
| `JWT_SECRET` | JWT signing key | `64+ char random string` |
| `ALLOWED_ORIGINS` | CORS origins | `https://app.example.com` |

### Server (Optional)
| Variable | Description | Default |
|----------|-------------|---------|
| `JWT_EXPIRES_IN` | Token expiry | `7d` |
| `DB_SSL` | Use SSL for DB | `false` |
| `TRUST_PROXY` | Behind proxy | `false` |
| `RATE_LIMIT_MAX_REQUESTS` | Requests/window | `100` |
| `AUTH_RATE_LIMIT_MAX_REQUESTS` | Auth attempts | `5` |

### Client
| Variable | Description |
|----------|-------------|
| `REACT_APP_API_URL` | Backend API URL |
