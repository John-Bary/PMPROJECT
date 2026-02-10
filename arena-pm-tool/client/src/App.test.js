// Polyfill IntersectionObserver for jsdom
global.IntersectionObserver = class {
  constructor(cb) { this._cb = cb; }
  observe() {}
  unobserve() {}
  disconnect() {}
};

/* eslint-disable import/first */
jest.mock('react-router-dom');
jest.mock('axios', () => require('axios/dist/node/axios.cjs'));
jest.mock('sonner', () => ({
  Toaster: () => null,
  toast: Object.assign(jest.fn(), {
    success: jest.fn(),
    error: jest.fn(),
  }),
}));
jest.mock('framer-motion', () => ({
  motion: { div: 'div' },
  AnimatePresence: ({ children }) => children,
}));
jest.mock('./pages/Dashboard', () => {
  const React = require('react');
  return () => <div>Dashboard Page</div>;
});
jest.mock('./pages/LandingPage', () => {
  const React = require('react');
  return () => <div>Landing Page</div>;
});
jest.mock('./pages/ErrorPage', () => {
  const React = require('react');
  return ({ statusCode }) => <div>Error {statusCode}</div>;
});

import { render, screen } from '@testing-library/react';
import App from './App';

beforeEach(() => {
  window.localStorage.clear();
});

test('renders landing page by default', () => {
  window.history.pushState({}, '', '/');
  render(<App />);
  expect(screen.getByText(/Landing Page/)).toBeInTheDocument();
});

test('shows 404 page for unknown route', () => {
  window.history.pushState({}, '', '/does-not-exist');
  render(<App />);
  expect(screen.getByText(/Error 404/i)).toBeInTheDocument();
});
