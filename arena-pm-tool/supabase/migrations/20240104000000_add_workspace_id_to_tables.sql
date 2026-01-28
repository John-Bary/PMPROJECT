-- Arena PM Tool - Add Workspace ID to Data Tables
-- Migration: 20240104000000_add_workspace_id_to_tables.sql
-- Description: Adds workspace_id column to categories and tasks tables for multi-workspace support
--
-- NOTE: workspace_id is nullable to allow existing data migration.
-- After migrating existing data, run a follow-up migration to add NOT NULL constraint.

-- ============================================================================
-- ADD WORKSPACE_ID TO CATEGORIES
-- ============================================================================

ALTER TABLE categories
    ADD COLUMN IF NOT EXISTS workspace_id UUID REFERENCES workspaces(id) ON DELETE CASCADE;

-- Index for workspace lookups
CREATE INDEX IF NOT EXISTS idx_categories_workspace_id ON categories(workspace_id);

-- ============================================================================
-- ADD WORKSPACE_ID TO TASKS
-- ============================================================================

ALTER TABLE tasks
    ADD COLUMN IF NOT EXISTS workspace_id UUID REFERENCES workspaces(id) ON DELETE CASCADE;

-- Index for workspace lookups
CREATE INDEX IF NOT EXISTS idx_tasks_workspace_id ON tasks(workspace_id);

-- ============================================================================
-- TRIGGER: ENFORCE NOT NULL FOR NEW ROWS
-- ============================================================================
-- These triggers ensure new rows must have workspace_id while allowing
-- existing NULL values during the migration period.

-- Function to validate workspace_id on insert
CREATE OR REPLACE FUNCTION enforce_workspace_id_on_insert()
RETURNS TRIGGER AS $$
BEGIN
    IF NEW.workspace_id IS NULL THEN
        RAISE EXCEPTION 'workspace_id is required for new rows';
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Apply trigger to categories
DROP TRIGGER IF EXISTS enforce_categories_workspace_id ON categories;
CREATE TRIGGER enforce_categories_workspace_id
    BEFORE INSERT ON categories
    FOR EACH ROW
    EXECUTE FUNCTION enforce_workspace_id_on_insert();

-- Apply trigger to tasks
DROP TRIGGER IF EXISTS enforce_tasks_workspace_id ON tasks;
CREATE TRIGGER enforce_tasks_workspace_id
    BEFORE INSERT ON tasks
    FOR EACH ROW
    EXECUTE FUNCTION enforce_workspace_id_on_insert();

-- ============================================================================
-- UPDATE RLS POLICIES TO INCLUDE WORKSPACE CONTEXT
-- ============================================================================

-- Drop existing policies that need to be updated
DROP POLICY IF EXISTS "categories_select_authenticated" ON categories;
DROP POLICY IF EXISTS "categories_insert_authenticated" ON categories;
DROP POLICY IF EXISTS "categories_update_owner_admin" ON categories;
DROP POLICY IF EXISTS "categories_delete_owner_admin" ON categories;

DROP POLICY IF EXISTS "tasks_select_authenticated" ON tasks;
DROP POLICY IF EXISTS "tasks_insert_authenticated" ON tasks;
DROP POLICY IF EXISTS "tasks_update_authorized" ON tasks;
DROP POLICY IF EXISTS "tasks_delete_owner_admin" ON tasks;

-- ============================================================================
-- CATEGORIES POLICIES (Workspace-scoped)
-- ============================================================================

-- Users can view categories in workspaces they belong to
CREATE POLICY "categories_select_workspace_member"
    ON categories FOR SELECT
    USING (
        workspace_id IS NULL  -- Allow viewing legacy data during migration
        OR EXISTS (
            SELECT 1 FROM workspace_members
            WHERE workspace_members.workspace_id = categories.workspace_id
            AND workspace_members.user_id = current_user_id()
        )
    );

-- Users can create categories in workspaces they belong to
CREATE POLICY "categories_insert_workspace_member"
    ON categories FOR INSERT
    WITH CHECK (
        current_user_id() IS NOT NULL
        AND EXISTS (
            SELECT 1 FROM workspace_members
            WHERE workspace_members.workspace_id = categories.workspace_id
            AND workspace_members.user_id = current_user_id()
            AND workspace_members.role IN ('admin', 'member')
        )
    );

-- Workspace admins and category creators can update categories
CREATE POLICY "categories_update_workspace_admin_creator"
    ON categories FOR UPDATE
    USING (
        created_by = current_user_id()
        OR EXISTS (
            SELECT 1 FROM workspace_members
            WHERE workspace_members.workspace_id = categories.workspace_id
            AND workspace_members.user_id = current_user_id()
            AND workspace_members.role = 'admin'
        )
    );

-- Workspace admins and category creators can delete categories
CREATE POLICY "categories_delete_workspace_admin_creator"
    ON categories FOR DELETE
    USING (
        created_by = current_user_id()
        OR EXISTS (
            SELECT 1 FROM workspace_members
            WHERE workspace_members.workspace_id = categories.workspace_id
            AND workspace_members.user_id = current_user_id()
            AND workspace_members.role = 'admin'
        )
    );

-- ============================================================================
-- TASKS POLICIES (Workspace-scoped)
-- ============================================================================

-- Users can view tasks in workspaces they belong to
CREATE POLICY "tasks_select_workspace_member"
    ON tasks FOR SELECT
    USING (
        workspace_id IS NULL  -- Allow viewing legacy data during migration
        OR EXISTS (
            SELECT 1 FROM workspace_members
            WHERE workspace_members.workspace_id = tasks.workspace_id
            AND workspace_members.user_id = current_user_id()
        )
    );

-- Users can create tasks in workspaces they belong to (admin or member role)
CREATE POLICY "tasks_insert_workspace_member"
    ON tasks FOR INSERT
    WITH CHECK (
        current_user_id() IS NOT NULL
        AND EXISTS (
            SELECT 1 FROM workspace_members
            WHERE workspace_members.workspace_id = tasks.workspace_id
            AND workspace_members.user_id = current_user_id()
            AND workspace_members.role IN ('admin', 'member')
        )
    );

-- Task creator, assignees, or workspace admins can update tasks
CREATE POLICY "tasks_update_workspace_authorized"
    ON tasks FOR UPDATE
    USING (
        created_by = current_user_id()
        OR is_assigned_to_task(id)
        OR EXISTS (
            SELECT 1 FROM workspace_members
            WHERE workspace_members.workspace_id = tasks.workspace_id
            AND workspace_members.user_id = current_user_id()
            AND workspace_members.role = 'admin'
        )
    );

-- Task creator or workspace admins can delete tasks
CREATE POLICY "tasks_delete_workspace_admin_creator"
    ON tasks FOR DELETE
    USING (
        created_by = current_user_id()
        OR EXISTS (
            SELECT 1 FROM workspace_members
            WHERE workspace_members.workspace_id = tasks.workspace_id
            AND workspace_members.user_id = current_user_id()
            AND workspace_members.role = 'admin'
        )
    );

-- ============================================================================
-- MIGRATION HELPER: View to find data needing workspace assignment
-- ============================================================================

CREATE OR REPLACE VIEW data_needing_workspace_assignment AS
SELECT 'categories' AS table_name, id, created_by, NULL::INTEGER AS category_id
FROM categories WHERE workspace_id IS NULL
UNION ALL
SELECT 'tasks' AS table_name, id, created_by, category_id
FROM tasks WHERE workspace_id IS NULL;

-- Grant access to the view
GRANT SELECT ON data_needing_workspace_assignment TO authenticated;

-- ============================================================================
-- POST-MIGRATION INSTRUCTIONS
-- ============================================================================
-- After migrating all existing data to workspaces:
--
-- 1. Verify no NULL workspace_ids remain:
--    SELECT * FROM data_needing_workspace_assignment;
--
-- 2. Run follow-up migration to add NOT NULL constraints:
--    ALTER TABLE categories ALTER COLUMN workspace_id SET NOT NULL;
--    ALTER TABLE tasks ALTER COLUMN workspace_id SET NOT NULL;
--
-- 3. Drop the migration helper view:
--    DROP VIEW IF EXISTS data_needing_workspace_assignment;
--
-- 4. Remove the NULL checks from RLS policies
--
-- 5. Optionally drop the insert triggers (NOT NULL constraint will handle it):
--    DROP TRIGGER IF EXISTS enforce_categories_workspace_id ON categories;
--    DROP TRIGGER IF EXISTS enforce_tasks_workspace_id ON tasks;
--    DROP FUNCTION IF EXISTS enforce_workspace_id_on_insert();
-- ============================================================================

-- ============================================================================
-- END OF MIGRATION
-- ============================================================================
