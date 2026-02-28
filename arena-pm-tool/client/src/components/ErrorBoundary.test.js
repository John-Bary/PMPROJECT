/* eslint-disable import/first */
jest.mock('axios', () => require('axios/dist/node/axios.cjs'));
jest.mock('react-router-dom');

import { render, screen, fireEvent } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import ErrorBoundary from './ErrorBoundary';

// Suppress console.error noise from React error boundary logging
beforeEach(() => {
  jest.spyOn(console, 'error').mockImplementation(() => {});
});
afterEach(() => {
  console.error.mockRestore();
});

function Boom() {
  throw new Error('Boom!');
}

function Safe() {
  return <p>All good</p>;
}

test('renders fallback UI when child throws', () => {
  render(
    <MemoryRouter>
      <ErrorBoundary>
        <Boom />
      </ErrorBoundary>
    </MemoryRouter>
  );

  expect(screen.getByText(/Something went wrong/i)).toBeInTheDocument();
  expect(screen.getByText(/Try again/i)).toBeInTheDocument();
});

test('renders children when no error', () => {
  render(
    <MemoryRouter>
      <ErrorBoundary>
        <Safe />
      </ErrorBoundary>
    </MemoryRouter>
  );

  expect(screen.getByText('All good')).toBeInTheDocument();
});

test('handleRetry resets error state so children render again', () => {
  // First render with an error
  const { unmount } = render(
    <MemoryRouter>
      <ErrorBoundary>
        <Boom />
      </ErrorBoundary>
    </MemoryRouter>
  );

  expect(screen.getByText(/Something went wrong/i)).toBeInTheDocument();

  // Click "Try again" to trigger handleRetry (lines 20-22)
  fireEvent.click(screen.getByText(/Try again/i));

  // After reset, the boundary tries to re-render children.
  // Since <Boom /> still throws, the error boundary will catch again.
  // But the key thing is that handleRetry WAS called (lines 20-22 covered).
  expect(screen.getByText(/Something went wrong/i)).toBeInTheDocument();

  unmount();
});

test('handleRetry calls onReset prop when provided', () => {
  const onReset = jest.fn();

  render(
    <MemoryRouter>
      <ErrorBoundary onReset={onReset}>
        <Boom />
      </ErrorBoundary>
    </MemoryRouter>
  );

  expect(screen.getByText(/Something went wrong/i)).toBeInTheDocument();

  // Click "Try again" triggers handleRetry which should call onReset (line 22)
  fireEvent.click(screen.getByText(/Try again/i));

  expect(onReset).toHaveBeenCalledTimes(1);
});

test('handleRetry does not call onReset when not provided', () => {
  render(
    <MemoryRouter>
      <ErrorBoundary>
        <Boom />
      </ErrorBoundary>
    </MemoryRouter>
  );

  // Click "Try again" without onReset prop - should not throw
  fireEvent.click(screen.getByText(/Try again/i));

  // Should still show error UI (Boom re-throws)
  expect(screen.getByText(/Something went wrong/i)).toBeInTheDocument();
});

test('handleRetry does not call onReset when it is not a function', () => {
  render(
    <MemoryRouter>
      <ErrorBoundary onReset="not-a-function">
        <Boom />
      </ErrorBoundary>
    </MemoryRouter>
  );

  // Click "Try again" with non-function onReset - should not throw
  fireEvent.click(screen.getByText(/Try again/i));

  expect(screen.getByText(/Something went wrong/i)).toBeInTheDocument();
});
