/* eslint-disable import/first */
jest.mock('axios', () => require('axios/dist/node/axios.cjs'));

// ---------- Store mocks ----------
let mockWorkspaceState;
const defaultWorkspaceState = {
  workspaces: [],
  currentWorkspace: null,
  currentWorkspaceId: null,
  members: [],
  invitations: [],
  isLoading: false,
  isInitialized: false,
  error: null,
  initialize: jest.fn(),
  switchWorkspace: jest.fn(),
  getCurrentWorkspace: jest.fn(),
  getCurrentWorkspaceId: jest.fn(),
  fetchWorkspaces: jest.fn(),
  createWorkspace: jest.fn(),
  updateWorkspace: jest.fn(),
  deleteWorkspace: jest.fn(),
  fetchMembers: jest.fn(),
  inviteUser: jest.fn(),
  acceptInvitation: jest.fn(),
  fetchInvitations: jest.fn(),
  removeMember: jest.fn(),
  updateMemberRole: jest.fn(),
  cancelInvitation: jest.fn(),
  isCurrentUserAdmin: jest.fn(() => false),
  clear: jest.fn(),
};

let mockAuthState;
const defaultAuthState = { isAuthenticated: false, user: null };

let mockTaskState;
const defaultTaskState = { clearTasks: jest.fn(), fetchTasks: jest.fn() };

let mockCategoryState;
const defaultCategoryState = { clearCategories: jest.fn(), fetchCategories: jest.fn() };

jest.mock('../../store/workspaceStore', () => () => mockWorkspaceState);
jest.mock('../../store/authStore', () => () => mockAuthState);
jest.mock('../../store/taskStore', () => () => mockTaskState);
jest.mock('../../store/categoryStore', () => () => mockCategoryState);

// ---------- Router mocks ----------
const mockNavigate = jest.fn();
let mockLocation = { pathname: '/dashboard' };
jest.mock('react-router-dom', () => ({
  useNavigate: () => mockNavigate,
  useLocation: () => mockLocation,
}));

// ---------- Loader mock ----------
jest.mock('../../components/Loader', () => function Loader({ text }) {
  return <div data-testid="loader">{text}</div>;
});

import { render, screen } from '@testing-library/react';
import { WorkspaceProvider, useWorkspace, useCurrentWorkspaceId } from '../WorkspaceContext';

beforeEach(() => {
  mockWorkspaceState = { ...defaultWorkspaceState };
  // Recreate the mock functions so each test gets fresh spies
  Object.keys(defaultWorkspaceState).forEach(key => {
    if (typeof defaultWorkspaceState[key] === 'function') {
      mockWorkspaceState[key] = jest.fn(defaultWorkspaceState[key]);
    }
  });

  mockAuthState = { ...defaultAuthState };
  mockTaskState = { clearTasks: jest.fn(), fetchTasks: jest.fn() };
  mockCategoryState = { clearCategories: jest.fn(), fetchCategories: jest.fn() };
  mockNavigate.mockClear();
  mockLocation = { pathname: '/dashboard' };
});

// ---------- Helper ----------
function TestConsumer() {
  const ctx = useWorkspace();
  return <div data-testid="consumer">{JSON.stringify({ wid: ctx.currentWorkspaceId })}</div>;
}

function WorkspaceIdConsumer() {
  const id = useCurrentWorkspaceId();
  return <div data-testid="wsid">{id || 'null'}</div>;
}

// =============================================================================
describe('WorkspaceContext', () => {
  // ---------------------------------------------------------------------------
  describe('useWorkspace hook', () => {
    it('should throw when used outside WorkspaceProvider', () => {
      // Suppress React error boundary console output
      const spy = jest.spyOn(console, 'error').mockImplementation(() => {});

      expect(() => render(<TestConsumer />)).toThrow(
        'useWorkspace must be used within a WorkspaceProvider'
      );

      spy.mockRestore();
    });
  });

  // ---------------------------------------------------------------------------
  describe('useCurrentWorkspaceId hook', () => {
    it('should return null when used outside provider', () => {
      render(<WorkspaceIdConsumer />);
      expect(screen.getByTestId('wsid').textContent).toBe('null');
    });

    it('should return currentWorkspaceId from context', () => {
      mockAuthState = { isAuthenticated: true, user: { id: 1 } };
      mockWorkspaceState.isInitialized = true;
      mockWorkspaceState.currentWorkspaceId = 'ws-42';

      render(
        <WorkspaceProvider>
          <WorkspaceIdConsumer />
        </WorkspaceProvider>
      );

      expect(screen.getByTestId('wsid').textContent).toBe('ws-42');
    });
  });

  // ---------------------------------------------------------------------------
  describe('WorkspaceProvider', () => {
    it('should show loader when authenticated but not initialized', () => {
      mockAuthState = { isAuthenticated: true, user: { id: 1 } };
      mockWorkspaceState.isInitialized = false;

      render(
        <WorkspaceProvider>
          <div data-testid="child">Child</div>
        </WorkspaceProvider>
      );

      expect(screen.getByTestId('loader')).toBeInTheDocument();
      expect(screen.queryByTestId('child')).not.toBeInTheDocument();
    });

    it('should render children when initialized', () => {
      mockAuthState = { isAuthenticated: true, user: { id: 1 } };
      mockWorkspaceState.isInitialized = true;

      render(
        <WorkspaceProvider>
          <div data-testid="child">Child</div>
        </WorkspaceProvider>
      );

      expect(screen.getByTestId('child')).toBeInTheDocument();
      expect(screen.queryByTestId('loader')).not.toBeInTheDocument();
    });

    it('should render children when not authenticated (public pages)', () => {
      mockAuthState = { isAuthenticated: false, user: null };
      mockWorkspaceState.isInitialized = false;

      render(
        <WorkspaceProvider>
          <div data-testid="child">Child</div>
        </WorkspaceProvider>
      );

      expect(screen.getByTestId('child')).toBeInTheDocument();
    });

    it('should call initialize when authenticated and not initialized', () => {
      mockAuthState = { isAuthenticated: true, user: { id: 1 } };
      mockWorkspaceState.isInitialized = false;

      render(
        <WorkspaceProvider>
          <div />
        </WorkspaceProvider>
      );

      expect(mockWorkspaceState.initialize).toHaveBeenCalled();
    });

    it('should not call initialize when already initialized', () => {
      mockAuthState = { isAuthenticated: true, user: { id: 1 } };
      mockWorkspaceState.isInitialized = true;

      render(
        <WorkspaceProvider>
          <div />
        </WorkspaceProvider>
      );

      expect(mockWorkspaceState.initialize).not.toHaveBeenCalled();
    });

    it('should redirect to /workspaces when authenticated with no workspaces on dashboard', () => {
      mockAuthState = { isAuthenticated: true, user: { id: 1 } };
      mockWorkspaceState.isInitialized = true;
      mockWorkspaceState.isLoading = false;
      mockWorkspaceState.workspaces = [];
      mockLocation = { pathname: '/dashboard' };

      render(
        <WorkspaceProvider>
          <div />
        </WorkspaceProvider>
      );

      expect(mockNavigate).toHaveBeenCalledWith('/workspaces', { replace: true });
    });

    it('should not redirect when user has workspaces', () => {
      mockAuthState = { isAuthenticated: true, user: { id: 1 } };
      mockWorkspaceState.isInitialized = true;
      mockWorkspaceState.isLoading = false;
      mockWorkspaceState.workspaces = [{ id: 'ws-1', name: 'My Workspace' }];
      mockLocation = { pathname: '/dashboard' };

      render(
        <WorkspaceProvider>
          <div />
        </WorkspaceProvider>
      );

      expect(mockNavigate).not.toHaveBeenCalled();
    });

    it('should not redirect when not on a protected route', () => {
      mockAuthState = { isAuthenticated: true, user: { id: 1 } };
      mockWorkspaceState.isInitialized = true;
      mockWorkspaceState.isLoading = false;
      mockWorkspaceState.workspaces = [];
      mockLocation = { pathname: '/settings' };

      render(
        <WorkspaceProvider>
          <div />
        </WorkspaceProvider>
      );

      expect(mockNavigate).not.toHaveBeenCalled();
    });
  });

  // ---------------------------------------------------------------------------
  describe('role helpers', () => {
    function RoleTestConsumer() {
      const ctx = useWorkspace();
      return (
        <div data-testid="roles">
          {JSON.stringify({
            isAdmin: ctx.isCurrentUserAdmin(),
            isViewer: ctx.isCurrentUserViewer(),
            canEdit: ctx.canEdit(),
          })}
        </div>
      );
    }

    it('should identify admin user', () => {
      mockAuthState = { isAuthenticated: true, user: { id: 1 } };
      mockWorkspaceState.isInitialized = true;
      mockWorkspaceState.members = [{ user_id: 1, role: 'admin' }];
      mockWorkspaceState.isCurrentUserAdmin = jest.fn(() => true);

      render(
        <WorkspaceProvider>
          <RoleTestConsumer />
        </WorkspaceProvider>
      );

      const result = JSON.parse(screen.getByTestId('roles').textContent);
      expect(result.isAdmin).toBe(true);
      expect(result.isViewer).toBe(false);
      expect(result.canEdit).toBe(true);
    });

    it('should identify viewer user', () => {
      mockAuthState = { isAuthenticated: true, user: { id: 2 } };
      mockWorkspaceState.isInitialized = true;
      mockWorkspaceState.members = [{ user_id: 2, role: 'viewer' }];

      render(
        <WorkspaceProvider>
          <RoleTestConsumer />
        </WorkspaceProvider>
      );

      const result = JSON.parse(screen.getByTestId('roles').textContent);
      expect(result.isViewer).toBe(true);
      expect(result.canEdit).toBe(false);
    });

    it('should identify regular member as editable', () => {
      mockAuthState = { isAuthenticated: true, user: { id: 3 } };
      mockWorkspaceState.isInitialized = true;
      mockWorkspaceState.members = [{ user_id: 3, role: 'member' }];

      render(
        <WorkspaceProvider>
          <RoleTestConsumer />
        </WorkspaceProvider>
      );

      const result = JSON.parse(screen.getByTestId('roles').textContent);
      expect(result.isViewer).toBe(false);
      expect(result.canEdit).toBe(true);
    });

    it('should default canEdit to true when no members loaded', () => {
      mockAuthState = { isAuthenticated: true, user: { id: 1 } };
      mockWorkspaceState.isInitialized = true;
      mockWorkspaceState.members = [];

      render(
        <WorkspaceProvider>
          <RoleTestConsumer />
        </WorkspaceProvider>
      );

      const result = JSON.parse(screen.getByTestId('roles').textContent);
      expect(result.canEdit).toBe(true);
    });

    it('should return isViewer false when no user', () => {
      mockAuthState = { isAuthenticated: true, user: null };
      mockWorkspaceState.isInitialized = true;
      mockWorkspaceState.members = [{ user_id: 1, role: 'viewer' }];

      render(
        <WorkspaceProvider>
          <RoleTestConsumer />
        </WorkspaceProvider>
      );

      const result = JSON.parse(screen.getByTestId('roles').textContent);
      expect(result.isViewer).toBe(false);
    });
  });

  // ---------------------------------------------------------------------------
  describe('context value', () => {
    it('should expose all expected properties', () => {
      mockAuthState = { isAuthenticated: true, user: { id: 1 } };
      mockWorkspaceState.isInitialized = true;

      const expectedKeys = [
        'workspaces', 'currentWorkspace', 'currentWorkspaceId',
        'members', 'invitations', 'isLoading', 'isInitialized', 'error',
        'currentUser', 'switchWorkspace', 'getCurrentWorkspace',
        'getCurrentWorkspaceId', 'fetchWorkspaces', 'createWorkspace',
        'updateWorkspace', 'deleteWorkspace', 'fetchMembers',
        'removeMember', 'updateMemberRole', 'inviteUser',
        'acceptInvitation', 'fetchInvitations', 'cancelInvitation',
        'isCurrentUserAdmin', 'isCurrentUserViewer', 'canEdit', 'clear',
      ];

      let contextValue;
      function Capture() {
        contextValue = useWorkspace();
        return null;
      }

      render(
        <WorkspaceProvider>
          <Capture />
        </WorkspaceProvider>
      );

      for (const key of expectedKeys) {
        expect(contextValue).toHaveProperty(key);
      }
    });

    it('should pass currentUser from auth store', () => {
      const user = { id: 42, name: 'Test' };
      mockAuthState = { isAuthenticated: true, user };
      mockWorkspaceState.isInitialized = true;

      let contextValue;
      function Capture() {
        contextValue = useWorkspace();
        return null;
      }

      render(
        <WorkspaceProvider>
          <Capture />
        </WorkspaceProvider>
      );

      expect(contextValue.currentUser).toEqual(user);
    });
  });
});
