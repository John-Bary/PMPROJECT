# Supabase RLS Security Analysis

## Overview

This document analyzes the Arena PM Tool's database access patterns and provides Row Level Security (RLS) policy recommendations.

---

## 1. Tables and Access Patterns

### Users Table

| Operation | Access Pattern | Rationale |
|-----------|----------------|-----------|
| SELECT | All authenticated users | Team members need to see each other (assignees, creators) |
| INSERT | Service role only | User registration handled by backend with password hashing |
| UPDATE | Own profile only | Users can only modify their own profile |
| DELETE | Admin only | Prevent accidental deletion; admin oversight required |

**Columns of concern:**
- `password`: Never exposed via SELECT in controllers (good)
- `email`: Visible to team members (acceptable for collaboration)
- `role`: Should not be self-modifiable (enforced by RLS WITH CHECK)

### Categories Table

| Operation | Access Pattern | Rationale |
|-----------|----------------|-----------|
| SELECT | All authenticated users | Team collaboration - shared workspace |
| INSERT | Any authenticated user | Any team member can create categories |
| UPDATE | Creator or Admin | Ownership-based modification |
| DELETE | Creator or Admin | Ownership-based deletion |

**Note:** The `unique_category_name_per_user` constraint allows different users to have categories with the same name.

### Tasks Table

| Operation | Access Pattern | Rationale |
|-----------|----------------|-----------|
| SELECT | All authenticated users | Team collaboration - shared task visibility |
| INSERT | Any authenticated user | Any team member can create tasks |
| UPDATE | Creator, Assignees, or Admin | Task participants can modify |
| DELETE | Creator or Admin | Only creator/admin can remove tasks |

**Critical fields:**
- `created_by`: Set on creation, immutable
- `assignee_id` (deprecated): Legacy field, use `task_assignments`
- `status`, `completed_at`: Modifiable by authorized users

### Task Assignments Table

| Operation | Access Pattern | Rationale |
|-----------|----------------|-----------|
| SELECT | All authenticated users | See who is assigned to tasks |
| INSERT | Task creator or Admin | Only task owner can assign |
| UPDATE | N/A | Delete and re-create for changes |
| DELETE | Task creator or Admin | Only task owner can unassign |

### Comments Table

| Operation | Access Pattern | Rationale |
|-----------|----------------|-----------|
| SELECT | All authenticated users | Team can read all comments |
| INSERT | Any authenticated user | Anyone can comment |
| UPDATE | Author only | Only author can edit their comment |
| DELETE | Author or Admin | Author can delete; admin can moderate |

---

## 2. SQL Policies Summary

Migration file: `supabase/migrations/20240102000000_rls_policies.sql`

```sql
-- USERS: Authenticated read, self-update, admin delete
CREATE POLICY "users_select_authenticated" ON users FOR SELECT ...;
CREATE POLICY "users_update_own" ON users FOR UPDATE ...;
CREATE POLICY "users_delete_admin" ON users FOR DELETE ...;

-- CATEGORIES: Full CRUD with ownership checks
CREATE POLICY "categories_select_authenticated" ON categories FOR SELECT ...;
CREATE POLICY "categories_insert_authenticated" ON categories FOR INSERT ...;
CREATE POLICY "categories_update_owner_admin" ON categories FOR UPDATE ...;
CREATE POLICY "categories_delete_owner_admin" ON categories FOR DELETE ...;

-- TASKS: Full CRUD with creator/assignee checks
CREATE POLICY "tasks_select_authenticated" ON tasks FOR SELECT ...;
CREATE POLICY "tasks_insert_authenticated" ON tasks FOR INSERT ...;
CREATE POLICY "tasks_update_authorized" ON tasks FOR UPDATE ...;
CREATE POLICY "tasks_delete_owner_admin" ON tasks FOR DELETE ...;

-- TASK_ASSIGNMENTS: Read all, modify by task creator
CREATE POLICY "task_assignments_select_authenticated" ...;
CREATE POLICY "task_assignments_insert_authorized" ...;
CREATE POLICY "task_assignments_delete_authorized" ...;

-- COMMENTS: Full CRUD with author checks
CREATE POLICY "comments_select_authenticated" ON comments FOR SELECT ...;
CREATE POLICY "comments_insert_authenticated" ON comments FOR INSERT ...;
CREATE POLICY "comments_update_author" ON comments FOR UPDATE ...;
CREATE POLICY "comments_delete_author_admin" ON comments FOR DELETE ...;
```

---

## 3. Unsafe Endpoints Under RLS

### Currently Safe (Application-level checks exist)

| Endpoint | File | Security Check |
|----------|------|----------------|
| `PUT /api/comments/:id` | `commentController.js:145` | `author_id !== userId` check |
| `DELETE /api/comments/:id` | `commentController.js:214` | `author_id !== userId` check |
| `PUT /api/auth/me` | `meController.js` | Uses `req.user.id` for own profile |

### Requires RLS Enforcement (No app-level checks)

| Endpoint | Issue | Risk Level | Recommendation |
|----------|-------|------------|----------------|
| `PUT /api/categories/:id` | No ownership check | **HIGH** | RLS enforces `created_by` check |
| `DELETE /api/categories/:id` | No ownership check | **HIGH** | RLS enforces `created_by` check |
| `PUT /api/tasks/:id` | No creator/assignee check | **HIGH** | RLS enforces authorization |
| `DELETE /api/tasks/:id` | No ownership check | **HIGH** | RLS enforces `created_by` check |
| `GET /api/users` | Returns all users | **MEDIUM** | Acceptable for team apps |

### Direct Database Access Concerns

The current architecture uses `pg` pool directly, NOT the Supabase client:

```javascript
// Current pattern (server/config/database.js)
const pool = new Pool({ connectionString: process.env.DATABASE_URL });
const { rows } = await pool.query('SELECT * FROM tasks');
```

**Issue:** RLS policies won't apply unless:
1. Queries go through Supabase client with user context, OR
2. You set the `app.current_user_id` session variable before queries

### Integration Required

To make RLS work with the current architecture, update `database.js`:

```javascript
// Before each query, set the user context
async function queryWithContext(userId, text, params) {
  const client = await pool.connect();
  try {
    if (userId) {
      await client.query('SET LOCAL app.current_user_id = $1', [userId.toString()]);
    }
    return await client.query(text, params);
  } finally {
    client.release();
  }
}
```

---

## 4. Secure-by-Default Recommendations

### Critical (Implement Immediately)

1. **Apply RLS Migration**
   ```bash
   supabase db push
   # or
   psql $DATABASE_URL -f supabase/migrations/20240102000000_rls_policies.sql
   ```

2. **Update Controllers to Use Supabase Client**
   Replace direct `pg` pool queries with Supabase client that respects RLS:
   ```javascript
   // Instead of: pool.query('SELECT * FROM tasks')
   // Use: supabase.from('tasks').select('*')
   ```

3. **Never Expose Service Role Key**
   - Server-side only
   - Environment variable, never in code
   - Audit `.env` files in version control

### High Priority

4. **Add Ownership Checks to Controllers**
   Even with RLS, add explicit checks for defense-in-depth:
   ```javascript
   // categoryController.js - updateCategory
   if (category.created_by !== req.user.id && req.user.role !== 'admin') {
     return res.status(403).json({ error: 'Not authorized' });
   }
   ```

5. **Audit Password Handling**
   - Ensure `password` field is never returned in API responses
   - Current controllers appear safe (explicit column selection)

6. **Force RLS for Table Owners**
   ```sql
   ALTER TABLE users FORCE ROW LEVEL SECURITY;
   ALTER TABLE tasks FORCE ROW LEVEL SECURITY;
   -- etc.
   ```

### Medium Priority

7. **Migrate to Supabase Auth**
   - Replace custom JWT with Supabase Auth
   - Automatic `auth.uid()` integration
   - Built-in token refresh, session management

8. **Add Rate Limiting**
   - Protect authentication endpoints
   - Prevent enumeration attacks on `/api/users`

9. **Implement Soft Deletes**
   - Add `deleted_at` column instead of hard deletes
   - Allows data recovery and audit trails

### Optional Enhancements

10. **Private Tasks/Categories**
    If you need private items, add visibility columns:
    ```sql
    ALTER TABLE tasks ADD COLUMN is_private BOOLEAN DEFAULT false;
    -- Update RLS to check: is_private = false OR created_by = current_user_id()
    ```

---

## 5. Testing RLS Policies

### Manual Testing

```sql
-- Test as user ID 1
SET LOCAL app.current_user_id = '1';

-- Should see all tasks (SELECT allowed)
SELECT * FROM tasks;

-- Should fail if not creator (UPDATE denied)
UPDATE tasks SET title = 'Hacked' WHERE id = 999;

-- Should fail if not creator (DELETE denied)
DELETE FROM tasks WHERE id = 999;
```

### Automated Testing

Create test cases for each policy:

```javascript
describe('RLS Policies', () => {
  it('should allow user to update own profile', async () => {
    await pool.query("SET LOCAL app.current_user_id = '1'");
    const result = await pool.query(
      'UPDATE users SET name = $1 WHERE id = $2 RETURNING *',
      ['Updated', 1]
    );
    expect(result.rows).toHaveLength(1);
  });

  it('should deny user updating other profile', async () => {
    await pool.query("SET LOCAL app.current_user_id = '1'");
    const result = await pool.query(
      'UPDATE users SET name = $1 WHERE id = $2 RETURNING *',
      ['Hacked', 2]
    );
    expect(result.rows).toHaveLength(0); // No rows updated
  });
});
```

---

## 6. Migration Checklist

- [ ] Review and customize policies in `20240102000000_rls_policies.sql`
- [ ] Run migration in development environment
- [ ] Test all CRUD operations for each role (member, admin)
- [ ] Update controllers to integrate with RLS (set user context)
- [ ] Add explicit ownership checks to controllers (defense-in-depth)
- [ ] Run migration in staging environment
- [ ] Perform security audit
- [ ] Run migration in production
- [ ] Monitor for access denied errors in logs

---

## 7. Quick Reference: Policy Matrix

| Table | SELECT | INSERT | UPDATE | DELETE |
|-------|--------|--------|--------|--------|
| users | Auth | Service | Self | Admin |
| categories | Auth | Auth (own) | Creator/Admin | Creator/Admin |
| tasks | Auth | Auth (own) | Creator/Assignee/Admin | Creator/Admin |
| task_assignments | Auth | Task Creator/Admin | N/A | Task Creator/Admin |
| comments | Auth | Auth (own) | Author | Author/Admin |

**Legend:**
- Auth = Any authenticated user
- Service = Service role only (backend)
- Self/Own = Current user's records only
- Creator = Record creator
- Admin = Users with role='admin'
