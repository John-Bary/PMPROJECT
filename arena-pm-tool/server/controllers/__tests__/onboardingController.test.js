const {
  getOnboardingStatus,
  startOnboarding,
  updateProgress,
  completeOnboarding,
  skipOnboarding,
  ONBOARDING_STEPS,
  TOTAL_STEPS,
} = require('../onboardingController');

// Mock dependencies
jest.mock('../../config/database');
jest.mock('../../lib/logger', () => ({
  info: jest.fn(),
  error: jest.fn(),
  warn: jest.fn(),
}));

const { query, getClient } = require('../../config/database');

describe('Onboarding Controller', () => {
  let req, res;
  let mockClient;

  const WORKSPACE_ID = 'ws-uuid-123';
  const USER_ID = 1;

  beforeEach(() => {
    req = createMockReq();
    res = createMockRes();
    req.user = { id: USER_ID };
    req.params = { id: WORKSPACE_ID };
    jest.clearAllMocks();

    mockClient = {
      query: jest.fn(),
      release: jest.fn(),
    };
    getClient.mockResolvedValue(mockClient);
  });

  // -------------------------------------------------------------------
  // getOnboardingStatus
  // -------------------------------------------------------------------
  describe('getOnboardingStatus', () => {
    it('should return full onboarding status for a workspace member', async () => {
      // 1. membership query
      query.mockResolvedValueOnce({ rows: [{ role: 'member', onboarding_completed_at: null, joined_at: new Date() }] });
      // 2. upsert onboarding progress (INSERT ... ON CONFLICT DO NOTHING)
      query.mockResolvedValueOnce({ rows: [] });
      // 3. workspace info
      query.mockResolvedValueOnce({ rows: [{ name: 'Test Workspace', owner_id: 2, owner_name: 'Owner' }] });
      // 4. invitation info
      query.mockResolvedValueOnce({ rows: [{ invited_role: 'member', inviter_name: 'Owner', inviter_email: 'owner@test.com' }] });
      // 5. onboarding progress SELECT
      query.mockResolvedValueOnce({ rows: [{ current_step: 2, steps_completed: ['welcome'], completed_at: null, skipped_at: null }] });
      // 6. user profile
      query.mockResolvedValueOnce({ rows: [{ id: USER_ID, name: 'Test User', first_name: 'Test', last_name: 'User', email: 'test@test.com', avatar_url: null, avatar_color: '#abc' }] });
      // 7. workspace members
      query.mockResolvedValueOnce({ rows: [{ id: USER_ID, name: 'Test User', avatar_url: null, avatar_color: '#abc', role: 'member' }] });
      // 8. workspace stats
      query.mockResolvedValueOnce({ rows: [{ member_count: '3', category_count: '2', task_count: '10' }] });

      await getOnboardingStatus(req, res);

      expect(res.json).toHaveBeenCalledWith(expect.objectContaining({
        status: 'success',
        data: expect.objectContaining({
          onboarding: expect.objectContaining({
            isCompleted: false,
            isSkipped: false,
            currentStep: 2,
            stepsCompleted: ['welcome'],
            totalSteps: TOTAL_STEPS,
            steps: ONBOARDING_STEPS,
          }),
          workspace: expect.objectContaining({
            id: WORKSPACE_ID,
            name: 'Test Workspace',
            memberCount: 3,
            categoryCount: 2,
            taskCount: 10,
          }),
          invitation: expect.objectContaining({
            inviterName: 'Owner',
          }),
          userRole: 'member',
        }),
      }));
    });

    it('should return 403 if user is not a workspace member', async () => {
      query.mockResolvedValueOnce({ rows: [] });

      await getOnboardingStatus(req, res);

      expect(res.status).toHaveBeenCalledWith(403);
      expect(res.json).toHaveBeenCalledWith(expect.objectContaining({
        status: 'error',
        message: 'You are not a member of this workspace',
      }));
    });

    it('should return 404 if workspace not found', async () => {
      // membership query succeeds
      query.mockResolvedValueOnce({ rows: [{ role: 'member', onboarding_completed_at: null, joined_at: new Date() }] });
      // upsert onboarding progress
      query.mockResolvedValueOnce({ rows: [] });
      // workspace query returns empty
      query.mockResolvedValueOnce({ rows: [] });

      await getOnboardingStatus(req, res);

      expect(res.status).toHaveBeenCalledWith(404);
      expect(res.json).toHaveBeenCalledWith(expect.objectContaining({
        message: 'Workspace not found',
      }));
    });

    it('should fall back gracefully when onboarding_completed_at column does not exist', async () => {
      // First membership query fails because of missing column
      query.mockRejectedValueOnce(new Error('column "onboarding_completed_at" does not exist'));
      // Fallback membership query without that column
      query.mockResolvedValueOnce({ rows: [{ role: 'admin', joined_at: new Date() }] });
      // upsert onboarding progress
      query.mockResolvedValueOnce({ rows: [] });
      // workspace info
      query.mockResolvedValueOnce({ rows: [{ name: 'WS', owner_id: 2, owner_name: 'Owner' }] });
      // invitation info
      query.mockResolvedValueOnce({ rows: [] });
      // onboarding progress SELECT
      query.mockResolvedValueOnce({ rows: [] });
      // user profile
      query.mockResolvedValueOnce({ rows: [{ id: USER_ID, name: 'Test', first_name: null, last_name: null, email: 'a@b.c', avatar_url: null, avatar_color: '#000' }] });
      // workspace members
      query.mockResolvedValueOnce({ rows: [] });
      // workspace stats
      query.mockResolvedValueOnce({ rows: [{ member_count: '1', category_count: '0', task_count: '0' }] });

      await getOnboardingStatus(req, res);

      expect(res.json).toHaveBeenCalledWith(expect.objectContaining({
        status: 'success',
        data: expect.objectContaining({
          onboarding: expect.objectContaining({
            isCompleted: false,
          }),
        }),
      }));
    });

    it('should handle onboarding progress table not existing', async () => {
      // membership query
      query.mockResolvedValueOnce({ rows: [{ role: 'member', onboarding_completed_at: null, joined_at: new Date() }] });
      // upsert fails because table does not exist
      query.mockRejectedValueOnce(new Error('relation "workspace_onboarding_progress" does not exist'));
      // workspace info
      query.mockResolvedValueOnce({ rows: [{ name: 'WS', owner_id: 2, owner_name: 'Owner' }] });
      // invitation info
      query.mockResolvedValueOnce({ rows: [] });
      // skips onboarding progress SELECT because onboardingTableExists is false
      // user profile
      query.mockResolvedValueOnce({ rows: [{ id: USER_ID, name: 'Test', first_name: null, last_name: null, email: 'a@b.c', avatar_url: null, avatar_color: '#000' }] });
      // workspace members
      query.mockResolvedValueOnce({ rows: [] });
      // workspace stats
      query.mockResolvedValueOnce({ rows: [{ member_count: '1', category_count: '0', task_count: '0' }] });

      await getOnboardingStatus(req, res);

      expect(res.json).toHaveBeenCalledWith(expect.objectContaining({
        status: 'success',
        data: expect.objectContaining({
          onboarding: expect.objectContaining({
            currentStep: 1,
            stepsCompleted: [],
          }),
        }),
      }));
    });

    it('should return 500 on unexpected database error', async () => {
      query.mockRejectedValueOnce(new Error('connection refused'));

      await getOnboardingStatus(req, res);

      expect(res.status).toHaveBeenCalledWith(500);
      expect(res.json).toHaveBeenCalledWith(expect.objectContaining({
        status: 'error',
        message: 'Error fetching onboarding status',
      }));
    });

    it('should re-throw membership query errors unrelated to onboarding_completed_at', async () => {
      // First membership query fails with a non-column error
      query.mockRejectedValueOnce(new Error('connection timeout'));

      await getOnboardingStatus(req, res);

      // Should fall into the outer catch and return 500
      expect(res.status).toHaveBeenCalledWith(500);
      expect(res.json).toHaveBeenCalledWith(expect.objectContaining({
        status: 'error',
        message: 'Error fetching onboarding status',
      }));
    });

    it('should handle invitation query failure gracefully (line 99)', async () => {
      // 1. membership query
      query.mockResolvedValueOnce({ rows: [{ role: 'member', onboarding_completed_at: null, joined_at: new Date() }] });
      // 2. upsert onboarding progress
      query.mockResolvedValueOnce({ rows: [] });
      // 3. workspace info
      query.mockResolvedValueOnce({ rows: [{ name: 'Test Workspace', owner_id: 2, owner_name: 'Owner' }] });
      // 4. invitation info query FAILS
      query.mockRejectedValueOnce(new Error('relation "workspace_invitations" does not exist'));
      // 5. onboarding progress SELECT
      query.mockResolvedValueOnce({ rows: [{ current_step: 1, steps_completed: [], completed_at: null, skipped_at: null }] });
      // 6. user profile
      query.mockResolvedValueOnce({ rows: [{ id: USER_ID, name: 'Test', first_name: null, last_name: null, email: 'a@b.c', avatar_url: null, avatar_color: '#000' }] });
      // 7. workspace members
      query.mockResolvedValueOnce({ rows: [] });
      // 8. workspace stats
      query.mockResolvedValueOnce({ rows: [{ member_count: '1', category_count: '0', task_count: '0' }] });

      await getOnboardingStatus(req, res);

      expect(res.json).toHaveBeenCalledWith(expect.objectContaining({
        status: 'success',
        data: expect.objectContaining({
          invitation: null,
        }),
      }));
    });

    it('should handle onboarding progress SELECT failure gracefully (line 112)', async () => {
      // 1. membership query
      query.mockResolvedValueOnce({ rows: [{ role: 'member', onboarding_completed_at: null, joined_at: new Date() }] });
      // 2. upsert onboarding progress (succeeds, so onboardingTableExists = true)
      query.mockResolvedValueOnce({ rows: [] });
      // 3. workspace info
      query.mockResolvedValueOnce({ rows: [{ name: 'Test Workspace', owner_id: 2, owner_name: 'Owner' }] });
      // 4. invitation info
      query.mockResolvedValueOnce({ rows: [] });
      // 5. onboarding progress SELECT FAILS
      query.mockRejectedValueOnce(new Error('something went wrong reading progress'));
      // 6. user profile
      query.mockResolvedValueOnce({ rows: [{ id: USER_ID, name: 'Test', first_name: null, last_name: null, email: 'a@b.c', avatar_url: null, avatar_color: '#000' }] });
      // 7. workspace members
      query.mockResolvedValueOnce({ rows: [] });
      // 8. workspace stats
      query.mockResolvedValueOnce({ rows: [{ member_count: '1', category_count: '0', task_count: '0' }] });

      await getOnboardingStatus(req, res);

      expect(res.json).toHaveBeenCalledWith(expect.objectContaining({
        status: 'success',
        data: expect.objectContaining({
          onboarding: expect.objectContaining({
            currentStep: 1,
            stepsCompleted: [],
          }),
        }),
      }));
    });

    it('should handle user profile query failure with fallback (lines 126-131)', async () => {
      // 1. membership query
      query.mockResolvedValueOnce({ rows: [{ role: 'member', onboarding_completed_at: null, joined_at: new Date() }] });
      // 2. upsert onboarding progress
      query.mockResolvedValueOnce({ rows: [] });
      // 3. workspace info
      query.mockResolvedValueOnce({ rows: [{ name: 'Test Workspace', owner_id: 2, owner_name: 'Owner' }] });
      // 4. invitation info
      query.mockResolvedValueOnce({ rows: [] });
      // 5. onboarding progress SELECT
      query.mockResolvedValueOnce({ rows: [] });
      // 6. user profile query FAILS (e.g. first_name column missing)
      query.mockRejectedValueOnce(new Error('column "first_name" does not exist'));
      // 7. user profile FALLBACK succeeds
      query.mockResolvedValueOnce({ rows: [{ id: USER_ID, name: 'Test', email: 'a@b.c', avatar_color: '#000' }] });
      // 8. workspace members
      query.mockResolvedValueOnce({ rows: [] });
      // 9. workspace stats
      query.mockResolvedValueOnce({ rows: [{ member_count: '1', category_count: '0', task_count: '0' }] });

      await getOnboardingStatus(req, res);

      expect(res.json).toHaveBeenCalledWith(expect.objectContaining({
        status: 'success',
        data: expect.objectContaining({
          user: expect.objectContaining({
            id: USER_ID,
            name: 'Test',
          }),
        }),
      }));
    });

    it('should handle both user profile queries failing (lines 126-133)', async () => {
      // 1. membership query
      query.mockResolvedValueOnce({ rows: [{ role: 'member', onboarding_completed_at: null, joined_at: new Date() }] });
      // 2. upsert onboarding progress
      query.mockResolvedValueOnce({ rows: [] });
      // 3. workspace info
      query.mockResolvedValueOnce({ rows: [{ name: 'Test Workspace', owner_id: 2, owner_name: 'Owner' }] });
      // 4. invitation info
      query.mockResolvedValueOnce({ rows: [] });
      // 5. onboarding progress SELECT
      query.mockResolvedValueOnce({ rows: [] });
      // 6. user profile query FAILS
      query.mockRejectedValueOnce(new Error('column "first_name" does not exist'));
      // 7. user profile FALLBACK also FAILS
      query.mockRejectedValueOnce(new Error('users table does not exist'));
      // 8. workspace members
      query.mockResolvedValueOnce({ rows: [] });
      // 9. workspace stats
      query.mockResolvedValueOnce({ rows: [{ member_count: '1', category_count: '0', task_count: '0' }] });

      await getOnboardingStatus(req, res);

      expect(res.json).toHaveBeenCalledWith(expect.objectContaining({
        status: 'success',
        data: expect.objectContaining({
          user: null,
        }),
      }));
    });

    it('should handle workspace members query failure gracefully (line 150)', async () => {
      // 1. membership query
      query.mockResolvedValueOnce({ rows: [{ role: 'member', onboarding_completed_at: null, joined_at: new Date() }] });
      // 2. upsert onboarding progress
      query.mockResolvedValueOnce({ rows: [] });
      // 3. workspace info
      query.mockResolvedValueOnce({ rows: [{ name: 'Test Workspace', owner_id: 2, owner_name: 'Owner' }] });
      // 4. invitation info
      query.mockResolvedValueOnce({ rows: [] });
      // 5. onboarding progress SELECT
      query.mockResolvedValueOnce({ rows: [] });
      // 6. user profile
      query.mockResolvedValueOnce({ rows: [{ id: USER_ID, name: 'Test', first_name: null, last_name: null, email: 'a@b.c', avatar_url: null, avatar_color: '#000' }] });
      // 7. workspace members query FAILS
      query.mockRejectedValueOnce(new Error('could not query members'));
      // 8. workspace stats
      query.mockResolvedValueOnce({ rows: [{ member_count: '1', category_count: '0', task_count: '0' }] });

      await getOnboardingStatus(req, res);

      expect(res.json).toHaveBeenCalledWith(expect.objectContaining({
        status: 'success',
        data: expect.objectContaining({
          members: [],
        }),
      }));
    });

    it('should handle workspace stats query failure gracefully (line 165)', async () => {
      // 1. membership query
      query.mockResolvedValueOnce({ rows: [{ role: 'member', onboarding_completed_at: null, joined_at: new Date() }] });
      // 2. upsert onboarding progress
      query.mockResolvedValueOnce({ rows: [] });
      // 3. workspace info
      query.mockResolvedValueOnce({ rows: [{ name: 'Test Workspace', owner_id: 2, owner_name: 'Owner' }] });
      // 4. invitation info
      query.mockResolvedValueOnce({ rows: [] });
      // 5. onboarding progress SELECT
      query.mockResolvedValueOnce({ rows: [] });
      // 6. user profile
      query.mockResolvedValueOnce({ rows: [{ id: USER_ID, name: 'Test', first_name: null, last_name: null, email: 'a@b.c', avatar_url: null, avatar_color: '#000' }] });
      // 7. workspace members
      query.mockResolvedValueOnce({ rows: [] });
      // 8. workspace stats query FAILS
      query.mockRejectedValueOnce(new Error('could not query stats'));

      await getOnboardingStatus(req, res);

      expect(res.json).toHaveBeenCalledWith(expect.objectContaining({
        status: 'success',
        data: expect.objectContaining({
          workspace: expect.objectContaining({
            memberCount: 0,
            categoryCount: 0,
            taskCount: 0,
          }),
        }),
      }));
    });
  });

  // -------------------------------------------------------------------
  // startOnboarding
  // -------------------------------------------------------------------
  describe('startOnboarding', () => {
    it('should start onboarding for a workspace member', async () => {
      // membership check
      query.mockResolvedValueOnce({ rows: [{ id: 1 }] });
      // upsert progress
      query.mockResolvedValueOnce({ rows: [{ current_step: 1, steps_completed: [] }] });

      await startOnboarding(req, res);

      expect(res.json).toHaveBeenCalledWith(expect.objectContaining({
        status: 'success',
        message: 'Onboarding started',
        data: expect.objectContaining({
          progress: expect.objectContaining({
            currentStep: 1,
            stepsCompleted: [],
            totalSteps: TOTAL_STEPS,
          }),
        }),
      }));
    });

    it('should return 403 if user is not a member', async () => {
      query.mockResolvedValueOnce({ rows: [] });

      await startOnboarding(req, res);

      expect(res.status).toHaveBeenCalledWith(403);
      expect(res.json).toHaveBeenCalledWith(expect.objectContaining({
        message: 'You are not a member of this workspace',
      }));
    });

    it('should gracefully handle progress table not existing', async () => {
      // membership check
      query.mockResolvedValueOnce({ rows: [{ id: 1 }] });
      // upsert fails
      query.mockRejectedValueOnce(new Error('relation "workspace_onboarding_progress" does not exist'));

      await startOnboarding(req, res);

      expect(res.json).toHaveBeenCalledWith(expect.objectContaining({
        status: 'success',
        message: 'Onboarding started',
        data: expect.objectContaining({
          progress: expect.objectContaining({
            currentStep: 1,
            stepsCompleted: [],
          }),
        }),
      }));
    });

    it('should return 500 on unexpected database error (lines 280-281)', async () => {
      // membership check throws unexpectedly
      query.mockRejectedValueOnce(new Error('connection refused'));

      await startOnboarding(req, res);

      expect(res.status).toHaveBeenCalledWith(500);
      expect(res.json).toHaveBeenCalledWith(expect.objectContaining({
        status: 'error',
        message: 'Error starting onboarding',
      }));
    });
  });

  // -------------------------------------------------------------------
  // updateProgress
  // -------------------------------------------------------------------
  describe('updateProgress', () => {
    it('should update progress with a step number', async () => {
      req.body = { step: 2 };
      // membership check
      query.mockResolvedValueOnce({ rows: [{ id: 1 }] });
      // upsert progress
      query.mockResolvedValueOnce({
        rows: [{ current_step: 3, steps_completed: ['welcome', 'profile'] }],
      });

      await updateProgress(req, res);

      expect(res.json).toHaveBeenCalledWith(expect.objectContaining({
        status: 'success',
        message: 'Step "profile" completed',
        data: expect.objectContaining({
          progress: expect.objectContaining({
            currentStep: 3,
            stepsCompleted: ['welcome', 'profile'],
            totalSteps: TOTAL_STEPS,
          }),
        }),
      }));
    });

    it('should update progress with a stepName', async () => {
      req.body = { stepName: 'tour' };
      // membership check
      query.mockResolvedValueOnce({ rows: [{ id: 1 }] });
      // upsert progress
      query.mockResolvedValueOnce({
        rows: [{ current_step: 4, steps_completed: ['welcome', 'profile', 'tour'] }],
      });

      await updateProgress(req, res);

      expect(res.json).toHaveBeenCalledWith(expect.objectContaining({
        status: 'success',
        message: 'Step "tour" completed',
      }));
    });

    it('should return 400 if neither step nor stepName is provided', async () => {
      req.body = {};

      await updateProgress(req, res);

      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith(expect.objectContaining({
        message: 'step number or stepName is required',
      }));
    });

    it('should return 400 for invalid step number (too high)', async () => {
      req.body = { step: 99 };

      await updateProgress(req, res);

      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith(expect.objectContaining({
        message: expect.stringContaining('Invalid step'),
      }));
    });

    it('should return 400 for invalid step number (zero)', async () => {
      req.body = { step: 0 };

      await updateProgress(req, res);

      expect(res.status).toHaveBeenCalledWith(400);
    });

    it('should return 403 if user is not a member', async () => {
      req.body = { step: 1 };
      query.mockResolvedValueOnce({ rows: [] });

      await updateProgress(req, res);

      expect(res.status).toHaveBeenCalledWith(403);
    });

    it('should handle progress upsert failure gracefully (line 350)', async () => {
      req.body = { step: 2 };
      // membership check
      query.mockResolvedValueOnce({ rows: [{ id: 1 }] });
      // upsert progress FAILS
      query.mockRejectedValueOnce(new Error('relation "workspace_onboarding_progress" does not exist'));

      await updateProgress(req, res);

      // Should still succeed with fallback values
      expect(res.json).toHaveBeenCalledWith(expect.objectContaining({
        status: 'success',
        message: 'Step "profile" completed',
        data: expect.objectContaining({
          progress: expect.objectContaining({
            currentStep: 3,
            stepsCompleted: ['profile'],
            totalSteps: TOTAL_STEPS,
          }),
        }),
      }));
    });

    it('should return 500 on unexpected database error (lines 365-366)', async () => {
      req.body = { step: 1 };
      // membership check throws unexpectedly
      query.mockRejectedValueOnce(new Error('connection refused'));

      await updateProgress(req, res);

      expect(res.status).toHaveBeenCalledWith(500);
      expect(res.json).toHaveBeenCalledWith(expect.objectContaining({
        status: 'error',
        message: 'Error updating onboarding progress',
      }));
    });

    it('should handle stepName that does not exist in ONBOARDING_STEPS', async () => {
      req.body = { stepName: 'nonexistent' };

      await updateProgress(req, res);

      // indexOf returns -1, so stepNum = 0, which is < 1 → invalid
      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith(expect.objectContaining({
        message: expect.stringContaining('Invalid step'),
      }));
    });
  });

  // -------------------------------------------------------------------
  // completeOnboarding
  // -------------------------------------------------------------------
  describe('completeOnboarding', () => {
    it('should complete onboarding with BEGIN/COMMIT transaction', async () => {
      // BEGIN
      mockClient.query.mockResolvedValueOnce({});
      // membership check
      mockClient.query.mockResolvedValueOnce({ rows: [{ id: 1 }] });
      // upsert progress
      mockClient.query.mockResolvedValueOnce({});
      // update workspace_members
      mockClient.query.mockResolvedValueOnce({});
      // COMMIT
      mockClient.query.mockResolvedValueOnce({});

      await completeOnboarding(req, res);

      expect(mockClient.query).toHaveBeenNthCalledWith(1, 'BEGIN');
      expect(mockClient.query).toHaveBeenNthCalledWith(5, 'COMMIT');
      expect(mockClient.release).toHaveBeenCalled();
      expect(res.json).toHaveBeenCalledWith(expect.objectContaining({
        status: 'success',
        message: 'Onboarding completed successfully',
      }));
    });

    it('should ROLLBACK and return 403 if user is not a member', async () => {
      // BEGIN
      mockClient.query.mockResolvedValueOnce({});
      // membership check returns empty
      mockClient.query.mockResolvedValueOnce({ rows: [] });
      // ROLLBACK
      mockClient.query.mockResolvedValueOnce({});

      await completeOnboarding(req, res);

      expect(mockClient.query).toHaveBeenNthCalledWith(1, 'BEGIN');
      expect(mockClient.query).toHaveBeenNthCalledWith(3, 'ROLLBACK');
      expect(res.status).toHaveBeenCalledWith(403);
      expect(mockClient.release).toHaveBeenCalled();
    });

    it('should ROLLBACK on unexpected error and return 500', async () => {
      // BEGIN
      mockClient.query.mockResolvedValueOnce({});
      // membership check throws
      mockClient.query.mockRejectedValueOnce(new Error('DB down'));
      // ROLLBACK
      mockClient.query.mockResolvedValueOnce({});

      await completeOnboarding(req, res);

      expect(res.status).toHaveBeenCalledWith(500);
      expect(res.json).toHaveBeenCalledWith(expect.objectContaining({
        status: 'error',
        message: 'Error completing onboarding',
      }));
      expect(mockClient.release).toHaveBeenCalled();
    });

    it('should handle progress table upsert failure gracefully (line 410)', async () => {
      // BEGIN
      mockClient.query.mockResolvedValueOnce({});
      // membership check
      mockClient.query.mockResolvedValueOnce({ rows: [{ id: 1 }] });
      // upsert progress FAILS (table may not exist)
      mockClient.query.mockRejectedValueOnce(new Error('relation "workspace_onboarding_progress" does not exist'));
      // update workspace_members succeeds
      mockClient.query.mockResolvedValueOnce({});
      // COMMIT
      mockClient.query.mockResolvedValueOnce({});

      await completeOnboarding(req, res);

      expect(res.json).toHaveBeenCalledWith(expect.objectContaining({
        status: 'success',
        message: 'Onboarding completed successfully',
      }));
      expect(mockClient.release).toHaveBeenCalled();
    });

    it('should handle workspace_members update failure gracefully (line 422)', async () => {
      // BEGIN
      mockClient.query.mockResolvedValueOnce({});
      // membership check
      mockClient.query.mockResolvedValueOnce({ rows: [{ id: 1 }] });
      // upsert progress succeeds
      mockClient.query.mockResolvedValueOnce({});
      // update workspace_members FAILS (column may not exist)
      mockClient.query.mockRejectedValueOnce(new Error('column "onboarding_completed_at" does not exist'));
      // COMMIT
      mockClient.query.mockResolvedValueOnce({});

      await completeOnboarding(req, res);

      expect(res.json).toHaveBeenCalledWith(expect.objectContaining({
        status: 'success',
        message: 'Onboarding completed successfully',
      }));
      expect(mockClient.release).toHaveBeenCalled();
    });
  });

  // -------------------------------------------------------------------
  // skipOnboarding
  // -------------------------------------------------------------------
  describe('skipOnboarding', () => {
    it('should skip onboarding with BEGIN/COMMIT transaction', async () => {
      // BEGIN
      mockClient.query.mockResolvedValueOnce({});
      // membership check
      mockClient.query.mockResolvedValueOnce({ rows: [{ id: 1 }] });
      // upsert progress (skipped_at)
      mockClient.query.mockResolvedValueOnce({});
      // update workspace_members
      mockClient.query.mockResolvedValueOnce({});
      // COMMIT
      mockClient.query.mockResolvedValueOnce({});

      await skipOnboarding(req, res);

      expect(mockClient.query).toHaveBeenNthCalledWith(1, 'BEGIN');
      expect(mockClient.query).toHaveBeenNthCalledWith(5, 'COMMIT');
      expect(mockClient.release).toHaveBeenCalled();
      expect(res.json).toHaveBeenCalledWith(expect.objectContaining({
        status: 'success',
        message: 'Onboarding skipped',
      }));
    });

    it('should ROLLBACK and return 403 if user is not a member', async () => {
      // BEGIN
      mockClient.query.mockResolvedValueOnce({});
      // membership check returns empty
      mockClient.query.mockResolvedValueOnce({ rows: [] });
      // ROLLBACK
      mockClient.query.mockResolvedValueOnce({});

      await skipOnboarding(req, res);

      expect(mockClient.query).toHaveBeenNthCalledWith(3, 'ROLLBACK');
      expect(res.status).toHaveBeenCalledWith(403);
      expect(mockClient.release).toHaveBeenCalled();
    });

    it('should ROLLBACK on unexpected error and return 500', async () => {
      // BEGIN
      mockClient.query.mockResolvedValueOnce({});
      // membership check throws
      mockClient.query.mockRejectedValueOnce(new Error('DB down'));
      // ROLLBACK
      mockClient.query.mockResolvedValueOnce({});

      await skipOnboarding(req, res);

      expect(res.status).toHaveBeenCalledWith(500);
      expect(res.json).toHaveBeenCalledWith(expect.objectContaining({
        status: 'error',
        message: 'Error skipping onboarding',
      }));
      expect(mockClient.release).toHaveBeenCalled();
    });

    it('should handle progress table upsert failure gracefully (line 478)', async () => {
      // BEGIN
      mockClient.query.mockResolvedValueOnce({});
      // membership check
      mockClient.query.mockResolvedValueOnce({ rows: [{ id: 1 }] });
      // upsert progress (skipped_at) FAILS
      mockClient.query.mockRejectedValueOnce(new Error('relation "workspace_onboarding_progress" does not exist'));
      // update workspace_members succeeds
      mockClient.query.mockResolvedValueOnce({});
      // COMMIT
      mockClient.query.mockResolvedValueOnce({});

      await skipOnboarding(req, res);

      expect(res.json).toHaveBeenCalledWith(expect.objectContaining({
        status: 'success',
        message: 'Onboarding skipped',
      }));
      expect(mockClient.release).toHaveBeenCalled();
    });

    it('should handle workspace_members update failure gracefully (line 490)', async () => {
      // BEGIN
      mockClient.query.mockResolvedValueOnce({});
      // membership check
      mockClient.query.mockResolvedValueOnce({ rows: [{ id: 1 }] });
      // upsert progress (skipped_at) succeeds
      mockClient.query.mockResolvedValueOnce({});
      // update workspace_members FAILS
      mockClient.query.mockRejectedValueOnce(new Error('column "onboarding_completed_at" does not exist'));
      // COMMIT
      mockClient.query.mockResolvedValueOnce({});

      await skipOnboarding(req, res);

      expect(res.json).toHaveBeenCalledWith(expect.objectContaining({
        status: 'success',
        message: 'Onboarding skipped',
      }));
      expect(mockClient.release).toHaveBeenCalled();
    });
  });
});
