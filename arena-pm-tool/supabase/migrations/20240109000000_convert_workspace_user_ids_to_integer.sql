-- Arena PM Tool - Convert Workspace User ID Columns to Integer
-- Migration: 20240109000000_convert_workspace_user_ids_to_integer.sql
-- Description: Align workspace foreign keys with integer users.id (Express auth)

-- ==========================================================================
-- DROP EXISTING FOREIGN KEYS (UUID-based)
-- ==========================================================================

ALTER TABLE workspaces
    DROP CONSTRAINT IF EXISTS workspaces_owner_id_fkey;

ALTER TABLE workspace_members
    DROP CONSTRAINT IF EXISTS workspace_members_user_id_fkey;

ALTER TABLE workspace_invitations
    DROP CONSTRAINT IF EXISTS workspace_invitations_invited_by_fkey;

-- ==========================================================================
-- ALTER COLUMN TYPES TO INTEGER
-- ==========================================================================

ALTER TABLE workspaces
    ALTER COLUMN owner_id TYPE INTEGER
    USING owner_id::text::INTEGER;

ALTER TABLE workspace_members
    ALTER COLUMN user_id TYPE INTEGER
    USING user_id::text::INTEGER;

ALTER TABLE workspace_invitations
    ALTER COLUMN invited_by TYPE INTEGER
    USING invited_by::text::INTEGER;

-- ==========================================================================
-- RECREATE FOREIGN KEYS TO users(id)
-- ==========================================================================

ALTER TABLE workspaces
    ADD CONSTRAINT workspaces_owner_id_fkey
    FOREIGN KEY (owner_id) REFERENCES users(id) ON DELETE SET NULL;

ALTER TABLE workspace_members
    ADD CONSTRAINT workspace_members_user_id_fkey
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE;

ALTER TABLE workspace_invitations
    ADD CONSTRAINT workspace_invitations_invited_by_fkey
    FOREIGN KEY (invited_by) REFERENCES users(id) ON DELETE SET NULL;

-- ==========================================================================
-- END OF MIGRATION
-- ==========================================================================
