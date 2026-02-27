// Analytics wrapper - PostHog integration with graceful fallback
// Set REACT_APP_POSTHOG_KEY and REACT_APP_POSTHOG_HOST in .env to enable
let posthog = null;

const analytics = {
  async init() {
    const key = process.env.REACT_APP_POSTHOG_KEY;
    const host = process.env.REACT_APP_POSTHOG_HOST || 'https://us.i.posthog.com';

    if (!key) return;

    try {
      const ph = await import('posthog-js');
      posthog = ph.default;
      posthog.init(key, {
        api_host: host,
        capture_pageview: true,
        capture_pageleave: true,
        persistence: 'localStorage+cookie',
        autocapture: false,
        disable_session_recording: true,
      });
    } catch {
      // PostHog not installed — analytics disabled silently
    }
  },

  track(event, properties = {}) {
    if (posthog) {
      posthog.capture(event, properties);
    }
    if (process.env.NODE_ENV === 'development') {
      console.debug('[Analytics]', event, properties);
    }
  },

  identify(userId, traits = {}) {
    if (posthog) {
      posthog.identify(String(userId), traits);
    }
    if (process.env.NODE_ENV === 'development') {
      console.debug('[Analytics] identify', userId, traits);
    }
  },

  reset() {
    if (posthog) {
      posthog.reset();
    }
  },

  events: {
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
  },
};

export const EVENTS = analytics.events;
export default analytics;
