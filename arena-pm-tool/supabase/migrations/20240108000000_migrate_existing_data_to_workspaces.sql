-- Todoria - Migrate Existing Data to Workspaces
-- Migration: 20240108000000_migrate_existing_data_to_workspaces.sql
-- Description: Assigns orphaned categories and tasks to their owner's workspace
--
-- This migration:
-- 1. Creates workspaces for users who have data but no workspace
-- 2. Assigns orphaned categories to owner's workspace
-- 3. Assigns orphaned tasks to owner's workspace
-- 4. Adds NOT NULL constraints to workspace_id columns
-- 5. Cleans up migration helper objects

-- ============================================================================
-- STEP 1: CREATE WORKSPACES FOR USERS WITH ORPHANED DATA BUT NO WORKSPACE
-- ============================================================================
-- Find users who have categories/tasks without workspace_id but don't have
-- a workspace yet (edge case if they signed up before the auto-create trigger)

DO $$
DECLARE
    orphan_user RECORD;
    new_workspace_id UUID;
    user_email TEXT;
    workspace_name TEXT;
BEGIN
    -- Find users with orphaned data who don't have a workspace
    FOR orphan_user IN
        SELECT DISTINCT created_by AS user_id
        FROM (
            SELECT created_by FROM categories WHERE workspace_id IS NULL AND created_by IS NOT NULL
            UNION
            SELECT created_by FROM tasks WHERE workspace_id IS NULL AND created_by IS NOT NULL
        ) orphaned_data
        WHERE NOT EXISTS (
            SELECT 1 FROM workspace_members wm WHERE wm.user_id = orphaned_data.created_by
        )
    LOOP
        -- Get user email for workspace name
        SELECT email INTO user_email
        FROM auth.users
        WHERE id = orphan_user.user_id;

        -- Generate workspace name from email
        workspace_name := COALESCE(
            SPLIT_PART(user_email, '@', 1) || '''s Workspace',
            'My Workspace'
        );

        -- Create workspace
        INSERT INTO workspaces (id, name, owner_id, created_at)
        VALUES (gen_random_uuid(), workspace_name, orphan_user.user_id, NOW())
        RETURNING id INTO new_workspace_id;

        -- Add user as admin member
        INSERT INTO workspace_members (id, workspace_id, user_id, role, joined_at)
        VALUES (gen_random_uuid(), new_workspace_id, orphan_user.user_id, 'admin', NOW());

        RAISE NOTICE 'Created workspace "%" for user %', workspace_name, orphan_user.user_id;
    END LOOP;
END $$;

-- ============================================================================
-- STEP 2: ASSIGN ORPHANED CATEGORIES TO OWNER'S WORKSPACE
-- ============================================================================
-- Update categories where workspace_id IS NULL
-- Set workspace_id to the first workspace the creator belongs to

UPDATE categories c
SET workspace_id = (
    SELECT wm.workspace_id
    FROM workspace_members wm
    WHERE wm.user_id = c.created_by
    ORDER BY wm.joined_at ASC
    LIMIT 1
)
WHERE c.workspace_id IS NULL
AND c.created_by IS NOT NULL;

-- Log how many categories were updated
DO $$
DECLARE
    updated_count INTEGER;
BEGIN
    GET DIAGNOSTICS updated_count = ROW_COUNT;
    RAISE NOTICE 'Assigned % categories to workspaces', updated_count;
END $$;

-- ============================================================================
-- STEP 3: ASSIGN ORPHANED TASKS TO OWNER'S WORKSPACE
-- ============================================================================
-- Update tasks where workspace_id IS NULL
-- Set workspace_id to the first workspace the creator belongs to

UPDATE tasks t
SET workspace_id = (
    SELECT wm.workspace_id
    FROM workspace_members wm
    WHERE wm.user_id = t.created_by
    ORDER BY wm.joined_at ASC
    LIMIT 1
)
WHERE t.workspace_id IS NULL
AND t.created_by IS NOT NULL;

-- Log how many tasks were updated
DO $$
DECLARE
    updated_count INTEGER;
BEGIN
    GET DIAGNOSTICS updated_count = ROW_COUNT;
    RAISE NOTICE 'Assigned % tasks to workspaces', updated_count;
END $$;

-- ============================================================================
-- STEP 4: HANDLE EDGE CASES - DATA WITH NULL CREATED_BY
-- ============================================================================
-- If there's any data with NULL created_by, we need to handle it
-- Option 1: Delete orphaned data (uncomment if desired)
-- Option 2: Assign to a default workspace (we'll skip and report)

DO $$
DECLARE
    orphan_categories INTEGER;
    orphan_tasks INTEGER;
BEGIN
    SELECT COUNT(*) INTO orphan_categories FROM categories WHERE workspace_id IS NULL;
    SELECT COUNT(*) INTO orphan_tasks FROM tasks WHERE workspace_id IS NULL;

    IF orphan_categories > 0 OR orphan_tasks > 0 THEN
        RAISE WARNING 'Found % categories and % tasks still without workspace_id (likely NULL created_by)',
            orphan_categories, orphan_tasks;
        RAISE WARNING 'These need manual attention before adding NOT NULL constraints';
    END IF;
END $$;

-- ============================================================================
-- STEP 5: VERIFY MIGRATION COMPLETED
-- ============================================================================
-- Check that no orphaned data remains

DO $$
DECLARE
    remaining_orphans INTEGER;
BEGIN
    SELECT COUNT(*) INTO remaining_orphans
    FROM data_needing_workspace_assignment;

    IF remaining_orphans = 0 THEN
        RAISE NOTICE 'SUCCESS: All data has been assigned to workspaces';
    ELSE
        RAISE EXCEPTION 'MIGRATION INCOMPLETE: % records still need workspace assignment. Run SELECT * FROM data_needing_workspace_assignment; to investigate.', remaining_orphans;
    END IF;
END $$;

-- ============================================================================
-- STEP 6: ADD NOT NULL CONSTRAINTS
-- ============================================================================
-- Now that all data has workspace_id, add the NOT NULL constraints

ALTER TABLE categories ALTER COLUMN workspace_id SET NOT NULL;
ALTER TABLE tasks ALTER COLUMN workspace_id SET NOT NULL;

-- ============================================================================
-- STEP 7: CLEANUP - DROP MIGRATION HELPER OBJECTS
-- ============================================================================

-- Drop the migration helper view
DROP VIEW IF EXISTS data_needing_workspace_assignment;

-- Drop the insert enforcement triggers (NOT NULL constraint handles this now)
DROP TRIGGER IF EXISTS enforce_categories_workspace_id ON categories;
DROP TRIGGER IF EXISTS enforce_tasks_workspace_id ON tasks;
DROP FUNCTION IF EXISTS enforce_workspace_id_on_insert();

-- ============================================================================
-- STEP 8: UPDATE RLS POLICIES - REMOVE NULL CHECKS
-- ============================================================================
-- Now that workspace_id is NOT NULL, we can remove the legacy NULL checks

-- Categories SELECT policy
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

-- Tasks SELECT policy
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
-- VERIFICATION QUERIES (Run manually after migration)
-- ============================================================================
--
-- 1. Check that all categories have workspace_id:
--    SELECT COUNT(*) FROM categories WHERE workspace_id IS NULL;
--    -- Should return 0
--
-- 2. Check that all tasks have workspace_id:
--    SELECT COUNT(*) FROM tasks WHERE workspace_id IS NULL;
--    -- Should return 0
--
-- 3. Verify NOT NULL constraints are in place:
--    \d categories
--    \d tasks
--
-- 4. Test that RLS is working:
--    SELECT * FROM categories;  -- Should only show workspace data
--    SELECT * FROM tasks;       -- Should only show workspace data
--
-- ============================================================================

-- ============================================================================
-- ROLLBACK INSTRUCTIONS (Manual - use with caution)
-- ============================================================================
--
-- To rollback this migration (NOT RECOMMENDED in production):
--
-- 1. Remove NOT NULL constraints:
--    ALTER TABLE categories ALTER COLUMN workspace_id DROP NOT NULL;
--    ALTER TABLE tasks ALTER COLUMN workspace_id DROP NOT NULL;
--
-- 2. Recreate the migration helper view:
--    CREATE VIEW data_needing_workspace_assignment AS
--    SELECT 'categories' AS table_name, id, created_by, NULL::INTEGER AS category_id
--    FROM categories WHERE workspace_id IS NULL
--    UNION ALL
--    SELECT 'tasks' AS table_name, id, created_by, category_id
--    FROM tasks WHERE workspace_id IS NULL;
--
-- 3. Recreate the enforcement triggers if needed
--
-- Note: The workspace assignments themselves are NOT rolled back.
-- Data will remain associated with workspaces.
--
-- ============================================================================

-- ============================================================================
-- END OF MIGRATION
-- ============================================================================
