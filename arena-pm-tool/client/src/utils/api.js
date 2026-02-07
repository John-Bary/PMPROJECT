// API Configuration and Axios Instance
import axios from 'axios';

// Use relative /api path in production (same domain on Vercel), absolute URL for local dev
const API_BASE_URL = process.env.REACT_APP_API_URL || '/api';
const RETRYABLE_STATUSES = [429, 500, 502, 503, 504];
const MAX_RETRY_ATTEMPTS = 2;
const RETRY_DELAY_MS = 300;

const wait = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

export const safeApiCall = async (requestFn, options = {}) => {
  const retries = options.retries ?? MAX_RETRY_ATTEMPTS;
  const retryDelay = options.retryDelay ?? RETRY_DELAY_MS;

  for (let attempt = 0; attempt <= retries; attempt += 1) {
    try {
      return await requestFn();
    } catch (error) {
      const status = error.response?.status;
      const networkError = !error.response;
      const isRetryable = networkError || RETRYABLE_STATUSES.includes(status);

      if (!isRetryable || attempt >= retries) {
        throw error;
      }

      // Exponential-ish backoff
      await wait(retryDelay * (attempt + 1));
    }
  }

  throw new Error('API call failed after retries');
};

// Create axios instance
const api = axios.create({
  baseURL: API_BASE_URL,
  withCredentials: true, // Send cookies with requests
  headers: {
    'Content-Type': 'application/json',
  },
});

// Auth relies on httpOnly cookies (set by the server) — no localStorage token needed.
// The request interceptor no longer injects an Authorization header.

// CSRF token management: fetch once and attach to all state-changing requests
let csrfToken = null;
let csrfFetchPromise = null;

const fetchCsrfToken = async () => {
  // Deduplicate concurrent fetches
  if (csrfFetchPromise) return csrfFetchPromise;
  csrfFetchPromise = axios
    .get(`${API_BASE_URL}/csrf-token`, { withCredentials: true })
    .then((res) => {
      csrfToken = res.data.csrfToken;
      return csrfToken;
    })
    .catch((err) => {
      console.error('Failed to fetch CSRF token:', err.message);
      return null;
    })
    .finally(() => {
      csrfFetchPromise = null;
    });
  return csrfFetchPromise;
};

// Eagerly fetch CSRF token on module load
fetchCsrfToken();

// Methods that require CSRF protection
const CSRF_METHODS = ['post', 'put', 'patch', 'delete'];

// Request interceptor: attach CSRF token to state-changing requests
api.interceptors.request.use(async (config) => {
  if (CSRF_METHODS.includes(config.method)) {
    if (!csrfToken) {
      await fetchCsrfToken();
    }
    if (csrfToken) {
      config.headers['X-CSRF-Token'] = csrfToken;
    }
  }
  return config;
});

// Debounce flag to prevent cascading 401 handlers from clearing state multiple times
let isHandling401 = false;
// Flag: are we currently trying to refresh the access token?
let isRefreshing = false;
// Queue of requests waiting for a token refresh
let refreshQueue = [];

// Auth endpoints that should NOT trigger the global 401 / refresh handler
const AUTH_ENDPOINTS = ['/auth/login', '/auth/register', '/auth/logout', '/auth/refresh'];

export const resetAuthInterceptorFlag = () => {
  isHandling401 = false;
};

// Response interceptor - handle CSRF 403 retry and 401 token refresh
api.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config;

    // Handle CSRF token rejection: fetch a new token and retry once
    if (error.response?.status === 403 && !originalRequest._csrfRetry) {
      originalRequest._csrfRetry = true;
      csrfToken = null;
      await fetchCsrfToken();
      if (csrfToken) {
        originalRequest.headers['X-CSRF-Token'] = csrfToken;
        return api(originalRequest);
      }
    }

    if (error.response?.status === 401) {
      const requestUrl = originalRequest?.url || '';
      const isAuthEndpoint = AUTH_ENDPOINTS.some((ep) => requestUrl.includes(ep));

      // Don't attempt refresh for auth endpoints or already-retried requests
      if (!isAuthEndpoint && !originalRequest._retry) {
        if (isRefreshing) {
          // Wait for the in-flight refresh to finish, then replay
          return new Promise((resolve, reject) => {
            refreshQueue.push({ resolve, reject, config: originalRequest });
          });
        }

        originalRequest._retry = true;
        isRefreshing = true;

        try {
          const refreshHeaders = csrfToken ? { 'X-CSRF-Token': csrfToken } : {};
          await axios.post(`${API_BASE_URL}/auth/refresh`, {}, { withCredentials: true, headers: refreshHeaders });

          // Refresh succeeded — replay queued requests
          refreshQueue.forEach(({ resolve, config }) => resolve(api(config)));
          refreshQueue = [];

          // Replay the original request
          return api(originalRequest);
        } catch (refreshError) {
          // Refresh failed — reject all queued requests and redirect to login
          refreshQueue.forEach(({ reject }) => reject(refreshError));
          refreshQueue = [];

          if (!isHandling401) {
            isHandling401 = true;
            localStorage.removeItem('user');

            const currentPath = window.location.pathname + window.location.search;
            const returnParam = currentPath && currentPath !== '/login'
              ? `?returnUrl=${encodeURIComponent(currentPath)}`
              : '';
            window.location.href = `/login${returnParam}`;
          }
        } finally {
          isRefreshing = false;
        }
      }
    }
    return Promise.reject(error);
  }
);

// Auth API
export const authAPI = {
  login: (credentials) => safeApiCall(() => api.post('/auth/login', credentials)),
  register: (userData) => safeApiCall(() => api.post('/auth/register', userData)),
  logout: () => safeApiCall(() => api.post('/auth/logout')),
  refresh: () => safeApiCall(() => api.post('/auth/refresh')),
  getCurrentUser: () => safeApiCall(() => api.get('/auth/me')),
  getAllUsers: () => safeApiCall(() => api.get('/auth/users')),
  forgotPassword: (email) => safeApiCall(() => api.post('/auth/forgot-password', { email })),
  resetPassword: (token, password) => safeApiCall(() => api.post('/auth/reset-password', { token, password })),
  verifyEmail: (token) => safeApiCall(() => api.post('/auth/verify-email', { token })),
  resendVerification: () => safeApiCall(() => api.post('/auth/resend-verification')),
};

// Tasks API
export const tasksAPI = {
  getAll: (filters = {}) => {
    const params = new URLSearchParams();
    Object.keys(filters).forEach(key => {
      if (filters[key] !== undefined && filters[key] !== null && filters[key] !== '') {
        params.append(key, filters[key]);
      }
    });
    return safeApiCall(() => api.get(`/tasks?${params.toString()}`));
  },
  getById: (id) => safeApiCall(() => api.get(`/tasks/${id}`)),
  create: (taskData) => safeApiCall(() => api.post('/tasks', taskData)),
  update: (id, taskData) => safeApiCall(() => api.put(`/tasks/${id}`, taskData)),
  updatePosition: (id, positionData) =>
    safeApiCall(() => api.patch(`/tasks/${id}/position`, positionData)),
  delete: (id) => safeApiCall(() => api.delete(`/tasks/${id}`)),
  getSubtasks: (taskId) => safeApiCall(() => api.get(`/tasks/${taskId}/subtasks`)),
};

// Categories API
export const categoriesAPI = {
  getAll: (params = {}) => {
    const queryParams = new URLSearchParams();
    Object.keys(params).forEach(key => {
      if (params[key] !== undefined && params[key] !== null && params[key] !== '') {
        queryParams.append(key, params[key]);
      }
    });
    const queryString = queryParams.toString();
    return safeApiCall(() => api.get(`/categories${queryString ? `?${queryString}` : ''}`));
  },
  getById: (id) => safeApiCall(() => api.get(`/categories/${id}`)),
  create: (categoryData) => safeApiCall(() => api.post('/categories', categoryData)),
  update: (id, categoryData) => safeApiCall(() => api.put(`/categories/${id}`, categoryData)),
  delete: (id) => safeApiCall(() => api.delete(`/categories/${id}`)),
  reorder: (categoryIds) => safeApiCall(() => api.patch('/categories/reorder', { categoryIds })),
};

// Users API
export const usersAPI = {
  getAll: () => safeApiCall(() => api.get('/auth/users')),
  getById: (id) => safeApiCall(() => api.get(`/auth/users/${id}`)),
};

// Comments API
export const commentsAPI = {
  getByTaskId: (taskId) => safeApiCall(() => api.get(`/tasks/${taskId}/comments`)),
  create: (taskId, commentData) => safeApiCall(() => api.post(`/tasks/${taskId}/comments`, commentData)),
  update: (commentId, commentData) => safeApiCall(() => api.put(`/comments/${commentId}`, commentData)),
  delete: (commentId) => safeApiCall(() => api.delete(`/comments/${commentId}`)),
};

// Holidays API
export const holidaysAPI = {
  getByYear: (year) => safeApiCall(() => api.get(`/holidays?year=${year}`)),
};

// Workspaces API
export const workspacesAPI = {
  getAll: () => safeApiCall(() => api.get('/workspaces')),
  getById: (id) => safeApiCall(() => api.get(`/workspaces/${id}`)),
  create: (data) => safeApiCall(() => api.post('/workspaces', data)),
  update: (id, data) => safeApiCall(() => api.put(`/workspaces/${id}`, data)),
  delete: (id) => safeApiCall(() => api.delete(`/workspaces/${id}`)),
  // Members
  getMembers: (workspaceId) => safeApiCall(() => api.get(`/workspaces/${workspaceId}/members`)),
  updateMemberRole: (workspaceId, memberId, role) =>
    safeApiCall(() => api.patch(`/workspaces/${workspaceId}/members/${memberId}`, { role })),
  removeMember: (workspaceId, memberId) =>
    safeApiCall(() => api.delete(`/workspaces/${workspaceId}/members/${memberId}`)),
  // Invitations
  invite: (workspaceId, email, role = 'member') =>
    safeApiCall(() => api.post(`/workspaces/${workspaceId}/invite`, { email, role })),
  getInvitations: (workspaceId) =>
    safeApiCall(() => api.get(`/workspaces/${workspaceId}/invitations`)),
  cancelInvitation: (workspaceId, invitationId) =>
    safeApiCall(() => api.delete(`/workspaces/${workspaceId}/invitations/${invitationId}`)),
  acceptInvitation: (token) =>
    safeApiCall(() => api.post(`/workspaces/accept-invite/${token}`)),
  getInviteInfo: (token) =>
    safeApiCall(() => api.get(`/workspaces/invite-info/${token}`)),
  // Get users for workspace (for assignee dropdown)
  getUsers: (workspaceId) =>
    safeApiCall(() => api.get(`/workspaces/users?workspace_id=${workspaceId}`)),
  // Onboarding
  getOnboardingStatus: (workspaceId) =>
    safeApiCall(() => api.get(`/workspaces/${workspaceId}/onboarding`)),
  startOnboarding: (workspaceId) =>
    safeApiCall(() => api.post(`/workspaces/${workspaceId}/onboarding/start`)),
  updateOnboardingProgress: (workspaceId, data) =>
    safeApiCall(() => api.put(`/workspaces/${workspaceId}/onboarding/progress`, data)),
  completeOnboarding: (workspaceId) =>
    safeApiCall(() => api.post(`/workspaces/${workspaceId}/onboarding/complete`)),
  skipOnboarding: (workspaceId) =>
    safeApiCall(() => api.post(`/workspaces/${workspaceId}/onboarding/skip`)),
  // Activity feed
  getActivity: (workspaceId, params = {}) => {
    const queryParams = new URLSearchParams();
    if (params.limit) queryParams.append('limit', params.limit);
    if (params.offset) queryParams.append('offset', params.offset);
    const qs = queryParams.toString();
    return safeApiCall(() => api.get(`/workspaces/${workspaceId}/activity${qs ? `?${qs}` : ''}`));
  },
};

// User Profile API (Me)
export const meAPI = {
  getProfile: () => safeApiCall(() => api.get('/me')),
  updateProfile: (data) => safeApiCall(() => api.patch('/me', data)),
  updatePreferences: (data) => safeApiCall(() => api.patch('/me/preferences', data)),
  updateNotifications: (data) => safeApiCall(() => api.patch('/me/notifications', data)),
  uploadAvatar: (file) => {
    const formData = new FormData();
    formData.append('avatar', file);
    return safeApiCall(() => api.post('/me/avatar', formData, {
      headers: { 'Content-Type': 'multipart/form-data' }
    }));
  },
  deleteAvatar: () => safeApiCall(() => api.delete('/me/avatar')),
  changePassword: (data) => safeApiCall(() => api.post('/me/password', data)),
  deleteAccount: (data) => safeApiCall(() => api.delete('/me/account', { data })),
  exportTasksCsv: (params = {}) => {
    const queryParams = new URLSearchParams();
    Object.keys(params).forEach(key => {
      if (params[key] !== undefined && params[key] !== null && params[key] !== '') {
        queryParams.append(key, params[key]);
      }
    });
    const queryString = queryParams.toString();
    return api.get(`/me/tasks/export${queryString ? `?${queryString}` : ''}`, {
      responseType: 'blob'
    });
  },
  getMyTasks: (params = {}) => {
    const queryParams = new URLSearchParams();
    Object.keys(params).forEach(key => {
      if (params[key] !== undefined && params[key] !== null && params[key] !== '') {
        queryParams.append(key, params[key]);
      }
    });
    const queryString = queryParams.toString();
    return safeApiCall(() => api.get(`/me/tasks${queryString ? `?${queryString}` : ''}`));
  },
};

// Billing API
export const billingAPI = {
  getPlans: () => safeApiCall(() => api.get('/billing/plans')),
  getSubscription: (workspaceId) =>
    safeApiCall(() => api.get(`/billing/subscription?workspace_id=${workspaceId}`)),
  createCheckout: (workspaceId) =>
    safeApiCall(() => api.post('/billing/checkout', { workspace_id: workspaceId })),
  createPortalSession: (workspaceId) =>
    safeApiCall(() => api.post('/billing/portal', { workspace_id: workspaceId })),
};

// Admin API
export const adminAPI = {
  getStats: () => safeApiCall(() => api.get('/admin/stats')),
};

export default api;
