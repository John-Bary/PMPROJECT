-- Arena PM Tool - Auto-Create Workspace on User Signup
-- Migration: 20240105000000_auto_create_workspace_on_signup.sql
-- Description: Creates a trigger to automatically create a personal workspace when a new user signs up

-- ============================================================================
-- FUNCTION: Create Default Workspace for New User
-- ============================================================================
-- This function runs after a new user is inserted into auth.users.
-- It creates a personal workspace and adds the user as an admin.
--
-- SECURITY DEFINER: Runs with the privileges of the function owner (postgres)
-- to allow inserting into workspaces and workspace_members tables.

CREATE OR REPLACE FUNCTION public.handle_new_user_workspace()
RETURNS TRIGGER AS $$
DECLARE
    workspace_name TEXT;
    new_workspace_id UUID;
    username TEXT;
BEGIN
    -- Extract username from email (everything before @)
    username := split_part(NEW.email, '@', 1);

    -- Create workspace name
    workspace_name := username || '''s Workspace';

    -- Create the new workspace
    INSERT INTO public.workspaces (name, owner_id, created_at)
    VALUES (workspace_name, NEW.id, NOW())
    RETURNING id INTO new_workspace_id;

    -- Add user as admin member of the workspace
    INSERT INTO public.workspace_members (workspace_id, user_id, role, joined_at)
    VALUES (new_workspace_id, NEW.id, 'admin', NOW());

    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Set the search path for security (prevents search_path attacks)
ALTER FUNCTION public.handle_new_user_workspace() SET search_path = public;

-- ============================================================================
-- TRIGGER: Run After New User Signup
-- ============================================================================
-- This trigger fires after a new row is inserted into auth.users

DROP TRIGGER IF EXISTS on_auth_user_created_create_workspace ON auth.users;

CREATE TRIGGER on_auth_user_created_create_workspace
    AFTER INSERT ON auth.users
    FOR EACH ROW
    EXECUTE FUNCTION public.handle_new_user_workspace();

-- ============================================================================
-- GRANT EXECUTE PERMISSION
-- ============================================================================
-- Allow the trigger to be executed by the auth system

GRANT EXECUTE ON FUNCTION public.handle_new_user_workspace() TO supabase_auth_admin;

-- ============================================================================
-- END OF MIGRATION
-- ============================================================================
