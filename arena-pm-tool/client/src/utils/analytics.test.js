/* eslint-disable import/first */
jest.mock('axios', () => require('axios/dist/node/axios.cjs'));

// Mock posthog-js for dynamic import.
// analytics.js does: const ph = await import('posthog-js'); posthog = ph.default;
// So the mock module needs __esModule: true and a `default` property.
const mockPosthog = {
  init: jest.fn(),
  capture: jest.fn(),
  identify: jest.fn(),
  reset: jest.fn(),
};

jest.mock('posthog-js', () => ({ __esModule: true, default: mockPosthog }), { virtual: true });

const originalEnv = { ...process.env };

beforeEach(() => {
  jest.resetModules();
  jest.clearAllMocks();
  // Re-register the mock after resetModules to ensure it is active for re-requires
  jest.doMock('posthog-js', () => ({ __esModule: true, default: mockPosthog }), { virtual: true });
  process.env = { ...originalEnv };
  delete process.env.REACT_APP_POSTHOG_KEY;
  delete process.env.REACT_APP_POSTHOG_HOST;
});

afterEach(() => {
  process.env = originalEnv;
});

describe('analytics', () => {
  describe('init', () => {
    test('does nothing when REACT_APP_POSTHOG_KEY is not set', async () => {
      const analytics = require('./analytics').default;
      await analytics.init();
      expect(mockPosthog.init).not.toHaveBeenCalled();
    });

    test('initializes posthog with default host when key is set (lines 12-22)', async () => {
      process.env.REACT_APP_POSTHOG_KEY = 'phc_test_key';
      const analytics = require('./analytics').default;
      await analytics.init();

      expect(mockPosthog.init).toHaveBeenCalledWith('phc_test_key', {
        api_host: 'https://us.i.posthog.com',
        capture_pageview: true,
        capture_pageleave: true,
        persistence: 'localStorage+cookie',
        autocapture: false,
        disable_session_recording: true,
      });
    });

    test('uses custom REACT_APP_POSTHOG_HOST when set (line 8)', async () => {
      process.env.REACT_APP_POSTHOG_KEY = 'phc_test_key';
      process.env.REACT_APP_POSTHOG_HOST = 'https://custom.posthog.com';
      const analytics = require('./analytics').default;
      await analytics.init();

      expect(mockPosthog.init).toHaveBeenCalledWith(
        'phc_test_key',
        expect.objectContaining({ api_host: 'https://custom.posthog.com' })
      );
    });

    test('handles import failure gracefully (lines 23-25)', async () => {
      process.env.REACT_APP_POSTHOG_KEY = 'phc_test_key';

      // Override the module mock to throw on import
      jest.resetModules();
      jest.doMock('posthog-js', () => {
        throw new Error('Module not found');
      }, { virtual: true });

      const analytics = require('./analytics').default;
      // Should not throw
      await analytics.init();

      // posthog should remain null, so track should be a no-op
      analytics.track('test_event');
      expect(mockPosthog.capture).not.toHaveBeenCalled();
    });
  });

  describe('track', () => {
    test('calls posthog.capture when posthog is initialized (line 30)', async () => {
      process.env.REACT_APP_POSTHOG_KEY = 'phc_test_key';
      const analytics = require('./analytics').default;
      await analytics.init();

      analytics.track('task_created', { workspace_id: 'ws_1' });

      expect(mockPosthog.capture).toHaveBeenCalledWith('task_created', { workspace_id: 'ws_1' });
    });

    test('does not call posthog.capture when posthog is not initialized', () => {
      const analytics = require('./analytics').default;
      analytics.track('task_created', { workspace_id: 'ws_1' });

      expect(mockPosthog.capture).not.toHaveBeenCalled();
    });

    test('logs to console.debug in development (line 33)', () => {
      process.env.NODE_ENV = 'development';
      const debugSpy = jest.spyOn(console, 'debug').mockImplementation(() => {});

      const analytics = require('./analytics').default;
      analytics.track('test_event', { key: 'value' });

      expect(debugSpy).toHaveBeenCalledWith('[Analytics]', 'test_event', { key: 'value' });
      debugSpy.mockRestore();
    });

    test('does not log to console.debug in production', () => {
      process.env.NODE_ENV = 'production';
      const debugSpy = jest.spyOn(console, 'debug').mockImplementation(() => {});

      const analytics = require('./analytics').default;
      analytics.track('test_event', { key: 'value' });

      expect(debugSpy).not.toHaveBeenCalled();
      debugSpy.mockRestore();
    });

    test('uses empty object as default properties', async () => {
      process.env.REACT_APP_POSTHOG_KEY = 'phc_test_key';
      const analytics = require('./analytics').default;
      await analytics.init();

      analytics.track('simple_event');

      expect(mockPosthog.capture).toHaveBeenCalledWith('simple_event', {});
    });
  });

  describe('identify', () => {
    test('calls posthog.identify with stringified userId (lines 38-40)', async () => {
      process.env.REACT_APP_POSTHOG_KEY = 'phc_test_key';
      const analytics = require('./analytics').default;
      await analytics.init();

      analytics.identify(42, { name: 'Test User', plan: 'pro' });

      expect(mockPosthog.identify).toHaveBeenCalledWith('42', { name: 'Test User', plan: 'pro' });
    });

    test('converts numeric userId to string (line 39)', async () => {
      process.env.REACT_APP_POSTHOG_KEY = 'phc_test_key';
      const analytics = require('./analytics').default;
      await analytics.init();

      analytics.identify(123, {});

      expect(mockPosthog.identify).toHaveBeenCalledWith('123', {});
    });

    test('does not call posthog.identify when posthog is not initialized', () => {
      const analytics = require('./analytics').default;
      analytics.identify(42, { name: 'Test' });

      expect(mockPosthog.identify).not.toHaveBeenCalled();
    });

    test('logs to console.debug in development (lines 41-43)', () => {
      process.env.NODE_ENV = 'development';
      const debugSpy = jest.spyOn(console, 'debug').mockImplementation(() => {});

      const analytics = require('./analytics').default;
      analytics.identify(42, { plan: 'free' });

      expect(debugSpy).toHaveBeenCalledWith('[Analytics] identify', 42, { plan: 'free' });
      debugSpy.mockRestore();
    });

    test('does not log to console.debug in production', () => {
      process.env.NODE_ENV = 'production';
      const debugSpy = jest.spyOn(console, 'debug').mockImplementation(() => {});

      const analytics = require('./analytics').default;
      analytics.identify(42, {});

      expect(debugSpy).not.toHaveBeenCalled();
      debugSpy.mockRestore();
    });

    test('uses empty object as default traits', async () => {
      process.env.REACT_APP_POSTHOG_KEY = 'phc_test_key';
      const analytics = require('./analytics').default;
      await analytics.init();

      analytics.identify(1);

      expect(mockPosthog.identify).toHaveBeenCalledWith('1', {});
    });
  });

  describe('reset', () => {
    test('calls posthog.reset when posthog is initialized (lines 47-49)', async () => {
      process.env.REACT_APP_POSTHOG_KEY = 'phc_test_key';
      const analytics = require('./analytics').default;
      await analytics.init();

      analytics.reset();

      expect(mockPosthog.reset).toHaveBeenCalledTimes(1);
    });

    test('does not call posthog.reset when posthog is not initialized', () => {
      const analytics = require('./analytics').default;
      analytics.reset();

      expect(mockPosthog.reset).not.toHaveBeenCalled();
    });
  });

  describe('events constants', () => {
    test('exports EVENTS object with all expected event names', () => {
      const { EVENTS } = require('./analytics');
      expect(EVENTS).toEqual({
        SIGNUP: 'user_signed_up',
        LOGIN: 'user_logged_in',
        LOGOUT: 'user_logged_out',
        TASK_CREATED: 'task_created',
        TASK_COMPLETED: 'task_completed',
        FIRST_TASK_CREATED: 'first_task_created',
        WORKSPACE_CREATED: 'workspace_created',
        MEMBER_INVITED: 'member_invited',
        TRIAL_STARTED: 'trial_started',
        UPGRADE_CLICKED: 'upgrade_clicked',
        SUBSCRIPTION_CREATED: 'subscription_created',
        ONBOARDING_STEP_COMPLETED: 'onboarding_step_completed',
        ONBOARDING_COMPLETED: 'onboarding_completed',
        ONBOARDING_SKIPPED: 'onboarding_skipped',
        VIEW_SWITCHED: 'view_switched',
        TASK_DELETED: 'task_deleted',
        CATEGORY_CREATED: 'category_created',
      });
    });

    test('events are accessible via analytics.events', () => {
      const analytics = require('./analytics').default;
      expect(analytics.events.SIGNUP).toBe('user_signed_up');
      expect(analytics.events.TASK_CREATED).toBe('task_created');
    });
  });
});
