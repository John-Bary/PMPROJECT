-- Todorio - Workspace Onboarding Progress Table
-- Migration: 20240109000000_add_onboarding_progress_table.sql
-- Description: Creates workspace_onboarding_progress table for tracking new member onboarding

-- ============================================================================
-- WORKSPACE_ONBOARDING_PROGRESS TABLE
-- ============================================================================
-- Tracks onboarding progress for new workspace members

CREATE TABLE IF NOT EXISTS workspace_onboarding_progress (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    workspace_id UUID NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    current_step INTEGER DEFAULT 1,
    steps_completed JSONB DEFAULT '[]'::jsonb,
    profile_updated BOOLEAN DEFAULT false,
    skipped_at TIMESTAMPTZ,
    completed_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    CONSTRAINT unique_onboarding_per_member UNIQUE (workspace_id, user_id)
);

-- Indexes for efficient lookups
CREATE INDEX IF NOT EXISTS idx_onboarding_workspace_id ON workspace_onboarding_progress(workspace_id);
CREATE INDEX IF NOT EXISTS idx_onboarding_user_id ON workspace_onboarding_progress(user_id);

-- ============================================================================
-- ADD ONBOARDING COLUMN TO WORKSPACE_MEMBERS
-- ============================================================================

ALTER TABLE workspace_members
    ADD COLUMN IF NOT EXISTS onboarding_completed_at TIMESTAMPTZ;

-- ============================================================================
-- ROW LEVEL SECURITY
-- ============================================================================

ALTER TABLE workspace_onboarding_progress ENABLE ROW LEVEL SECURITY;

-- Users can view their own onboarding progress
CREATE POLICY "onboarding_select_own"
    ON workspace_onboarding_progress FOR SELECT
    USING (user_id = auth.uid());

-- Users can insert their own onboarding progress
CREATE POLICY "onboarding_insert_own"
    ON workspace_onboarding_progress FOR INSERT
    WITH CHECK (user_id = auth.uid());

-- Users can update their own onboarding progress
CREATE POLICY "onboarding_update_own"
    ON workspace_onboarding_progress FOR UPDATE
    USING (user_id = auth.uid());

-- Workspace admins can view all onboarding progress in their workspace
CREATE POLICY "onboarding_select_admin"
    ON workspace_onboarding_progress FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM workspace_members
            WHERE workspace_members.workspace_id = workspace_onboarding_progress.workspace_id
            AND workspace_members.user_id = auth.uid()
            AND workspace_members.role = 'admin'
        )
    );

-- ============================================================================
-- GRANTS
-- ============================================================================

GRANT SELECT, INSERT, UPDATE ON workspace_onboarding_progress TO authenticated;

-- ============================================================================
-- END OF MIGRATION
-- ============================================================================
