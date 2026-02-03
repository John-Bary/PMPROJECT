import { act } from 'react';
import useAuthStore from '../authStore';
import { authAPI, meAPI } from '../../utils/api';
import toast from 'react-hot-toast';

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

// Mock react-hot-toast
jest.mock('react-hot-toast', () => ({
  success: jest.fn(),
  error: jest.fn(),
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

    it('should store user and token in localStorage on success', async () => {
      const mockUser = { id: 1, name: 'Test User', email: 'test@test.com' };
      const mockToken = 'test-token';
      authAPI.login.mockResolvedValue({
        data: { data: { user: mockUser, token: mockToken } }
      });

      await act(async () => {
        await useAuthStore.getState().login({ email: 'test@test.com', password: 'password' });
      });

      expect(localStorageMock.setItem).toHaveBeenCalledWith('user', JSON.stringify(mockUser));
      expect(localStorageMock.setItem).toHaveBeenCalledWith('token', mockToken);
    });

    it('should update state correctly on success', async () => {
      const mockUser = { id: 1, name: 'Test User', email: 'test@test.com' };
      const mockToken = 'test-token';
      authAPI.login.mockResolvedValue({
        data: { data: { user: mockUser, token: mockToken } }
      });

      await act(async () => {
        await useAuthStore.getState().login({ email: 'test@test.com', password: 'password' });
      });

      const state = useAuthStore.getState();
      expect(state.user).toEqual(mockUser);
      expect(state.token).toBe(mockToken);
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
      expect(toast.success).toHaveBeenCalledWith('Account created successfully!');
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
      expect(localStorageMock.removeItem).toHaveBeenCalledWith('token');

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
      expect(localStorageMock.setItem).toHaveBeenCalledWith('user', JSON.stringify(updatedUser));
      expect(toast.success).toHaveBeenCalledWith('Profile updated successfully');
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
