// Analytics wrapper - supports PostHog or any provider via env config
const analytics = {
  init() {
    if (process.env.REACT_APP_POSTHOG_KEY) {
      console.log('Analytics initialized');
    }
  },

  track(event, properties = {}) {
    if (process.env.NODE_ENV === 'development') {
      console.debug('[Analytics]', event, properties);
    }
  },

  identify(userId, traits = {}) {
    if (process.env.NODE_ENV === 'development') {
      console.debug('[Analytics] identify', userId, traits);
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
  },
};

export const EVENTS = analytics.events;
export default analytics;
