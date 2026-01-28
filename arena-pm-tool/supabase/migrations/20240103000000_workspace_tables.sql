-- Todorio - Workspace Tables
-- Migration: 20240103000000_workspace_tables.sql
-- Description: Creates workspace, membership, and invitation tables for multi-workspace support

-- ============================================================================
-- WORKSPACES TABLE
-- ============================================================================
-- Represents a workspace/organization that users can belong to
CREATE TABLE IF NOT EXISTS workspaces (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    owner_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Index for owner lookups
CREATE INDEX IF NOT EXISTS idx_workspaces_owner_id ON workspaces(owner_id);

-- ============================================================================
-- WORKSPACE_MEMBERS TABLE
-- ============================================================================
-- Tracks which users belong to which workspaces and their roles
CREATE TABLE IF NOT EXISTS workspace_members (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    workspace_id UUID NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    role TEXT NOT NULL DEFAULT 'member' CHECK (role IN ('admin', 'member', 'viewer')),
    joined_at TIMESTAMPTZ DEFAULT NOW(),
    CONSTRAINT unique_workspace_member UNIQUE (workspace_id, user_id)
);

-- Indexes for efficient lookups
CREATE INDEX IF NOT EXISTS idx_workspace_members_workspace_id ON workspace_members(workspace_id);
CREATE INDEX IF NOT EXISTS idx_workspace_members_user_id ON workspace_members(user_id);

-- ============================================================================
-- WORKSPACE_INVITATIONS TABLE
-- ============================================================================
-- Tracks pending invitations to join workspaces
CREATE TABLE IF NOT EXISTS workspace_invitations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    workspace_id UUID NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
    email TEXT NOT NULL,
    role TEXT NOT NULL DEFAULT 'member' CHECK (role IN ('admin', 'member', 'viewer')),
    invited_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    token TEXT UNIQUE NOT NULL DEFAULT encode(gen_random_bytes(32), 'hex'),
    expires_at TIMESTAMPTZ DEFAULT NOW() + INTERVAL '7 days',
    accepted_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes for invitation lookups
CREATE INDEX IF NOT EXISTS idx_workspace_invitations_workspace_id ON workspace_invitations(workspace_id);
CREATE INDEX IF NOT EXISTS idx_workspace_invitations_email ON workspace_invitations(email);
CREATE INDEX IF NOT EXISTS idx_workspace_invitations_token ON workspace_invitations(token);

-- ============================================================================
-- ROW LEVEL SECURITY
-- ============================================================================

-- Enable RLS on all workspace tables
ALTER TABLE workspaces ENABLE ROW LEVEL SECURITY;
ALTER TABLE workspace_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE workspace_invitations ENABLE ROW LEVEL SECURITY;

-- ============================================================================
-- WORKSPACES POLICIES
-- ============================================================================

-- Users can view workspaces they are members of
CREATE POLICY "workspaces_select_members"
    ON workspaces FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM workspace_members
            WHERE workspace_members.workspace_id = workspaces.id
            AND workspace_members.user_id = auth.uid()
        )
        OR owner_id = auth.uid()
    );

-- Authenticated users can create workspaces
CREATE POLICY "workspaces_insert_authenticated"
    ON workspaces FOR INSERT
    WITH CHECK (auth.uid() IS NOT NULL AND owner_id = auth.uid());

-- Only workspace owner or admin can update workspace
CREATE POLICY "workspaces_update_owner_admin"
    ON workspaces FOR UPDATE
    USING (
        owner_id = auth.uid()
        OR EXISTS (
            SELECT 1 FROM workspace_members
            WHERE workspace_members.workspace_id = workspaces.id
            AND workspace_members.user_id = auth.uid()
            AND workspace_members.role = 'admin'
        )
    );

-- Only workspace owner can delete workspace
CREATE POLICY "workspaces_delete_owner"
    ON workspaces FOR DELETE
    USING (owner_id = auth.uid());

-- ============================================================================
-- WORKSPACE_MEMBERS POLICIES
-- ============================================================================

-- Members can view other members of their workspaces
CREATE POLICY "workspace_members_select"
    ON workspace_members FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM workspace_members AS wm
            WHERE wm.workspace_id = workspace_members.workspace_id
            AND wm.user_id = auth.uid()
        )
    );

-- Workspace owner or admin can add members
CREATE POLICY "workspace_members_insert"
    ON workspace_members FOR INSERT
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM workspaces
            WHERE workspaces.id = workspace_members.workspace_id
            AND workspaces.owner_id = auth.uid()
        )
        OR EXISTS (
            SELECT 1 FROM workspace_members AS wm
            WHERE wm.workspace_id = workspace_members.workspace_id
            AND wm.user_id = auth.uid()
            AND wm.role = 'admin'
        )
    );

-- Workspace owner or admin can update member roles
CREATE POLICY "workspace_members_update"
    ON workspace_members FOR UPDATE
    USING (
        EXISTS (
            SELECT 1 FROM workspaces
            WHERE workspaces.id = workspace_members.workspace_id
            AND workspaces.owner_id = auth.uid()
        )
        OR EXISTS (
            SELECT 1 FROM workspace_members AS wm
            WHERE wm.workspace_id = workspace_members.workspace_id
            AND wm.user_id = auth.uid()
            AND wm.role = 'admin'
        )
    );

-- Workspace owner or admin can remove members, or members can remove themselves
CREATE POLICY "workspace_members_delete"
    ON workspace_members FOR DELETE
    USING (
        user_id = auth.uid()
        OR EXISTS (
            SELECT 1 FROM workspaces
            WHERE workspaces.id = workspace_members.workspace_id
            AND workspaces.owner_id = auth.uid()
        )
        OR EXISTS (
            SELECT 1 FROM workspace_members AS wm
            WHERE wm.workspace_id = workspace_members.workspace_id
            AND wm.user_id = auth.uid()
            AND wm.role = 'admin'
        )
    );

-- ============================================================================
-- WORKSPACE_INVITATIONS POLICIES
-- ============================================================================

-- Workspace members can view invitations for their workspaces
CREATE POLICY "workspace_invitations_select"
    ON workspace_invitations FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM workspace_members
            WHERE workspace_members.workspace_id = workspace_invitations.workspace_id
            AND workspace_members.user_id = auth.uid()
        )
        OR email = (SELECT email FROM auth.users WHERE id = auth.uid())
    );

-- Workspace owner or admin can create invitations
CREATE POLICY "workspace_invitations_insert"
    ON workspace_invitations FOR INSERT
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM workspaces
            WHERE workspaces.id = workspace_invitations.workspace_id
            AND workspaces.owner_id = auth.uid()
        )
        OR EXISTS (
            SELECT 1 FROM workspace_members
            WHERE workspace_members.workspace_id = workspace_invitations.workspace_id
            AND workspace_members.user_id = auth.uid()
            AND workspace_members.role = 'admin'
        )
    );

-- Workspace owner or admin can update invitations
CREATE POLICY "workspace_invitations_update"
    ON workspace_invitations FOR UPDATE
    USING (
        EXISTS (
            SELECT 1 FROM workspaces
            WHERE workspaces.id = workspace_invitations.workspace_id
            AND workspaces.owner_id = auth.uid()
        )
        OR EXISTS (
            SELECT 1 FROM workspace_members
            WHERE workspace_members.workspace_id = workspace_invitations.workspace_id
            AND workspace_members.user_id = auth.uid()
            AND workspace_members.role = 'admin'
        )
        OR email = (SELECT email FROM auth.users WHERE id = auth.uid())
    );

-- Workspace owner or admin can delete invitations
CREATE POLICY "workspace_invitations_delete"
    ON workspace_invitations FOR DELETE
    USING (
        EXISTS (
            SELECT 1 FROM workspaces
            WHERE workspaces.id = workspace_invitations.workspace_id
            AND workspaces.owner_id = auth.uid()
        )
        OR EXISTS (
            SELECT 1 FROM workspace_members
            WHERE workspace_members.workspace_id = workspace_invitations.workspace_id
            AND workspace_members.user_id = auth.uid()
            AND workspace_members.role = 'admin'
        )
    );

-- ============================================================================
-- GRANTS FOR AUTHENTICATED USERS
-- ============================================================================

GRANT SELECT, INSERT, UPDATE, DELETE ON workspaces TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON workspace_members TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON workspace_invitations TO authenticated;

-- ============================================================================
-- END OF MIGRATION
-- ============================================================================
