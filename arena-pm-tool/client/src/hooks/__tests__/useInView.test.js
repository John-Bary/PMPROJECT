/* eslint-disable import/first */
jest.mock('axios', () => require('axios/dist/node/axios.cjs'));

import { render, act, screen } from '@testing-library/react';
import { renderHook } from '@testing-library/react';
import useInView from '../useInView';

let mockObserverCallback;
const mockObserve = jest.fn();
const mockUnobserve = jest.fn();
const mockDisconnect = jest.fn();

beforeEach(() => {
  jest.clearAllMocks();
  // Override the global IntersectionObserver mock
  window.IntersectionObserver = jest.fn((callback) => {
    mockObserverCallback = callback;
    return {
      observe: mockObserve,
      unobserve: mockUnobserve,
      disconnect: mockDisconnect,
    };
  });
});

function TestComponent(props) {
  const [ref, inView] = useInView(props);
  return <div ref={ref} data-testid="target" data-inview={String(inView)} />;
}

describe('useInView', () => {
  it('should return a ref and inView=false initially', () => {
    const { result } = renderHook(() => useInView());
    const [ref, inView] = result.current;

    expect(ref).toHaveProperty('current');
    expect(inView).toBe(false);
  });

  it('should create IntersectionObserver with default threshold and rootMargin', () => {
    render(<TestComponent />);

    expect(window.IntersectionObserver).toHaveBeenCalledTimes(1);
    expect(window.IntersectionObserver).toHaveBeenCalledWith(
      expect.any(Function),
      { threshold: 0.15, rootMargin: '0px 0px -60px 0px' }
    );
    expect(mockObserve).toHaveBeenCalledTimes(1);
  });

  it('should create IntersectionObserver with custom threshold and rootMargin', () => {
    render(<TestComponent threshold={0.5} rootMargin="10px" />);

    expect(window.IntersectionObserver).toHaveBeenCalledTimes(1);
    expect(window.IntersectionObserver).toHaveBeenCalledWith(
      expect.any(Function),
      { threshold: 0.5, rootMargin: '10px' }
    );
  });

  it('should set inView to true when element intersects', () => {
    render(<TestComponent />);

    const target = screen.getByTestId('target');
    expect(target).toHaveAttribute('data-inview', 'false');

    // Simulate the observer firing with isIntersecting: true
    act(() => {
      mockObserverCallback([{ isIntersecting: true }]);
    });

    expect(target).toHaveAttribute('data-inview', 'true');
  });

  it('should unobserve element after it becomes visible (one-shot behavior)', () => {
    render(<TestComponent />);

    const target = screen.getByTestId('target');
    expect(mockUnobserve).not.toHaveBeenCalled();

    // Simulate the observer firing with isIntersecting: true
    act(() => {
      mockObserverCallback([{ isIntersecting: true }]);
    });

    expect(mockUnobserve).toHaveBeenCalledTimes(1);
    expect(mockUnobserve).toHaveBeenCalledWith(target);
  });

  it('should disconnect observer on unmount', () => {
    const { unmount } = render(<TestComponent />);

    expect(mockDisconnect).not.toHaveBeenCalled();

    unmount();

    expect(mockDisconnect).toHaveBeenCalledTimes(1);
  });

  it('should not create observer when ref.current is null', () => {
    // renderHook does not attach the ref to any DOM element,
    // so ref.current remains null and no observer is created.
    renderHook(() => useInView());

    expect(window.IntersectionObserver).not.toHaveBeenCalled();
    expect(mockObserve).not.toHaveBeenCalled();
  });

  it('should not set inView when entry is not intersecting', () => {
    render(<TestComponent />);

    const target = screen.getByTestId('target');
    expect(target).toHaveAttribute('data-inview', 'false');

    // Simulate the observer firing with isIntersecting: false
    act(() => {
      mockObserverCallback([{ isIntersecting: false }]);
    });

    expect(target).toHaveAttribute('data-inview', 'false');
    expect(mockUnobserve).not.toHaveBeenCalled();
  });
});
