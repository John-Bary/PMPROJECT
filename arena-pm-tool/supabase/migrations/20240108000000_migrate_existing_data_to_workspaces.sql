-- Arena PM Tool - Migrate Existing Data to Workspaces (Fixed)
-- Migration: 20240108000000_migrate_existing_data_to_workspaces.sql
-- Description: Assigns orphaned categories and tasks to workspaces
--
-- NOTE: This version handles the case where created_by is INTEGER (local users table)
-- while workspace_members.user_id is UUID (Supabase auth.users)

-- ============================================================================
-- STEP 1: CHECK FOR ORPHANED DATA
-- ============================================================================

DO $$
DECLARE
    orphan_categories INTEGER;
    orphan_tasks INTEGER;
    default_workspace_id UUID;
BEGIN
    -- Count orphaned data
    SELECT COUNT(*) INTO orphan_categories FROM categories WHERE workspace_id IS NULL;
    SELECT COUNT(*) INTO orphan_tasks FROM tasks WHERE workspace_id IS NULL;

    RAISE NOTICE 'Found % categories and % tasks without workspace_id', orphan_categories, orphan_tasks;

    -- If there's orphaned data, create a default workspace for it
    IF orphan_categories > 0 OR orphan_tasks > 0 THEN
        RAISE NOTICE 'Creating default workspace for legacy data...';

        -- Create a default workspace (no owner since we can't map integer users to UUID)
        INSERT INTO workspaces (id, name, owner_id, created_at)
        VALUES (gen_random_uuid(), 'Legacy Data Workspace', NULL, NOW())
        RETURNING id INTO default_workspace_id;

        RAISE NOTICE 'Created workspace with ID: %', default_workspace_id;

        -- Assign orphaned categories to the default workspace
        UPDATE categories
        SET workspace_id = default_workspace_id
        WHERE workspace_id IS NULL;

        RAISE NOTICE 'Assigned % categories to default workspace', orphan_categories;

        -- Assign orphaned tasks to the default workspace
        UPDATE tasks
        SET workspace_id = default_workspace_id
        WHERE workspace_id IS NULL;

        RAISE NOTICE 'Assigned % tasks to default workspace', orphan_tasks;
    ELSE
        RAISE NOTICE 'No orphaned data found - skipping workspace creation';
    END IF;
END $$;

-- ============================================================================
-- STEP 2: VERIFY NO NULL WORKSPACE_IDS REMAIN
-- ============================================================================

DO $$
DECLARE
    remaining_categories INTEGER;
    remaining_tasks INTEGER;
BEGIN
    SELECT COUNT(*) INTO remaining_categories FROM categories WHERE workspace_id IS NULL;
    SELECT COUNT(*) INTO remaining_tasks FROM tasks WHERE workspace_id IS NULL;

    IF remaining_categories > 0 OR remaining_tasks > 0 THEN
        RAISE EXCEPTION 'Migration incomplete: % categories and % tasks still have NULL workspace_id',
            remaining_categories, remaining_tasks;
    END IF;

    RAISE NOTICE 'Verification passed: All data has workspace_id assigned';
END $$;

-- ============================================================================
-- STEP 3: ADD NOT NULL CONSTRAINTS
-- ============================================================================

ALTER TABLE categories ALTER COLUMN workspace_id SET NOT NULL;
ALTER TABLE tasks ALTER COLUMN workspace_id SET NOT NULL;

-- ============================================================================
-- STEP 4: CLEANUP - DROP MIGRATION HELPER OBJECTS
-- ============================================================================

-- Drop the migration helper view if it exists
DROP VIEW IF EXISTS data_needing_workspace_assignment;

-- Drop the insert enforcement triggers (NOT NULL constraint handles this now)
DROP TRIGGER IF EXISTS enforce_categories_workspace_id ON categories;
DROP TRIGGER IF EXISTS enforce_tasks_workspace_id ON tasks;
DROP FUNCTION IF EXISTS enforce_workspace_id_on_insert();

-- ============================================================================
-- STEP 5: UPDATE RLS POLICIES - REMOVE NULL CHECKS
-- ============================================================================

-- Categories SELECT policy - remove NULL check
DROP POLICY IF EXISTS "categories_select_workspace_member" ON categories;
CREATE POLICY "categories_select_workspace_member"
    ON categories FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM workspace_members
            WHERE workspace_members.workspace_id = categories.workspace_id
            AND workspace_members.user_id = auth.uid()
        )
    );

-- Tasks SELECT policy - remove NULL check
DROP POLICY IF EXISTS "tasks_select_workspace_member" ON tasks;
CREATE POLICY "tasks_select_workspace_member"
    ON tasks FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM workspace_members
            WHERE workspace_members.workspace_id = tasks.workspace_id
            AND workspace_members.user_id = auth.uid()
        )
    );

-- ============================================================================
-- POST-MIGRATION NOTES
-- ============================================================================
--
-- If a "Legacy Data Workspace" was created:
-- 1. A Supabase auth user needs to be added as admin to access this data
-- 2. Run this to add a user to the legacy workspace:
--
--    INSERT INTO workspace_members (workspace_id, user_id, role)
--    SELECT w.id, auth.uid(), 'admin'
--    FROM workspaces w
--    WHERE w.name = 'Legacy Data Workspace';
--
-- Or manually add the workspace member via Supabase dashboard.
--
-- ============================================================================

-- Migration complete!
