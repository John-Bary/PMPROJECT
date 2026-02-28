import { act } from 'react';
import useAuthStore from '../authStore';
import { authAPI, meAPI } from '../../utils/api';
import { toast } from 'sonner';

// Mock analytics
jest.mock('../../utils/analytics', () => ({
  __esModule: true,
  default: { identify: jest.fn(), track: jest.fn(), reset: jest.fn() },
  EVENTS: { LOGIN: 'login', SIGNUP: 'signup', LOGOUT: 'logout' },
}));

// Mock the API module
jest.mock('../../utils/api', () => ({
  authAPI: {
    login: jest.fn(),
    register: jest.fn(),
    logout: jest.fn(),
    getCurrentUser: jest.fn(),
  },
  meAPI: {
    updateProfile: jest.fn(),
    updatePreferences: jest.fn(),
    updateNotifications: jest.fn(),
    uploadAvatar: jest.fn(),
    deleteAvatar: jest.fn(),
    getProfile: jest.fn(),
  },
  resetAuthInterceptorFlag: jest.fn(),
}));

// Mock sonner
jest.mock('sonner', () => ({
  toast: Object.assign(jest.fn(), {
    success: jest.fn(),
    error: jest.fn(),
  }),
}));

// Mock localStorage
const localStorageMock = {
  store: {},
  getItem: jest.fn((key) => localStorageMock.store[key] || null),
  setItem: jest.fn((key, value) => { localStorageMock.store[key] = value; }),
  removeItem: jest.fn((key) => { delete localStorageMock.store[key]; }),
  clear: jest.fn(() => { localStorageMock.store = {}; }),
};
Object.defineProperty(window, 'localStorage', { value: localStorageMock });

describe('Auth Store', () => {
  beforeEach(() => {
    // Reset store to initial state
    useAuthStore.setState({
      user: null,
      token: null,
      isAuthenticated: false,
      isLoading: false,
      error: null,
    });
    // Clear all mocks
    jest.clearAllMocks();
    localStorageMock.clear();
  });

  describe('login', () => {
    it('should set isLoading to true during login', async () => {
      authAPI.login.mockImplementation(() => new Promise(() => {})); // Never resolves

      // eslint-disable-next-line no-unused-vars
      const loginPromise = useAuthStore.getState().login({ email: 'test@test.com', password: 'password' });

      expect(useAuthStore.getState().isLoading).toBe(true);
    });

    it('should store sanitized user in localStorage on success (no token — cookie auth)', async () => {
      const mockUser = { id: 1, name: 'Test User', email: 'test@test.com' };
      authAPI.login.mockResolvedValue({
        data: { data: { user: mockUser } }
      });

      await act(async () => {
        await useAuthStore.getState().login({ email: 'test@test.com', password: 'password' });
      });

      // Store sanitizes user (strips email, adds role/avatarUrl/emailVerified)
      expect(localStorageMock.setItem).toHaveBeenCalledWith(
        'user',
        JSON.stringify({ id: 1, name: 'Test User', role: undefined, avatarUrl: undefined, emailVerified: undefined })
      );
    });

    it('should update state correctly on success', async () => {
      const mockUser = { id: 1, name: 'Test User', email: 'test@test.com' };
      authAPI.login.mockResolvedValue({
        data: { data: { user: mockUser } }
      });

      await act(async () => {
        await useAuthStore.getState().login({ email: 'test@test.com', password: 'password' });
      });

      const state = useAuthStore.getState();
      expect(state.user).toEqual(mockUser);
      expect(state.token).toBeNull(); // Token managed via httpOnly cookies only
      expect(state.isAuthenticated).toBe(true);
      expect(state.isLoading).toBe(false);
      expect(state.error).toBeNull();
    });

    it('should show success toast on successful login', async () => {
      authAPI.login.mockResolvedValue({
        data: { data: { user: { id: 1 }, token: 'token' } }
      });

      await act(async () => {
        await useAuthStore.getState().login({ email: 'test@test.com', password: 'password' });
      });

      expect(toast.success).toHaveBeenCalledWith('Welcome back!');
    });

    it('should handle login error and show toast', async () => {
      const errorMessage = 'Invalid credentials';
      authAPI.login.mockRejectedValue({
        response: { data: { message: errorMessage } }
      });

      await act(async () => {
        const result = await useAuthStore.getState().login({ email: 'test@test.com', password: 'wrong' });
        expect(result.success).toBe(false);
        expect(result.error).toBe(errorMessage);
      });

      const state = useAuthStore.getState();
      expect(state.error).toBe(errorMessage);
      expect(state.isLoading).toBe(false);
      expect(toast.error).toHaveBeenCalledWith(errorMessage);
    });
  });

  describe('register', () => {
    it('should register user and store credentials', async () => {
      const mockUser = { id: 1, name: 'New User', email: 'new@test.com' };
      const mockToken = 'new-token';
      authAPI.register.mockResolvedValue({
        data: { data: { user: mockUser, token: mockToken } }
      });

      await act(async () => {
        const result = await useAuthStore.getState().register({
          email: 'new@test.com',
          password: 'password123',
          name: 'New User'
        });
        expect(result.success).toBe(true);
      });

      const state = useAuthStore.getState();
      expect(state.user).toEqual(mockUser);
      expect(state.isAuthenticated).toBe(true);
      expect(toast.success).toHaveBeenCalledWith('Account created! Please check your email to verify.');
    });

    it('should handle registration error', async () => {
      const errorMessage = 'Email already exists';
      authAPI.register.mockRejectedValue({
        response: { data: { message: errorMessage } }
      });

      await act(async () => {
        const result = await useAuthStore.getState().register({
          email: 'existing@test.com',
          password: 'password123',
          name: 'Test'
        });
        expect(result.success).toBe(false);
      });

      expect(toast.error).toHaveBeenCalledWith(errorMessage);
    });
  });

  describe('logout', () => {
    it('should clear localStorage and state', async () => {
      // Set initial authenticated state
      useAuthStore.setState({
        user: { id: 1 },
        token: 'token',
        isAuthenticated: true,
      });
      localStorageMock.store = { user: '{}', token: 'token' };
      authAPI.logout.mockResolvedValue({});

      await act(async () => {
        await useAuthStore.getState().logout();
      });

      expect(localStorageMock.removeItem).toHaveBeenCalledWith('user');
      // Token no longer stored in localStorage (cookie-only auth)

      const state = useAuthStore.getState();
      expect(state.user).toBeNull();
      expect(state.token).toBeNull();
      expect(state.isAuthenticated).toBe(false);
    });

    it('should still clear local session on server error', async () => {
      useAuthStore.setState({
        user: { id: 1 },
        token: 'token',
        isAuthenticated: true,
      });
      authAPI.logout.mockRejectedValue(new Error('Server error'));

      await act(async () => {
        await useAuthStore.getState().logout();
      });

      const state = useAuthStore.getState();
      expect(state.isAuthenticated).toBe(false);
      expect(localStorageMock.removeItem).toHaveBeenCalled();
    });
  });

  describe('fetchCurrentUser', () => {
    it('should update user state on success', async () => {
      const mockUser = { id: 1, name: 'User', email: 'user@test.com' };
      authAPI.getCurrentUser.mockResolvedValue({
        data: { data: { user: mockUser } }
      });

      await act(async () => {
        await useAuthStore.getState().fetchCurrentUser();
      });

      const state = useAuthStore.getState();
      expect(state.user).toEqual(mockUser);
      expect(state.isLoading).toBe(false);
    });

    it('should clear auth on error (expired session)', async () => {
      useAuthStore.setState({
        user: { id: 1 },
        token: 'token',
        isAuthenticated: true,
      });
      authAPI.getCurrentUser.mockRejectedValue(new Error('Unauthorized'));

      await act(async () => {
        await useAuthStore.getState().fetchCurrentUser();
      });

      const state = useAuthStore.getState();
      expect(state.user).toBeNull();
      expect(state.token).toBeNull();
      expect(state.isAuthenticated).toBe(false);
      expect(toast.error).toHaveBeenCalledWith('Your session has expired. Please log in again.');
    });
  });

  describe('updateProfile', () => {
    it('should update user in state and localStorage', async () => {
      const updatedUser = { id: 1, name: 'Updated Name', email: 'test@test.com' };
      meAPI.updateProfile.mockResolvedValue({
        data: { data: { user: updatedUser } }
      });

      await act(async () => {
        const result = await useAuthStore.getState().updateProfile({ name: 'Updated Name' });
        expect(result.success).toBe(true);
      });

      const state = useAuthStore.getState();
      expect(state.user).toEqual(updatedUser);
      // localStorage stores sanitized user (strips email)
      expect(localStorageMock.setItem).toHaveBeenCalledWith(
        'user',
        JSON.stringify({ id: 1, name: 'Updated Name', role: undefined, avatarUrl: undefined, emailVerified: undefined })
      );
      expect(toast.success).toHaveBeenCalledWith('Profile updated successfully');
    });

    it('should handle updateProfile error with server message', async () => {
      const errorMessage = 'Name is required';
      meAPI.updateProfile.mockRejectedValue({
        response: { data: { message: errorMessage } }
      });

      await act(async () => {
        const result = await useAuthStore.getState().updateProfile({ name: '' });
        expect(result.success).toBe(false);
        expect(result.error).toBe(errorMessage);
      });

      const state = useAuthStore.getState();
      expect(state.error).toBe(errorMessage);
      expect(state.isLoading).toBe(false);
      expect(toast.error).toHaveBeenCalledWith(errorMessage);
    });

    it('should handle updateProfile error with fallback message', async () => {
      meAPI.updateProfile.mockRejectedValue(new Error('Network error'));

      await act(async () => {
        const result = await useAuthStore.getState().updateProfile({ name: 'Test' });
        expect(result.success).toBe(false);
        expect(result.error).toBe('Failed to update profile');
      });

      const state = useAuthStore.getState();
      expect(state.error).toBe('Failed to update profile');
      expect(state.isLoading).toBe(false);
      expect(toast.error).toHaveBeenCalledWith('Failed to update profile');
    });
  });

  describe('updatePreferences', () => {
    it('should merge preferences into user state', async () => {
      useAuthStore.setState({
        user: { id: 1, name: 'User' },
      });
      meAPI.updatePreferences.mockResolvedValue({
        data: { data: { preferences: { language: 'en', timezone: 'UTC' } } }
      });

      await act(async () => {
        const result = await useAuthStore.getState().updatePreferences({ language: 'en' });
        expect(result.success).toBe(true);
      });

      const state = useAuthStore.getState();
      expect(state.user.language).toBe('en');
      expect(state.user.timezone).toBe('UTC');
    });

    it('should handle updatePreferences error with server message', async () => {
      const errorMessage = 'Invalid timezone';
      meAPI.updatePreferences.mockRejectedValue({
        response: { data: { message: errorMessage } }
      });

      await act(async () => {
        const result = await useAuthStore.getState().updatePreferences({ timezone: 'INVALID' });
        expect(result.success).toBe(false);
        expect(result.error).toBe(errorMessage);
      });

      const state = useAuthStore.getState();
      expect(state.error).toBe(errorMessage);
      expect(state.isLoading).toBe(false);
      expect(toast.error).toHaveBeenCalledWith(errorMessage);
    });

    it('should handle updatePreferences error with fallback message', async () => {
      meAPI.updatePreferences.mockRejectedValue(new Error('Network error'));

      await act(async () => {
        const result = await useAuthStore.getState().updatePreferences({ language: 'fr' });
        expect(result.success).toBe(false);
        expect(result.error).toBe('Failed to update preferences');
      });

      const state = useAuthStore.getState();
      expect(state.error).toBe('Failed to update preferences');
      expect(toast.error).toHaveBeenCalledWith('Failed to update preferences');
    });
  });

  describe('updateNotifications', () => {
    it('should merge notification settings into user state', async () => {
      useAuthStore.setState({
        user: { id: 1, name: 'User' },
      });
      meAPI.updateNotifications.mockResolvedValue({
        data: { data: { notifications: { emailNotificationsEnabled: true, emailDigestMode: 'daily' } } }
      });

      await act(async () => {
        const result = await useAuthStore.getState().updateNotifications({ emailNotificationsEnabled: true });
        expect(result.success).toBe(true);
        expect(result.notifications).toEqual({ emailNotificationsEnabled: true, emailDigestMode: 'daily' });
      });

      const state = useAuthStore.getState();
      expect(state.user.emailNotificationsEnabled).toBe(true);
      expect(state.user.emailDigestMode).toBe('daily');
      expect(state.isLoading).toBe(false);
      expect(state.error).toBeNull();
      expect(toast.success).toHaveBeenCalledWith('Notification settings updated successfully');
    });

    it('should store sanitized user in localStorage after notification update', async () => {
      useAuthStore.setState({
        user: { id: 1, name: 'User', role: 'admin', avatarUrl: null, emailVerified: true },
      });
      meAPI.updateNotifications.mockResolvedValue({
        data: { data: { notifications: { emailNotificationsEnabled: false, emailDigestMode: 'weekly' } } }
      });

      await act(async () => {
        await useAuthStore.getState().updateNotifications({ emailNotificationsEnabled: false });
      });

      expect(localStorageMock.setItem).toHaveBeenCalledWith(
        'user',
        JSON.stringify({ id: 1, name: 'User', role: 'admin', avatarUrl: null, emailVerified: true })
      );
    });

    it('should handle updateNotifications error with server message', async () => {
      const errorMessage = 'Invalid digest mode';
      meAPI.updateNotifications.mockRejectedValue({
        response: { data: { message: errorMessage } }
      });

      await act(async () => {
        const result = await useAuthStore.getState().updateNotifications({ emailDigestMode: 'invalid' });
        expect(result.success).toBe(false);
        expect(result.error).toBe(errorMessage);
      });

      const state = useAuthStore.getState();
      expect(state.error).toBe(errorMessage);
      expect(state.isLoading).toBe(false);
      expect(toast.error).toHaveBeenCalledWith(errorMessage);
    });

    it('should handle updateNotifications error with fallback message', async () => {
      meAPI.updateNotifications.mockRejectedValue(new Error('Network error'));

      await act(async () => {
        const result = await useAuthStore.getState().updateNotifications({ emailNotificationsEnabled: true });
        expect(result.success).toBe(false);
        expect(result.error).toBe('Failed to update notification settings');
      });

      expect(toast.error).toHaveBeenCalledWith('Failed to update notification settings');
    });
  });

  describe('uploadAvatar', () => {
    it('should update avatarUrl in user state', async () => {
      useAuthStore.setState({
        user: { id: 1, name: 'User' },
      });
      meAPI.uploadAvatar.mockResolvedValue({
        data: { data: { avatarUrl: 'https://example.com/avatar.jpg' } }
      });

      await act(async () => {
        const result = await useAuthStore.getState().uploadAvatar(new File([''], 'avatar.jpg'));
        expect(result.success).toBe(true);
        expect(result.avatarUrl).toBe('https://example.com/avatar.jpg');
      });

      const state = useAuthStore.getState();
      expect(state.user.avatarUrl).toBe('https://example.com/avatar.jpg');
      expect(toast.success).toHaveBeenCalledWith('Avatar uploaded successfully');
    });

    it('should handle uploadAvatar error with server message', async () => {
      const errorMessage = 'File too large';
      meAPI.uploadAvatar.mockRejectedValue({
        response: { data: { message: errorMessage } }
      });

      await act(async () => {
        const result = await useAuthStore.getState().uploadAvatar(new File([''], 'big.jpg'));
        expect(result.success).toBe(false);
        expect(result.error).toBe(errorMessage);
      });

      const state = useAuthStore.getState();
      expect(state.error).toBe(errorMessage);
      expect(state.isLoading).toBe(false);
      expect(toast.error).toHaveBeenCalledWith(errorMessage);
    });

    it('should handle uploadAvatar error with fallback message', async () => {
      meAPI.uploadAvatar.mockRejectedValue(new Error('Network error'));

      await act(async () => {
        const result = await useAuthStore.getState().uploadAvatar(new File([''], 'avatar.jpg'));
        expect(result.success).toBe(false);
        expect(result.error).toBe('Failed to upload avatar');
      });

      expect(toast.error).toHaveBeenCalledWith('Failed to upload avatar');
    });
  });

  describe('deleteAvatar', () => {
    it('should set avatarUrl to null in user state on success', async () => {
      useAuthStore.setState({
        user: { id: 1, name: 'User', avatarUrl: 'https://example.com/avatar.jpg' },
      });
      meAPI.deleteAvatar.mockResolvedValue({});

      await act(async () => {
        const result = await useAuthStore.getState().deleteAvatar();
        expect(result.success).toBe(true);
      });

      const state = useAuthStore.getState();
      expect(state.user.avatarUrl).toBeNull();
      expect(state.isLoading).toBe(false);
      expect(state.error).toBeNull();
      expect(toast.success).toHaveBeenCalledWith('Avatar removed successfully');
    });

    it('should store sanitized user in localStorage after avatar deletion', async () => {
      useAuthStore.setState({
        user: { id: 1, name: 'User', role: 'member', avatarUrl: 'https://example.com/avatar.jpg', emailVerified: true },
      });
      meAPI.deleteAvatar.mockResolvedValue({});

      await act(async () => {
        await useAuthStore.getState().deleteAvatar();
      });

      expect(localStorageMock.setItem).toHaveBeenCalledWith(
        'user',
        JSON.stringify({ id: 1, name: 'User', role: 'member', avatarUrl: null, emailVerified: true })
      );
    });

    it('should handle deleteAvatar error with server message', async () => {
      const errorMessage = 'No avatar to delete';
      meAPI.deleteAvatar.mockRejectedValue({
        response: { data: { message: errorMessage } }
      });

      await act(async () => {
        const result = await useAuthStore.getState().deleteAvatar();
        expect(result.success).toBe(false);
        expect(result.error).toBe(errorMessage);
      });

      const state = useAuthStore.getState();
      expect(state.error).toBe(errorMessage);
      expect(state.isLoading).toBe(false);
      expect(toast.error).toHaveBeenCalledWith(errorMessage);
    });

    it('should handle deleteAvatar error with fallback message', async () => {
      meAPI.deleteAvatar.mockRejectedValue(new Error('Network error'));

      await act(async () => {
        const result = await useAuthStore.getState().deleteAvatar();
        expect(result.success).toBe(false);
        expect(result.error).toBe('Failed to remove avatar');
      });

      expect(toast.error).toHaveBeenCalledWith('Failed to remove avatar');
    });
  });

  describe('fetchProfile', () => {
    it('should fetch and store full user profile on success', async () => {
      const mockUser = { id: 1, name: 'User', email: 'user@test.com', language: 'en', timezone: 'UTC' };
      meAPI.getProfile.mockResolvedValue({
        data: { data: { user: mockUser } }
      });

      await act(async () => {
        const result = await useAuthStore.getState().fetchProfile();
        expect(result.success).toBe(true);
        expect(result.user).toEqual(mockUser);
      });

      const state = useAuthStore.getState();
      expect(state.user).toEqual(mockUser);
      expect(state.isLoading).toBe(false);
      expect(state.error).toBeNull();
    });

    it('should store sanitized user in localStorage after fetchProfile', async () => {
      const mockUser = { id: 2, name: 'Jane', email: 'jane@test.com', role: 'admin', avatarUrl: 'https://example.com/jane.jpg', emailVerified: true };
      meAPI.getProfile.mockResolvedValue({
        data: { data: { user: mockUser } }
      });

      await act(async () => {
        await useAuthStore.getState().fetchProfile();
      });

      expect(localStorageMock.setItem).toHaveBeenCalledWith(
        'user',
        JSON.stringify({ id: 2, name: 'Jane', role: 'admin', avatarUrl: 'https://example.com/jane.jpg', emailVerified: true })
      );
    });

    it('should handle fetchProfile error gracefully', async () => {
      const error = new Error('Server error');
      meAPI.getProfile.mockRejectedValue(error);

      await act(async () => {
        const result = await useAuthStore.getState().fetchProfile();
        expect(result.success).toBe(false);
        expect(result.error).toBe('Server error');
      });

      const state = useAuthStore.getState();
      expect(state.isLoading).toBe(false);
    });

    it('should set isLoading during fetchProfile', async () => {
      meAPI.getProfile.mockImplementation(() => new Promise(() => {})); // Never resolves

      // eslint-disable-next-line no-unused-vars
      const fetchPromise = useAuthStore.getState().fetchProfile();

      expect(useAuthStore.getState().isLoading).toBe(true);
    });
  });

  describe('clearError', () => {
    it('should clear error state', () => {
      useAuthStore.setState({ error: 'Some error' });

      act(() => {
        useAuthStore.getState().clearError();
      });

      expect(useAuthStore.getState().error).toBeNull();
    });
  });
});
