/* eslint-disable import/first */
jest.mock('axios', () => require('axios/dist/node/axios.cjs'));

// Mock analytics
const mockTrack = jest.fn();
jest.mock('../../utils/analytics', () => ({
  __esModule: true,
  default: { track: (...args) => mockTrack(...args) },
}));

// Mock authStore
let mockAuthState = { isAuthenticated: false, user: null };
jest.mock('../../store/authStore', () => () => mockAuthState);

// Mock lucide-react
jest.mock('lucide-react', () => ({
  X: (props) => <svg data-testid="x-icon" {...props} />,
}));

// Mock shadcn Button
jest.mock('components/ui/button', () => ({
  Button: ({ children, disabled, ...props }) => (
    <button disabled={disabled} {...props}>{children}</button>
  ),
}));

import { render, screen, act, fireEvent } from '@testing-library/react';
import NpsSurvey from '../NpsSurvey';

const NPS_KEY = 'todoria_nps_survey';

beforeEach(() => {
  jest.useFakeTimers();
  localStorage.clear();
  mockTrack.mockClear();
  mockAuthState = { isAuthenticated: false, user: null };
});

afterEach(() => {
  jest.useRealTimers();
});

function thirtyOneDaysAgo() {
  return new Date(Date.now() - 31 * 24 * 60 * 60 * 1000).toISOString();
}

function tenDaysAgo() {
  return new Date(Date.now() - 10 * 24 * 60 * 60 * 1000).toISOString();
}

describe('NpsSurvey', () => {
  it('should not render when not authenticated', () => {
    const { container } = render(<NpsSurvey />);
    expect(container.innerHTML).toBe('');
  });

  it('should not render when user has no createdAt', () => {
    mockAuthState = { isAuthenticated: true, user: { id: 1 } };
    render(<NpsSurvey />);
    act(() => { jest.advanceTimersByTime(5000); });
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  });

  it('should not render when user account is too new (< 30 days)', () => {
    mockAuthState = { isAuthenticated: true, user: { id: 1, createdAt: tenDaysAgo() } };
    render(<NpsSurvey />);
    act(() => { jest.advanceTimersByTime(5000); });
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  });

  it('should not render when already dismissed in localStorage', () => {
    localStorage.setItem(NPS_KEY, JSON.stringify({ dismissed: true }));
    mockAuthState = { isAuthenticated: true, user: { id: 1, createdAt: thirtyOneDaysAgo() } };
    render(<NpsSurvey />);
    act(() => { jest.advanceTimersByTime(5000); });
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  });

  it('should appear after 3s delay for eligible users', () => {
    mockAuthState = { isAuthenticated: true, user: { id: 1, createdAt: thirtyOneDaysAgo() } };
    render(<NpsSurvey />);

    // Not visible before 3s
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();

    // Visible after 3s
    act(() => { jest.advanceTimersByTime(3000); });
    expect(screen.getByRole('dialog')).toBeInTheDocument();
    expect(screen.getByText('How likely are you to recommend Todoria?')).toBeInTheDocument();
  });

  it('should render 11 score buttons (0-10)', () => {
    mockAuthState = { isAuthenticated: true, user: { id: 1, createdAt: thirtyOneDaysAgo() } };
    render(<NpsSurvey />);
    act(() => { jest.advanceTimersByTime(3000); });

    for (let i = 0; i <= 10; i++) {
      expect(screen.getByText(String(i))).toBeInTheDocument();
    }
  });

  it('should have submit button disabled when no score selected', () => {
    mockAuthState = { isAuthenticated: true, user: { id: 1, createdAt: thirtyOneDaysAgo() } };
    render(<NpsSurvey />);
    act(() => { jest.advanceTimersByTime(3000); });

    const submit = screen.getByText('Submit');
    expect(submit).toBeDisabled();
  });

  it('should enable submit after selecting a score', () => {
    mockAuthState = { isAuthenticated: true, user: { id: 1, createdAt: thirtyOneDaysAgo() } };
    render(<NpsSurvey />);
    act(() => { jest.advanceTimersByTime(3000); });

    fireEvent.click(screen.getByText('9'));
    expect(screen.getByText('Submit')).not.toBeDisabled();
  });

  it('should track analytics and save to localStorage on submit', () => {
    mockAuthState = { isAuthenticated: true, user: { id: 1, createdAt: thirtyOneDaysAgo() } };
    render(<NpsSurvey />);
    act(() => { jest.advanceTimersByTime(3000); });

    fireEvent.click(screen.getByText('8'));
    fireEvent.click(screen.getByText('Submit'));

    expect(mockTrack).toHaveBeenCalledWith('nps_survey_submitted', { score: 8 });
    const stored = JSON.parse(localStorage.getItem(NPS_KEY));
    expect(stored.score).toBe(8);
    expect(stored.at).toBeDefined();
  });

  it('should show thank you message after submit', () => {
    mockAuthState = { isAuthenticated: true, user: { id: 1, createdAt: thirtyOneDaysAgo() } };
    render(<NpsSurvey />);
    act(() => { jest.advanceTimersByTime(3000); });

    fireEvent.click(screen.getByText('7'));
    fireEvent.click(screen.getByText('Submit'));

    expect(screen.getByText('Thank you for your feedback!')).toBeInTheDocument();
  });

  it('should auto-hide 2s after submit', () => {
    mockAuthState = { isAuthenticated: true, user: { id: 1, createdAt: thirtyOneDaysAgo() } };
    render(<NpsSurvey />);
    act(() => { jest.advanceTimersByTime(3000); });

    fireEvent.click(screen.getByText('7'));
    fireEvent.click(screen.getByText('Submit'));

    expect(screen.getByRole('dialog')).toBeInTheDocument();

    act(() => { jest.advanceTimersByTime(2000); });
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  });

  it('should dismiss and save to localStorage when X clicked', () => {
    mockAuthState = { isAuthenticated: true, user: { id: 1, createdAt: thirtyOneDaysAgo() } };
    render(<NpsSurvey />);
    act(() => { jest.advanceTimersByTime(3000); });

    fireEvent.click(screen.getByLabelText('Dismiss survey'));

    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    const stored = JSON.parse(localStorage.getItem(NPS_KEY));
    expect(stored.dismissed).toBe(true);
  });

  it('should not submit when score is null', () => {
    mockAuthState = { isAuthenticated: true, user: { id: 1, createdAt: thirtyOneDaysAgo() } };
    render(<NpsSurvey />);
    act(() => { jest.advanceTimersByTime(3000); });

    // Force click submit without selecting score (button is disabled but test the callback)
    fireEvent.click(screen.getByText('Submit'));

    expect(mockTrack).not.toHaveBeenCalled();
    expect(localStorage.getItem(NPS_KEY)).toBeNull();
  });
});
