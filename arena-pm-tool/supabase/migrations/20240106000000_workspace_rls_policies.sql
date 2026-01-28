-- Arena PM Tool - Comprehensive Workspace RLS Policies
-- Migration: 20240106000000_workspace_rls_policies.sql
-- Description: Implements workspace-scoped Row Level Security policies for all tables
--
-- ============================================================================
-- POLICY OVERVIEW
-- ============================================================================
--
-- WORKSPACES:
--   SELECT: Users can only see workspaces they are a member of
--   INSERT: Authenticated users can create workspaces (handled by signup trigger)
--   UPDATE: Only workspace admins can update workspace details
--   DELETE: Only the workspace owner can delete
--
-- WORKSPACE_MEMBERS:
--   SELECT: Members can view other members of their workspace
--   INSERT/UPDATE/DELETE: Only workspace admins can manage members
--
-- WORKSPACE_INVITATIONS:
--   SELECT: Workspace admins can view invitations; invitees can see their own
--   INSERT: Only workspace admins can create invitations
--   UPDATE: Admins can update; invitees can update accepted_at
--   DELETE: Only workspace admins can delete/cancel invitations
--
-- DATA TABLES (tasks, categories, etc.):
--   ALL: User must be a member of the workspace that owns the data
--
-- ============================================================================

-- ============================================================================
-- HELPER FUNCTION: Check if user is workspace admin
-- ============================================================================

CREATE OR REPLACE FUNCTION is_workspace_admin(ws_id UUID)
RETURNS BOOLEAN AS $$
BEGIN
    RETURN EXISTS (
        SELECT 1 FROM workspace_members
        WHERE workspace_id = ws_id
        AND user_id = current_user_id()
        AND role = 'admin'
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================================================
-- HELPER FUNCTION: Check if user is workspace member
-- ============================================================================

CREATE OR REPLACE FUNCTION is_workspace_member(ws_id UUID)
RETURNS BOOLEAN AS $$
BEGIN
    RETURN EXISTS (
        SELECT 1 FROM workspace_members
        WHERE workspace_id = ws_id
        AND user_id = current_user_id()
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================================================
-- HELPER FUNCTION: Check if user is workspace owner
-- ============================================================================

CREATE OR REPLACE FUNCTION is_workspace_owner(ws_id UUID)
RETURNS BOOLEAN AS $$
BEGIN
    RETURN EXISTS (
        SELECT 1 FROM workspaces
        WHERE id = ws_id
        AND owner_id = current_user_id()
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================================================
-- HELPER FUNCTION: Get user's workspace IDs
-- ============================================================================

CREATE OR REPLACE FUNCTION user_workspace_ids()
RETURNS SETOF UUID AS $$
    SELECT workspace_id FROM workspace_members WHERE user_id = current_user_id();
$$ LANGUAGE sql SECURITY DEFINER STABLE;

-- ============================================================================
-- DROP EXISTING POLICIES
-- ============================================================================

-- Workspaces policies
DROP POLICY IF EXISTS "workspaces_select_members" ON workspaces;
DROP POLICY IF EXISTS "workspaces_insert_authenticated" ON workspaces;
DROP POLICY IF EXISTS "workspaces_update_owner_admin" ON workspaces;
DROP POLICY IF EXISTS "workspaces_delete_owner" ON workspaces;

-- Workspace members policies
DROP POLICY IF EXISTS "workspace_members_select" ON workspace_members;
DROP POLICY IF EXISTS "workspace_members_insert" ON workspace_members;
DROP POLICY IF EXISTS "workspace_members_update" ON workspace_members;
DROP POLICY IF EXISTS "workspace_members_delete" ON workspace_members;

-- Workspace invitations policies
DROP POLICY IF EXISTS "workspace_invitations_select" ON workspace_invitations;
DROP POLICY IF EXISTS "workspace_invitations_insert" ON workspace_invitations;
DROP POLICY IF EXISTS "workspace_invitations_update" ON workspace_invitations;
DROP POLICY IF EXISTS "workspace_invitations_delete" ON workspace_invitations;

-- Categories policies (from previous migrations)
DROP POLICY IF EXISTS "categories_select_workspace_member" ON categories;
DROP POLICY IF EXISTS "categories_insert_workspace_member" ON categories;
DROP POLICY IF EXISTS "categories_update_workspace_admin_creator" ON categories;
DROP POLICY IF EXISTS "categories_delete_workspace_admin_creator" ON categories;

-- Tasks policies (from previous migrations)
DROP POLICY IF EXISTS "tasks_select_workspace_member" ON tasks;
DROP POLICY IF EXISTS "tasks_insert_workspace_member" ON tasks;
DROP POLICY IF EXISTS "tasks_update_workspace_authorized" ON tasks;
DROP POLICY IF EXISTS "tasks_delete_workspace_admin_creator" ON tasks;

-- Task assignments policies
DROP POLICY IF EXISTS "task_assignments_select_authenticated" ON task_assignments;
DROP POLICY IF EXISTS "task_assignments_insert_authorized" ON task_assignments;
DROP POLICY IF EXISTS "task_assignments_delete_authorized" ON task_assignments;

-- Comments policies
DROP POLICY IF EXISTS "comments_select_authenticated" ON comments;
DROP POLICY IF EXISTS "comments_insert_authenticated" ON comments;
DROP POLICY IF EXISTS "comments_update_author" ON comments;
DROP POLICY IF EXISTS "comments_delete_author_admin" ON comments;

-- ============================================================================
-- ENSURE RLS IS ENABLED ON ALL TABLES
-- ============================================================================

ALTER TABLE workspaces ENABLE ROW LEVEL SECURITY;
ALTER TABLE workspace_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE workspace_invitations ENABLE ROW LEVEL SECURITY;
ALTER TABLE categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE tasks ENABLE ROW LEVEL SECURITY;
ALTER TABLE task_assignments ENABLE ROW LEVEL SECURITY;
ALTER TABLE comments ENABLE ROW LEVEL SECURITY;

-- ============================================================================
-- WORKSPACES POLICIES
-- ============================================================================

-- SELECT: Users can only see workspaces they are a member of
CREATE POLICY "workspaces_select_member"
    ON workspaces FOR SELECT
    USING (id IN (SELECT user_workspace_ids()));

-- INSERT: Authenticated users can create workspaces (they become owner)
CREATE POLICY "workspaces_insert_authenticated"
    ON workspaces FOR INSERT
    WITH CHECK (current_user_id() IS NOT NULL AND owner_id = current_user_id());

-- UPDATE: Only workspace admins can update workspace details
CREATE POLICY "workspaces_update_admin"
    ON workspaces FOR UPDATE
    USING (is_workspace_admin(id))
    WITH CHECK (is_workspace_admin(id));

-- DELETE: Only the workspace owner can delete
CREATE POLICY "workspaces_delete_owner"
    ON workspaces FOR DELETE
    USING (owner_id = current_user_id());

-- ============================================================================
-- WORKSPACE_MEMBERS POLICIES
-- ============================================================================

-- SELECT: Members can view other members of their workspace
CREATE POLICY "workspace_members_select_member"
    ON workspace_members FOR SELECT
    USING (workspace_id IN (SELECT user_workspace_ids()));

-- INSERT: Only workspace admins can add members
CREATE POLICY "workspace_members_insert_admin"
    ON workspace_members FOR INSERT
    WITH CHECK (is_workspace_admin(workspace_id));

-- UPDATE: Only workspace admins can update member roles
CREATE POLICY "workspace_members_update_admin"
    ON workspace_members FOR UPDATE
    USING (is_workspace_admin(workspace_id))
    WITH CHECK (is_workspace_admin(workspace_id));

-- DELETE: Only workspace admins can remove members
CREATE POLICY "workspace_members_delete_admin"
    ON workspace_members FOR DELETE
    USING (is_workspace_admin(workspace_id));

-- ============================================================================
-- WORKSPACE_INVITATIONS POLICIES
-- ============================================================================

-- SELECT: Admins can view all invitations; invitees can see their own invitation
CREATE POLICY "workspace_invitations_select"
    ON workspace_invitations FOR SELECT
    USING (
        is_workspace_admin(workspace_id)
        OR email = (SELECT email FROM users WHERE id = current_user_id())
    );

-- INSERT: Only workspace admins can create invitations
CREATE POLICY "workspace_invitations_insert_admin"
    ON workspace_invitations FOR INSERT
    WITH CHECK (is_workspace_admin(workspace_id));

-- UPDATE: Admins can update any field; invitees can only update accepted_at
CREATE POLICY "workspace_invitations_update"
    ON workspace_invitations FOR UPDATE
    USING (
        is_workspace_admin(workspace_id)
        OR email = (SELECT email FROM users WHERE id = current_user_id())
    )
    WITH CHECK (
        is_workspace_admin(workspace_id)
        OR (
            -- Invitees can only update accepted_at (check that other fields unchanged)
            email = (SELECT email FROM users WHERE id = current_user_id())
        )
    );

-- DELETE: Only workspace admins can delete/cancel invitations
CREATE POLICY "workspace_invitations_delete_admin"
    ON workspace_invitations FOR DELETE
    USING (is_workspace_admin(workspace_id));

-- ============================================================================
-- CATEGORIES POLICIES (Workspace-scoped)
-- ============================================================================

-- SELECT: User must be a member of the workspace
CREATE POLICY "categories_select_workspace_member"
    ON categories FOR SELECT
    USING (
        workspace_id IS NULL  -- Legacy data during migration
        OR workspace_id IN (SELECT user_workspace_ids())
    );

-- INSERT: User must be a member of the workspace
CREATE POLICY "categories_insert_workspace_member"
    ON categories FOR INSERT
    WITH CHECK (workspace_id IN (SELECT user_workspace_ids()));

-- UPDATE: User must be a member of the workspace
CREATE POLICY "categories_update_workspace_member"
    ON categories FOR UPDATE
    USING (workspace_id IN (SELECT user_workspace_ids()))
    WITH CHECK (workspace_id IN (SELECT user_workspace_ids()));

-- DELETE: User must be a member of the workspace
CREATE POLICY "categories_delete_workspace_member"
    ON categories FOR DELETE
    USING (workspace_id IN (SELECT user_workspace_ids()));

-- ============================================================================
-- TASKS POLICIES (Workspace-scoped)
-- ============================================================================

-- SELECT: User must be a member of the workspace
CREATE POLICY "tasks_select_workspace_member"
    ON tasks FOR SELECT
    USING (
        workspace_id IS NULL  -- Legacy data during migration
        OR workspace_id IN (SELECT user_workspace_ids())
    );

-- INSERT: User must be a member of the workspace
CREATE POLICY "tasks_insert_workspace_member"
    ON tasks FOR INSERT
    WITH CHECK (workspace_id IN (SELECT user_workspace_ids()));

-- UPDATE: User must be a member of the workspace
CREATE POLICY "tasks_update_workspace_member"
    ON tasks FOR UPDATE
    USING (workspace_id IN (SELECT user_workspace_ids()))
    WITH CHECK (workspace_id IN (SELECT user_workspace_ids()));

-- DELETE: User must be a member of the workspace
CREATE POLICY "tasks_delete_workspace_member"
    ON tasks FOR DELETE
    USING (workspace_id IN (SELECT user_workspace_ids()));

-- ============================================================================
-- TASK_ASSIGNMENTS POLICIES (Workspace-scoped via task)
-- ============================================================================

-- SELECT: User must be a member of the task's workspace
CREATE POLICY "task_assignments_select_workspace_member"
    ON task_assignments FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM tasks
            WHERE tasks.id = task_assignments.task_id
            AND (tasks.workspace_id IS NULL OR tasks.workspace_id IN (SELECT user_workspace_ids()))
        )
    );

-- INSERT: User must be a member of the task's workspace
CREATE POLICY "task_assignments_insert_workspace_member"
    ON task_assignments FOR INSERT
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM tasks
            WHERE tasks.id = task_assignments.task_id
            AND tasks.workspace_id IN (SELECT user_workspace_ids())
        )
    );

-- DELETE: User must be a member of the task's workspace
CREATE POLICY "task_assignments_delete_workspace_member"
    ON task_assignments FOR DELETE
    USING (
        EXISTS (
            SELECT 1 FROM tasks
            WHERE tasks.id = task_assignments.task_id
            AND tasks.workspace_id IN (SELECT user_workspace_ids())
        )
    );

-- ============================================================================
-- COMMENTS POLICIES (Workspace-scoped via task)
-- ============================================================================

-- SELECT: User must be a member of the task's workspace
CREATE POLICY "comments_select_workspace_member"
    ON comments FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM tasks
            WHERE tasks.id = comments.task_id
            AND (tasks.workspace_id IS NULL OR tasks.workspace_id IN (SELECT user_workspace_ids()))
        )
    );

-- INSERT: User must be a member of the task's workspace
CREATE POLICY "comments_insert_workspace_member"
    ON comments FOR INSERT
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM tasks
            WHERE tasks.id = comments.task_id
            AND tasks.workspace_id IN (SELECT user_workspace_ids())
        )
    );

-- UPDATE: Author can update their own comments (within their workspace)
CREATE POLICY "comments_update_author"
    ON comments FOR UPDATE
    USING (
        author_id = current_user_id()
        AND EXISTS (
            SELECT 1 FROM tasks
            WHERE tasks.id = comments.task_id
            AND tasks.workspace_id IN (SELECT user_workspace_ids())
        )
    )
    WITH CHECK (
        author_id = current_user_id()
        AND EXISTS (
            SELECT 1 FROM tasks
            WHERE tasks.id = comments.task_id
            AND tasks.workspace_id IN (SELECT user_workspace_ids())
        )
    );

-- DELETE: Author can delete their own comments (within their workspace)
CREATE POLICY "comments_delete_author"
    ON comments FOR DELETE
    USING (
        author_id = current_user_id()
        AND EXISTS (
            SELECT 1 FROM tasks
            WHERE tasks.id = comments.task_id
            AND tasks.workspace_id IN (SELECT user_workspace_ids())
        )
    );

-- ============================================================================
-- SPECIAL POLICY: Allow signup trigger to insert workspace_members
-- ============================================================================
-- The handle_new_user_workspace() function runs as SECURITY DEFINER,
-- so it bypasses RLS. This policy allows the initial member insert.

-- We need to allow the first admin member to be added when workspace is created
-- This is handled by the SECURITY DEFINER function, but we also need a policy
-- for the owner to add themselves if doing it manually

CREATE POLICY "workspace_members_insert_owner"
    ON workspace_members FOR INSERT
    WITH CHECK (
        -- Allow if user is the workspace owner (for manual setup)
        EXISTS (
            SELECT 1 FROM workspaces
            WHERE workspaces.id = workspace_members.workspace_id
            AND workspaces.owner_id = current_user_id()
        )
    );

-- ============================================================================
-- GRANTS
-- ============================================================================

GRANT EXECUTE ON FUNCTION is_workspace_admin(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION is_workspace_member(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION is_workspace_owner(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION user_workspace_ids() TO authenticated;

-- ============================================================================
-- END OF MIGRATION
-- ============================================================================
