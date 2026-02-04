-- Todoria - Add Onboarding Tables
-- Migration: 20240109000000_add_onboarding_tables.sql
-- Description: Creates workspace_onboarding_progress table and adds
--              onboarding_completed_at column to workspace_members

-- ============================================================================
-- ADD onboarding_completed_at TO workspace_members
-- ============================================================================

ALTER TABLE workspace_members
    ADD COLUMN IF NOT EXISTS onboarding_completed_at TIMESTAMP WITH TIME ZONE;

-- ============================================================================
-- WORKSPACE ONBOARDING PROGRESS TABLE
-- ============================================================================

CREATE TABLE IF NOT EXISTS workspace_onboarding_progress (
    id SERIAL PRIMARY KEY,
    workspace_id UUID NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
    user_id INTEGER NOT NULL,  -- No FK constraint to avoid type mismatch with production
    current_step INTEGER DEFAULT 1,
    steps_completed JSONB DEFAULT '[]'::jsonb,
    profile_updated BOOLEAN DEFAULT false,
    skipped_at TIMESTAMP WITH TIME ZONE,
    completed_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT unique_onboarding_per_member UNIQUE (workspace_id, user_id)
);

CREATE INDEX IF NOT EXISTS idx_onboarding_workspace_id
    ON workspace_onboarding_progress(workspace_id);

CREATE INDEX IF NOT EXISTS idx_onboarding_user_id
    ON workspace_onboarding_progress(user_id);

-- ============================================================================
-- NOTE: No trigger for updated_at — the controller sets it explicitly.
-- The update_updated_at_column() function may not exist in production.
-- ============================================================================
