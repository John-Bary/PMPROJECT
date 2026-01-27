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

// Request interceptor - add auth token to headers
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Response interceptor - handle errors globally
api.interceptors.response.use(
  (response) => {
    return response;
  },
  (error) => {
    if (error.response) {
      // Server responded with error status
      if (error.response.status === 401) {
        // Unauthorized - clear token and redirect to login
        localStorage.removeItem('token');
        localStorage.removeItem('user');
        window.location.href = '/login';
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
  getCurrentUser: () => safeApiCall(() => api.get('/auth/me')),
  getAllUsers: () => safeApiCall(() => api.get('/auth/users')),
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
};

// Categories API
export const categoriesAPI = {
  getAll: () => safeApiCall(() => api.get('/categories')),
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

export default api;
