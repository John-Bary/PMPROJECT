/* eslint-disable import/first */
jest.mock('axios', () => require('axios/dist/node/axios.cjs'));
jest.mock('sonner', () => ({
  toast: Object.assign(jest.fn(), {
    success: jest.fn(),
    error: jest.fn(),
  }),
}));

// Mock authStore as a controllable getter
let mockAuthState = { isAuthenticated: false, user: null };
jest.mock('../store/authStore', () => {
  return () => mockAuthState;
});

// Capture Navigate renders so we can assert on redirect targets
const mockNavigate = jest.fn(() => null);
let mockLocation = { pathname: '/dashboard', search: '' };
jest.mock('react-router-dom', () => ({
  Navigate: (props) => {
    mockNavigate(props);
    return null;
  },
  useLocation: () => mockLocation,
}));

import { render, screen } from '@testing-library/react';
import ProtectedRoute from './ProtectedRoute';

beforeEach(() => {
  localStorage.clear();
  mockNavigate.mockClear();
  mockAuthState = { isAuthenticated: false, user: null };
  mockLocation = { pathname: '/dashboard', search: '' };
});

describe('ProtectedRoute', () => {
  test('redirects to /login when not authenticated', () => {
    mockAuthState = { isAuthenticated: false, user: null };

    render(
      <ProtectedRoute>
        <div>Secret Content</div>
      </ProtectedRoute>
    );

    expect(screen.queryByText('Secret Content')).not.toBeInTheDocument();
    expect(mockNavigate).toHaveBeenCalledWith(
      expect.objectContaining({
        to: expect.stringContaining('/login'),
        replace: true,
      })
    );
  });

  test('includes returnUrl query param when on a non-root path', () => {
    mockAuthState = { isAuthenticated: false, user: null };
    mockLocation = { pathname: '/dashboard', search: '?tab=board' };

    render(
      <ProtectedRoute>
        <div>Secret Content</div>
      </ProtectedRoute>
    );

    expect(mockNavigate).toHaveBeenCalledWith(
      expect.objectContaining({
        to: '/login?returnUrl=%2Fdashboard%3Ftab%3Dboard',
        replace: true,
      })
    );
  });

  test('does not include returnUrl when on root path', () => {
    mockAuthState = { isAuthenticated: false, user: null };
    mockLocation = { pathname: '/', search: '' };

    render(
      <ProtectedRoute>
        <div>Secret Content</div>
      </ProtectedRoute>
    );

    expect(mockNavigate).toHaveBeenCalledWith(
      expect.objectContaining({
        to: '/login',
        replace: true,
      })
    );
  });

  test('renders children when authenticated and email verified', () => {
    mockAuthState = {
      isAuthenticated: true,
      user: { id: 1, name: 'Test', emailVerified: true },
    };

    render(
      <ProtectedRoute>
        <div>Secret Content</div>
      </ProtectedRoute>
    );

    expect(screen.getByText('Secret Content')).toBeInTheDocument();
    expect(mockNavigate).not.toHaveBeenCalled();
  });

  test('redirects to /verify-email-pending when email is not verified', () => {
    mockAuthState = {
      isAuthenticated: true,
      user: { id: 1, name: 'Test', emailVerified: false },
    };

    render(
      <ProtectedRoute>
        <div>Secret Content</div>
      </ProtectedRoute>
    );

    expect(screen.queryByText('Secret Content')).not.toBeInTheDocument();
    expect(mockNavigate).toHaveBeenCalledWith(
      expect.objectContaining({
        to: '/verify-email-pending',
        replace: true,
      })
    );
  });

  test('skips email verification check when skipEmailCheck is true', () => {
    mockAuthState = {
      isAuthenticated: true,
      user: { id: 1, name: 'Test', emailVerified: false },
    };

    render(
      <ProtectedRoute skipEmailCheck>
        <div>Secret Content</div>
      </ProtectedRoute>
    );

    expect(screen.getByText('Secret Content')).toBeInTheDocument();
    expect(mockNavigate).not.toHaveBeenCalled();
  });

  test('renders children when emailVerified is undefined (not strictly false)', () => {
    mockAuthState = {
      isAuthenticated: true,
      user: { id: 1, name: 'Test' },
    };

    render(
      <ProtectedRoute>
        <div>Secret Content</div>
      </ProtectedRoute>
    );

    // emailVerified is undefined (not strictly false), so the check does not redirect
    expect(screen.getByText('Secret Content')).toBeInTheDocument();
    expect(mockNavigate).not.toHaveBeenCalled();
  });
});
