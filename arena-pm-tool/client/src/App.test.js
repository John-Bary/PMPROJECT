/* eslint-disable import/first */
jest.mock('react-router-dom');
jest.mock('axios', () => require('axios/dist/node/axios.cjs'));
jest.mock('./pages/Dashboard', () => {
  const React = require('react');
  return () => <div>Dashboard Page</div>;
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

test('renders login screen by default', () => {
  window.history.pushState({}, '', '/');
  render(<App />);
  expect(screen.getByText(/sign in to your account/i)).toBeInTheDocument();
});

test('shows 404 page for unknown route', () => {
  window.history.pushState({}, '', '/does-not-exist');
  render(<App />);
  expect(screen.getByText(/Error 404/i)).toBeInTheDocument();
});
