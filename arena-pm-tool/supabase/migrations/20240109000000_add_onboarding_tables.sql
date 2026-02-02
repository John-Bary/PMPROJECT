-- Todorio - Onboarding Tables
-- Migration: 20240109000000_add_onboarding_tables.sql
-- Description: Adds workspace onboarding progress table and onboarding_completed_at
--              column to workspace_members for the invited-user onboarding flow.

-- ============================================================================
-- ADD onboarding_completed_at TO workspace_members
-- ============================================================================
ALTER TABLE workspace_members
  ADD COLUMN IF NOT EXISTS onboarding_completed_at TIMESTAMPTZ;

-- ============================================================================
-- WORKSPACE ONBOARDING PROGRESS TABLE
-- ============================================================================
CREATE TABLE IF NOT EXISTS workspace_onboarding_progress (
    id SERIAL PRIMARY KEY,
    workspace_id UUID NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
    user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    current_step INTEGER DEFAULT 1,
    steps_completed JSONB DEFAULT '[]'::jsonb,
    profile_updated BOOLEAN DEFAULT false,
    skipped_at TIMESTAMPTZ,
    completed_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    CONSTRAINT unique_onboarding_per_member UNIQUE (workspace_id, user_id)
);

CREATE INDEX IF NOT EXISTS idx_onboarding_workspace_id ON workspace_onboarding_progress(workspace_id);
CREATE INDEX IF NOT EXISTS idx_onboarding_user_id ON workspace_onboarding_progress(user_id);

-- Trigger to auto-update updated_at
CREATE OR REPLACE FUNCTION update_onboarding_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS update_onboarding_progress_updated_at ON workspace_onboarding_progress;
CREATE TRIGGER update_onboarding_progress_updated_at
    BEFORE UPDATE ON workspace_onboarding_progress
    FOR EACH ROW
    EXECUTE FUNCTION update_onboarding_updated_at();
