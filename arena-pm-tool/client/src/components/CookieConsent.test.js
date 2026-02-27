/* eslint-disable import/first */
jest.mock('axios', () => require('axios/dist/node/axios.cjs'));
jest.mock('sonner', () => ({
  toast: Object.assign(jest.fn(), {
    success: jest.fn(),
    error: jest.fn(),
  }),
}));
jest.mock('react-router-dom', () => ({
  Link: ({ to, children, ...rest }) => <a href={to} {...rest}>{children}</a>,
}));
jest.mock('components/ui/button', () => ({
  Button: ({ children, ...props }) => <button {...props}>{children}</button>,
}));

import { render, screen, act, fireEvent } from '@testing-library/react';
import CookieConsent from './CookieConsent';

const COOKIE_CONSENT_KEY = 'todoria_cookie_consent';

beforeEach(() => {
  localStorage.clear();
  jest.useFakeTimers();
});

afterEach(() => {
  jest.useRealTimers();
});

describe('CookieConsent', () => {
  test('does not render initially (before the 500ms delay)', () => {
    render(<CookieConsent />);

    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  });

  test('renders the consent banner after 500ms delay when no consent stored', () => {
    render(<CookieConsent />);

    act(() => {
      jest.advanceTimersByTime(500);
    });

    expect(screen.getByRole('dialog', { name: /cookie consent/i })).toBeInTheDocument();
    expect(screen.getByText(/essential cookies/i)).toBeInTheDocument();
    expect(screen.getByText('Got it')).toBeInTheDocument();
    expect(screen.getByText('Privacy Policy')).toBeInTheDocument();
  });

  test('does not render when consent was already given', () => {
    localStorage.setItem(COOKIE_CONSENT_KEY, 'accepted');

    render(<CookieConsent />);

    act(() => {
      jest.advanceTimersByTime(1000);
    });

    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  });

  test('clicking "Got it" hides the banner and saves consent to localStorage', () => {
    render(<CookieConsent />);

    act(() => {
      jest.advanceTimersByTime(500);
    });

    expect(screen.getByRole('dialog', { name: /cookie consent/i })).toBeInTheDocument();

    fireEvent.click(screen.getByText('Got it'));

    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    expect(localStorage.getItem(COOKIE_CONSENT_KEY)).toBe('accepted');
  });

  test('the Privacy Policy link points to /privacy', () => {
    render(<CookieConsent />);

    act(() => {
      jest.advanceTimersByTime(500);
    });

    const link = screen.getByText('Privacy Policy');
    expect(link).toHaveAttribute('href', '/privacy');
  });

  test('banner stays hidden after consent on re-render', () => {
    localStorage.setItem(COOKIE_CONSENT_KEY, 'accepted');

    const { unmount } = render(<CookieConsent />);

    act(() => {
      jest.advanceTimersByTime(1000);
    });

    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();

    // Re-mount - should still be hidden
    unmount();
    render(<CookieConsent />);

    act(() => {
      jest.advanceTimersByTime(1000);
    });

    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  });
});
