/* eslint-disable import/first */
jest.mock('react-router-dom');

import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import ErrorBoundary from './ErrorBoundary';

function Boom() {
  throw new Error('Boom!');
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
