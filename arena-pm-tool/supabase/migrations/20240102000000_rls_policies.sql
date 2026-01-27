-- Arena PM Tool - Row Level Security (RLS) Policies
-- Migration: 20240102000000_rls_policies.sql
-- Description: Implements secure-by-default RLS policies for all tables
--
-- ============================================================================
-- ACCESS PATTERN SUMMARY
-- ============================================================================
--
-- TABLE           | SELECT          | INSERT         | UPDATE          | DELETE
-- ----------------|-----------------|----------------|-----------------|----------------
-- users           | Authenticated   | Public         | Own profile     | Admin only
-- categories      | Authenticated   | Authenticated  | Creator/Admin   | Creator/Admin
-- tasks           | Authenticated   | Authenticated  | Creator/Assignee| Creator/Admin
-- task_assignments| Authenticated   | Task creator   | N/A             | Task creator
-- comments        | Authenticated   | Authenticated  | Author only     | Author only
--
-- ============================================================================
-- IMPORTANT: Authentication Context
-- ============================================================================
--
-- This migration supports TWO authentication modes:
--
-- 1. SUPABASE AUTH (Recommended): Uses auth.uid() for user identification
--    - Works automatically with Supabase client
--    - No additional setup required
--
-- 2. CUSTOM JWT AUTH: Uses app.current_user_id session variable
--    - Requires setting the variable before each query:
--      SET LOCAL app.current_user_id = '123';
--    - See helper function current_user_id() below
--
-- ============================================================================

-- ============================================================================
-- HELPER FUNCTIONS
-- ============================================================================

-- Function to get current user ID (supports both Supabase Auth and custom JWT)
-- Priority: 1) Supabase auth.uid(), 2) app.current_user_id session variable
CREATE OR REPLACE FUNCTION current_user_id()
RETURNS INTEGER AS $$
DECLARE
    supabase_uid TEXT;
    custom_uid TEXT;
BEGIN
    -- Try Supabase Auth first
    BEGIN
        supabase_uid := auth.uid()::TEXT;
        IF supabase_uid IS NOT NULL THEN
            -- For Supabase Auth, you may need to look up user by auth.uid()
            -- This assumes users.id maps to auth.uid() or you have a mapping
            RETURN supabase_uid::INTEGER;
        END IF;
    EXCEPTION WHEN OTHERS THEN
        -- auth.uid() not available, continue to custom auth
        NULL;
    END;

    -- Fall back to custom session variable
    custom_uid := current_setting('app.current_user_id', true);
    IF custom_uid IS NOT NULL AND custom_uid != '' THEN
        RETURN custom_uid::INTEGER;
    END IF;

    RETURN NULL;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to check if current user is admin
CREATE OR REPLACE FUNCTION is_current_user_admin()
RETURNS BOOLEAN AS $$
BEGIN
    RETURN EXISTS (
        SELECT 1 FROM users
        WHERE id = current_user_id()
        AND role = 'admin'
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to check if user is assigned to a task
CREATE OR REPLACE FUNCTION is_assigned_to_task(task_id_param INTEGER)
RETURNS BOOLEAN AS $$
BEGIN
    RETURN EXISTS (
        SELECT 1 FROM task_assignments
        WHERE task_id = task_id_param
        AND user_id = current_user_id()
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to check if user created a task
CREATE OR REPLACE FUNCTION is_task_creator(task_id_param INTEGER)
RETURNS BOOLEAN AS $$
BEGIN
    RETURN EXISTS (
        SELECT 1 FROM tasks
        WHERE id = task_id_param
        AND created_by = current_user_id()
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================================================
-- ENABLE ROW LEVEL SECURITY ON ALL TABLES
-- ============================================================================

ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE tasks ENABLE ROW LEVEL SECURITY;
ALTER TABLE task_assignments ENABLE ROW LEVEL SECURITY;
ALTER TABLE comments ENABLE ROW LEVEL SECURITY;

-- ============================================================================
-- USERS TABLE POLICIES
-- ============================================================================
-- Access Pattern:
--   SELECT: All authenticated users (team collaboration - need to see assignees)
--   INSERT: Public (registration - protected by rate limiting and validation)
--   UPDATE: Own profile only
--   DELETE: Admin only (or disallowed)

-- Policy: Authenticated users can view all user profiles (for team features)
CREATE POLICY "users_select_authenticated"
    ON users FOR SELECT
    USING (current_user_id() IS NOT NULL);

-- Policy: Users can only update their own profile
CREATE POLICY "users_update_own"
    ON users FOR UPDATE
    USING (id = current_user_id())
    WITH CHECK (id = current_user_id());

-- Policy: Only admins can delete users (if needed)
CREATE POLICY "users_delete_admin"
    ON users FOR DELETE
    USING (is_current_user_admin());

-- Policy: Allow public registration (unauthenticated INSERT)
-- This is required because the backend uses regular PostgreSQL connections,
-- not the Supabase service role. Registration is protected by:
-- 1. Password hashing in the application layer
-- 2. Rate limiting on the /api/auth/register endpoint
-- 3. Input validation in authController.js
CREATE POLICY "users_insert_registration"
    ON users FOR INSERT
    WITH CHECK (true);

-- ============================================================================
-- CATEGORIES TABLE POLICIES
-- ============================================================================
-- Access Pattern:
--   SELECT: All authenticated users (team collaboration)
--   INSERT: Any authenticated user
--   UPDATE: Creator or Admin
--   DELETE: Creator or Admin (only if no tasks)

-- Policy: Authenticated users can view all categories
CREATE POLICY "categories_select_authenticated"
    ON categories FOR SELECT
    USING (current_user_id() IS NOT NULL);

-- Policy: Authenticated users can create categories
CREATE POLICY "categories_insert_authenticated"
    ON categories FOR INSERT
    WITH CHECK (
        current_user_id() IS NOT NULL
        AND created_by = current_user_id()
    );

-- Policy: Creator or admin can update categories
CREATE POLICY "categories_update_owner_admin"
    ON categories FOR UPDATE
    USING (
        created_by = current_user_id()
        OR is_current_user_admin()
    )
    WITH CHECK (
        created_by = current_user_id()
        OR is_current_user_admin()
    );

-- Policy: Creator or admin can delete categories
CREATE POLICY "categories_delete_owner_admin"
    ON categories FOR DELETE
    USING (
        created_by = current_user_id()
        OR is_current_user_admin()
    );

-- ============================================================================
-- TASKS TABLE POLICIES
-- ============================================================================
-- Access Pattern:
--   SELECT: All authenticated users (team collaboration)
--   INSERT: Any authenticated user
--   UPDATE: Creator, Assignee, or Admin
--   DELETE: Creator or Admin

-- Policy: Authenticated users can view all tasks
CREATE POLICY "tasks_select_authenticated"
    ON tasks FOR SELECT
    USING (current_user_id() IS NOT NULL);

-- Policy: Authenticated users can create tasks
CREATE POLICY "tasks_insert_authenticated"
    ON tasks FOR INSERT
    WITH CHECK (
        current_user_id() IS NOT NULL
        AND created_by = current_user_id()
    );

-- Policy: Creator, assignee, or admin can update tasks
CREATE POLICY "tasks_update_authorized"
    ON tasks FOR UPDATE
    USING (
        created_by = current_user_id()
        OR is_assigned_to_task(id)
        OR is_current_user_admin()
    )
    WITH CHECK (
        created_by = current_user_id()
        OR is_assigned_to_task(id)
        OR is_current_user_admin()
    );

-- Policy: Creator or admin can delete tasks
CREATE POLICY "tasks_delete_owner_admin"
    ON tasks FOR DELETE
    USING (
        created_by = current_user_id()
        OR is_current_user_admin()
    );

-- ============================================================================
-- TASK_ASSIGNMENTS TABLE POLICIES
-- ============================================================================
-- Access Pattern:
--   SELECT: All authenticated users (need to see who is assigned)
--   INSERT: Task creator or Admin
--   UPDATE: Not typical (delete and re-create)
--   DELETE: Task creator or Admin

-- Policy: Authenticated users can view all assignments
CREATE POLICY "task_assignments_select_authenticated"
    ON task_assignments FOR SELECT
    USING (current_user_id() IS NOT NULL);

-- Policy: Task creator or admin can add assignments
CREATE POLICY "task_assignments_insert_authorized"
    ON task_assignments FOR INSERT
    WITH CHECK (
        is_task_creator(task_id)
        OR is_current_user_admin()
    );

-- Policy: Task creator or admin can remove assignments
CREATE POLICY "task_assignments_delete_authorized"
    ON task_assignments FOR DELETE
    USING (
        is_task_creator(task_id)
        OR is_current_user_admin()
    );

-- ============================================================================
-- COMMENTS TABLE POLICIES
-- ============================================================================
-- Access Pattern:
--   SELECT: All authenticated users (can read task comments)
--   INSERT: Any authenticated user
--   UPDATE: Author only
--   DELETE: Author only (or Admin)

-- Policy: Authenticated users can view all comments
CREATE POLICY "comments_select_authenticated"
    ON comments FOR SELECT
    USING (current_user_id() IS NOT NULL);

-- Policy: Authenticated users can create comments
CREATE POLICY "comments_insert_authenticated"
    ON comments FOR INSERT
    WITH CHECK (
        current_user_id() IS NOT NULL
        AND author_id = current_user_id()
    );

-- Policy: Only author can update their comments
CREATE POLICY "comments_update_author"
    ON comments FOR UPDATE
    USING (author_id = current_user_id())
    WITH CHECK (author_id = current_user_id());

-- Policy: Author or admin can delete comments
CREATE POLICY "comments_delete_author_admin"
    ON comments FOR DELETE
    USING (
        author_id = current_user_id()
        OR is_current_user_admin()
    );

-- ============================================================================
-- GRANT STATEMENTS (for anon and authenticated roles)
-- ============================================================================
-- These grants allow the Supabase client to interact with tables
-- RLS policies above control what data is accessible

-- Grant usage on schema
GRANT USAGE ON SCHEMA public TO anon, authenticated;

-- Users table
GRANT SELECT ON users TO anon, authenticated;
GRANT UPDATE ON users TO authenticated;

-- Categories table
GRANT SELECT, INSERT, UPDATE, DELETE ON categories TO authenticated;
GRANT USAGE, SELECT ON SEQUENCE categories_id_seq TO authenticated;

-- Tasks table
GRANT SELECT, INSERT, UPDATE, DELETE ON tasks TO authenticated;
GRANT USAGE, SELECT ON SEQUENCE tasks_id_seq TO authenticated;

-- Task assignments table
GRANT SELECT, INSERT, DELETE ON task_assignments TO authenticated;

-- Comments table
GRANT SELECT, INSERT, UPDATE, DELETE ON comments TO authenticated;
GRANT USAGE, SELECT ON SEQUENCE comments_id_seq TO authenticated;

-- ============================================================================
-- SECURITY NOTES & RECOMMENDATIONS
-- ============================================================================
--
-- 1. SERVICE ROLE BYPASS: The service role key bypasses RLS entirely.
--    - NEVER expose SUPABASE_SERVICE_ROLE_KEY to the client
--    - Use it only for backend admin operations
--
-- 2. CUSTOM JWT INTEGRATION: If using custom JWT (not Supabase Auth):
--    - Set the session variable before queries:
--      await pool.query("SET LOCAL app.current_user_id = $1", [userId]);
--    - Or create a wrapper function in your database.js
--
-- 3. ANON KEY RESTRICTIONS: The anon key should only allow:
--    - Public data reads (if any)
--    - Authentication endpoints
--    Currently, most SELECT policies require authentication.
--
-- 4. TESTING RLS: Test policies with:
--    SET LOCAL app.current_user_id = '1';
--    SELECT * FROM tasks; -- Should only show authorized data
--
-- 5. FORCE RLS FOR OWNERS: To ensure RLS applies even to table owners:
--    ALTER TABLE users FORCE ROW LEVEL SECURITY;
--    (Uncomment below if needed)
--
-- ALTER TABLE users FORCE ROW LEVEL SECURITY;
-- ALTER TABLE categories FORCE ROW LEVEL SECURITY;
-- ALTER TABLE tasks FORCE ROW LEVEL SECURITY;
-- ALTER TABLE task_assignments FORCE ROW LEVEL SECURITY;
-- ALTER TABLE comments FORCE ROW LEVEL SECURITY;

-- ============================================================================
-- END OF MIGRATION
-- ============================================================================
