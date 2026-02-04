# Todoria - API Documentation

Base URL: `http://localhost:5001/api`

## Authentication

All protected endpoints require authentication via:
- **Cookie**: `token` (set automatically on login)
- **Header**: `Authorization: Bearer <token>`

---

## Endpoints

### Health & Status

#### GET /health
Check if API is running.

**Response:**
```json
{
  "status": "OK",
  "message": "Todoria API is running",
  "timestamp": "2026-01-20T..."
}
```

#### GET /db-test
Test database connection.

**Response:**
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

---

## Authentication Endpoints

### POST /auth/register
Register a new user (max 5 users).

**Request Body:**
```json
{
  "email": "user@todorio.com",
  "password": "password123",
  "name": "User Name"
}
```

**Validation:**
- Email must be valid format
- Password minimum 6 characters
- All fields required
- Max 5 users total

**Success (201):**
```json
{
  "status": "success",
  "message": "User registered successfully",
  "data": {
    "user": {
      "id": 6,
      "email": "user@todorio.com",
      "name": "User Name",
      "role": "member",
      "createdAt": "2026-01-20T..."
    },
    "token": "eyJhbGci..."
  }
}
```

**Errors:**
- `400` Missing fields
- `400` Invalid email format
- `400` Password too short
- `400` Email already exists
- `400` Max 5 users reached

---

### POST /auth/login
Login with email and password.

**Request Body:**
```json
{
  "email": "admin@todorio.com",
  "password": "password123"
}
```

**Success (200):**
```json
{
  "status": "success",
  "message": "Login successful",
  "data": {
    "user": {
      "id": 1,
      "email": "admin@todorio.com",
      "name": "Admin User",
      "role": "admin",
      "avatarUrl": null
    },
    "token": "eyJhbGci..."
  }
}
```

**Sets Cookie:** `token` (HTTP-only, 7 days)

**Errors:**
- `400` Missing email or password
- `401` Invalid credentials

---

### POST /auth/logout 🔒
Logout current user.

**Headers:** Authentication required

**Success (200):**
```json
{
  "status": "success",
  "message": "Logged out successfully"
}
```

**Clears Cookie:** `token`

---

### GET /auth/me 🔒
Get current user's profile.

**Headers:** Authentication required

**Success (200):**
```json
{
  "status": "success",
  "data": {
    "user": {
      "id": 1,
      "email": "admin@todorio.com",
      "name": "Admin User",
      "role": "admin",
      "avatarUrl": null,
      "createdAt": "2026-01-20T..."
    }
  }
}
```

**Errors:**
- `401` Not authenticated
- `404` User not found

---

### GET /auth/users 🔒
Get all team members.

**Headers:** Authentication required

**Success (200):**
```json
{
  "status": "success",
  "data": {
    "users": [
      {
        "id": 1,
        "email": "admin@todorio.com",
        "name": "Admin User",
        "role": "admin",
        "avatarUrl": null,
        "createdAt": "2026-01-20T..."
      },
      ...
    ]
  }
}
```

---

## Error Responses

All errors follow this format:

```json
{
  "status": "error",
  "message": "Error description",
  "error": "Detailed error (in development)"
}
```

### Common Error Codes
- `400` Bad Request - Invalid input
- `401` Unauthorized - Authentication required/failed
- `403` Forbidden - Insufficient permissions
- `404` Not Found - Resource doesn't exist
- `500` Internal Server Error

---

## Authentication Methods

### 1. Cookie-based (Recommended for web apps)
```bash
# Login (cookie set automatically)
curl -X POST http://localhost:5001/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"admin@todorio.com","password":"password123"}' \
  -c cookies.txt

# Use cookie for authenticated requests
curl -X GET http://localhost:5001/api/auth/me \
  -b cookies.txt
```

### 2. Bearer Token (For mobile/API clients)
```bash
# Get token from login response
curl -X POST http://localhost:5001/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"admin@todorio.com","password":"password123"}'

# Use token in Authorization header
curl -X GET http://localhost:5001/api/auth/me \
  -H "Authorization: Bearer eyJhbGci..."
```

---

## Rate Limiting
Currently no rate limiting (to be added in future).

## CORS
- Allowed origin: `http://localhost:3000`
- Credentials: Enabled

---

## Demo Accounts

All passwords: `password123`

| Email | Name | Role |
|-------|------|------|
| admin@todorio.com | Admin User | admin |
| john@todorio.com | John Doe | member |
| jane@todorio.com | Jane Smith | member |
| mike@todorio.com | Mike Johnson | member |
| sarah@todorio.com | Sarah Williams | member |

---

## Coming Soon

### Tasks API (Step 4)
- `GET /api/tasks` - List all tasks
- `POST /api/tasks` - Create task
- `PUT /api/tasks/:id` - Update task
- `DELETE /api/tasks/:id` - Delete task
- `PATCH /api/tasks/:id/position` - Reorder task

### Categories API (Step 5)
- `GET /api/categories` - List categories
- `POST /api/categories` - Create category
- `PUT /api/categories/:id` - Update category
- `DELETE /api/categories/:id` - Delete category

---

**Last Updated:** Step 3 Complete
**API Version:** 1.0
**Server:** Node.js + Express + PostgreSQL
