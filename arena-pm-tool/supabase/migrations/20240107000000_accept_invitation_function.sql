-- Todorio - Accept Invitation RPC Function
-- Migration: 20240107000000_accept_invitation_function.sql
-- Description: Creates an RPC function to accept workspace invitations

-- ============================================================================
-- FUNCTION: accept_invitation
-- ============================================================================
-- Accepts a workspace invitation using the provided token.
-- Adds the current user to the workspace and marks the invitation as accepted.
--
-- Input: invitation_token (TEXT) - The unique invitation token
-- Output: JSON object with success status and workspace_id or error message
--
-- SECURITY DEFINER: Runs with elevated privileges to insert into workspace_members

CREATE OR REPLACE FUNCTION accept_invitation(invitation_token TEXT)
RETURNS JSON AS $$
DECLARE
    invitation_record RECORD;
    current_user_id UUID;
    current_user_email TEXT;
    result JSON;
BEGIN
    -- Get current user info
    current_user_id := auth.uid();

    IF current_user_id IS NULL THEN
        RETURN json_build_object(
            'success', false,
            'error', 'You must be logged in to accept an invitation'
        );
    END IF;

    -- Get current user's email
    SELECT email INTO current_user_email
    FROM auth.users
    WHERE id = current_user_id;

    -- Find valid invitation by token
    SELECT
        wi.id,
        wi.workspace_id,
        wi.email,
        wi.role,
        wi.expires_at,
        wi.accepted_at
    INTO invitation_record
    FROM workspace_invitations wi
    WHERE wi.token = invitation_token;

    -- Check if invitation exists
    IF invitation_record IS NULL THEN
        RETURN json_build_object(
            'success', false,
            'error', 'Invalid or expired invitation'
        );
    END IF;

    -- Check if invitation was already accepted
    IF invitation_record.accepted_at IS NOT NULL THEN
        RETURN json_build_object(
            'success', false,
            'error', 'This invitation has already been accepted'
        );
    END IF;

    -- Check if invitation has expired
    IF invitation_record.expires_at < NOW() THEN
        RETURN json_build_object(
            'success', false,
            'error', 'This invitation has expired'
        );
    END IF;

    -- Check if the invitation email matches the current user's email
    IF LOWER(invitation_record.email) != LOWER(current_user_email) THEN
        RETURN json_build_object(
            'success', false,
            'error', 'This invitation was sent to a different email address'
        );
    END IF;

    -- Check if user is already a member of this workspace
    IF EXISTS (
        SELECT 1 FROM workspace_members
        WHERE workspace_id = invitation_record.workspace_id
        AND user_id = current_user_id
    ) THEN
        -- User is already a member, just mark invitation as accepted
        UPDATE workspace_invitations
        SET accepted_at = NOW()
        WHERE id = invitation_record.id;

        RETURN json_build_object(
            'success', true,
            'workspace_id', invitation_record.workspace_id,
            'message', 'You are already a member of this workspace'
        );
    END IF;

    -- Add user to workspace_members
    INSERT INTO workspace_members (workspace_id, user_id, role, joined_at)
    VALUES (invitation_record.workspace_id, current_user_id, invitation_record.role, NOW());

    -- Mark invitation as accepted
    UPDATE workspace_invitations
    SET accepted_at = NOW()
    WHERE id = invitation_record.id;

    -- Return success
    RETURN json_build_object(
        'success', true,
        'workspace_id', invitation_record.workspace_id
    );

EXCEPTION
    WHEN unique_violation THEN
        -- Handle race condition where user was added by another process
        RETURN json_build_object(
            'success', false,
            'error', 'You are already a member of this workspace'
        );
    WHEN OTHERS THEN
        RETURN json_build_object(
            'success', false,
            'error', 'An unexpected error occurred'
        );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Set search path for security
ALTER FUNCTION accept_invitation(TEXT) SET search_path = public;

-- ============================================================================
-- GRANT EXECUTE PERMISSION
-- ============================================================================

GRANT EXECUTE ON FUNCTION accept_invitation(TEXT) TO authenticated;

-- ============================================================================
-- USAGE EXAMPLE
-- ============================================================================
-- From the client:
--
-- const { data, error } = await supabase.rpc('accept_invitation', {
--   invitation_token: 'abc123...'
-- });
--
-- if (data.success) {
--   console.log('Joined workspace:', data.workspace_id);
-- } else {
--   console.error('Error:', data.error);
-- }
--
-- ============================================================================

-- ============================================================================
-- END OF MIGRATION
-- ============================================================================
