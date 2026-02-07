// Authentication State Management with Zustand
import { create } from 'zustand';
import { authAPI, meAPI, resetAuthInterceptorFlag } from '../utils/api';
import toast from 'react-hot-toast';

// DATA-01: Only store minimal user fields in localStorage to reduce exposure
const sanitizeUserForStorage = (user) => {
  if (!user) return null;
  return {
    id: user.id,
    name: user.name,
    role: user.role,
    avatarUrl: user.avatarUrl,
  };
};

const useAuthStore = create((set) => ({
  user: JSON.parse(localStorage.getItem('user')) || null,
  token: null, // Token is now managed via httpOnly cookies only
  isAuthenticated: !!localStorage.getItem('user'),
  isLoading: false,
  error: null,

  // Login action
  login: async (credentials) => {
    set({ isLoading: true, error: null });
    try {
      const response = await authAPI.login(credentials);
      const { user } = response.data.data;

      // Store only user profile in localStorage (no token)
      localStorage.setItem('user', JSON.stringify(sanitizeUserForStorage(user)));

      // Reset the 401 interceptor flag so future 401s are handled normally
      resetAuthInterceptorFlag();

      set({
        user,
        isAuthenticated: true,
        isLoading: false,
        error: null,
      });

      toast.success('Welcome back!');
      return { success: true };
    } catch (error) {
      const errorMessage = error.response?.data?.message || 'Login failed';
      set({
        error: errorMessage,
        isLoading: false,
      });
      toast.error(errorMessage);
      return { success: false, error: errorMessage };
    }
  },

  // Register action
  register: async (userData) => {
    set({ isLoading: true, error: null });
    try {
      const response = await authAPI.register(userData);
      const { user } = response.data.data;

      // Store only user profile in localStorage (no token)
      localStorage.setItem('user', JSON.stringify(sanitizeUserForStorage(user)));

      // Reset the 401 interceptor flag so future 401s are handled normally
      resetAuthInterceptorFlag();

      set({
        user,
        isAuthenticated: true,
        isLoading: false,
        error: null,
      });

      toast.success('Account created successfully!');
      return { success: true };
    } catch (error) {
      const errorMessage = error.response?.data?.message || 'Registration failed';
      set({
        error: errorMessage,
        isLoading: false,
      });
      toast.error(errorMessage);
      return { success: false, error: errorMessage };
    }
  },

  // Logout action
  logout: async () => {
    try {
      await authAPI.logout();
    } catch (error) {
      console.error('Logout error:', error);
      toast.error('Failed to log out from the server. Clearing local session.');
    }

    // Clear localStorage (no token to remove — cookies cleared by server)
    localStorage.removeItem('user');

    set({
      user: null,
      token: null,
      isAuthenticated: false,
      error: null,
    });

    toast.success('Logged out successfully');
  },

  // Fetch current user
  fetchCurrentUser: async () => {
    set({ isLoading: true });
    try {
      const response = await authAPI.getCurrentUser();
      const user = response.data.data.user;

      localStorage.setItem('user', JSON.stringify(sanitizeUserForStorage(user)));

      set({
        user,
        isLoading: false,
        error: null,
      });
    } catch (error) {
      console.error('Fetch user error:', error);
      // If fetching user fails, clear auth state
      localStorage.removeItem('user');
      set({
        user: null,
        token: null,
        isAuthenticated: false,
        isLoading: false,
      });
      toast.error('Your session has expired. Please log in again.');
    }
  },

  // Clear error
  clearError: () => set({ error: null }),

  // Update user profile (name fields)
  updateProfile: async (profileData) => {
    set({ isLoading: true, error: null });
    try {
      const response = await meAPI.updateProfile(profileData);
      const user = response.data.data.user;

      localStorage.setItem('user', JSON.stringify(sanitizeUserForStorage(user)));

      set({
        user,
        isLoading: false,
        error: null,
      });

      toast.success('Profile updated successfully');
      return { success: true, user };
    } catch (error) {
      const errorMessage = error.response?.data?.message || 'Failed to update profile';
      set({
        error: errorMessage,
        isLoading: false,
      });
      toast.error(errorMessage);
      return { success: false, error: errorMessage };
    }
  },

  // Update user preferences
  updatePreferences: async (preferencesData) => {
    set({ isLoading: true, error: null });
    try {
      const response = await meAPI.updatePreferences(preferencesData);
      const { preferences } = response.data.data;

      // Update user in state with new preferences
      set((state) => {
        const updatedUser = {
          ...state.user,
          language: preferences.language,
          timezone: preferences.timezone,
        };
        localStorage.setItem('user', JSON.stringify(sanitizeUserForStorage(updatedUser)));
        return {
          user: updatedUser,
          isLoading: false,
          error: null,
        };
      });

      toast.success('Preferences updated successfully');
      return { success: true, preferences };
    } catch (error) {
      const errorMessage = error.response?.data?.message || 'Failed to update preferences';
      set({
        error: errorMessage,
        isLoading: false,
      });
      toast.error(errorMessage);
      return { success: false, error: errorMessage };
    }
  },

  // Update notification settings
  updateNotifications: async (notificationData) => {
    set({ isLoading: true, error: null });
    try {
      const response = await meAPI.updateNotifications(notificationData);
      const { notifications } = response.data.data;

      // Update user in state with new notification settings
      set((state) => {
        const updatedUser = {
          ...state.user,
          emailNotificationsEnabled: notifications.emailNotificationsEnabled,
          emailDigestMode: notifications.emailDigestMode,
        };
        localStorage.setItem('user', JSON.stringify(sanitizeUserForStorage(updatedUser)));
        return {
          user: updatedUser,
          isLoading: false,
          error: null,
        };
      });

      toast.success('Notification settings updated successfully');
      return { success: true, notifications };
    } catch (error) {
      const errorMessage = error.response?.data?.message || 'Failed to update notification settings';
      set({
        error: errorMessage,
        isLoading: false,
      });
      toast.error(errorMessage);
      return { success: false, error: errorMessage };
    }
  },

  // Upload avatar
  uploadAvatar: async (file) => {
    set({ isLoading: true, error: null });
    try {
      const response = await meAPI.uploadAvatar(file);
      const { avatarUrl } = response.data.data;

      // Update user in state with new avatar
      set((state) => {
        const updatedUser = {
          ...state.user,
          avatarUrl,
        };
        localStorage.setItem('user', JSON.stringify(sanitizeUserForStorage(updatedUser)));
        return {
          user: updatedUser,
          isLoading: false,
          error: null,
        };
      });

      toast.success('Avatar uploaded successfully');
      return { success: true, avatarUrl };
    } catch (error) {
      const errorMessage = error.response?.data?.message || 'Failed to upload avatar';
      set({
        error: errorMessage,
        isLoading: false,
      });
      toast.error(errorMessage);
      return { success: false, error: errorMessage };
    }
  },

  // Delete avatar
  deleteAvatar: async () => {
    set({ isLoading: true, error: null });
    try {
      await meAPI.deleteAvatar();

      // Update user in state with null avatar
      set((state) => {
        const updatedUser = {
          ...state.user,
          avatarUrl: null,
        };
        localStorage.setItem('user', JSON.stringify(sanitizeUserForStorage(updatedUser)));
        return {
          user: updatedUser,
          isLoading: false,
          error: null,
        };
      });

      toast.success('Avatar removed successfully');
      return { success: true };
    } catch (error) {
      const errorMessage = error.response?.data?.message || 'Failed to remove avatar';
      set({
        error: errorMessage,
        isLoading: false,
      });
      toast.error(errorMessage);
      return { success: false, error: errorMessage };
    }
  },

  // Fetch full profile (includes preferences and notifications)
  fetchProfile: async () => {
    set({ isLoading: true });
    try {
      const response = await meAPI.getProfile();
      const user = response.data.data.user;

      localStorage.setItem('user', JSON.stringify(sanitizeUserForStorage(user)));

      set({
        user,
        isLoading: false,
        error: null,
      });

      return { success: true, user };
    } catch (error) {
      console.error('Fetch profile error:', error);
      set({ isLoading: false });
      return { success: false, error: error.message };
    }
  },
}));

export default useAuthStore;
