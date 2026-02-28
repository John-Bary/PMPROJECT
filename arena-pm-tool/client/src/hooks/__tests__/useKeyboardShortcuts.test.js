import { renderHook } from '@testing-library/react';
import { useKeyboardShortcuts, SHORTCUTS } from '../useKeyboardShortcuts';

function fireKey(key, modifiers = {}, target = document.body) {
  const event = new KeyboardEvent('keydown', {
    key,
    bubbles: true,
    metaKey: modifiers.metaKey || false,
    ctrlKey: modifiers.ctrlKey || false,
    shiftKey: modifiers.shiftKey || false,
    altKey: modifiers.altKey || false,
  });
  target.dispatchEvent(event);
  return event;
}

/** Append element to body, run fn, then remove it. */
function withDomElement(tagName, fn) {
  const el = document.createElement(tagName);
  document.body.appendChild(el);
  try {
    fn(el);
  } finally {
    document.body.removeChild(el);
  }
}

describe('useKeyboardShortcuts', () => {
  it('should call callback for matching key', () => {
    const cb = jest.fn();
    renderHook(() => useKeyboardShortcuts({ escape: cb }));

    fireKey('Escape');
    expect(cb).toHaveBeenCalledTimes(1);
  });

  it('should handle cmd modifier (metaKey)', () => {
    const cb = jest.fn();
    renderHook(() => useKeyboardShortcuts({ 'cmd+k': cb }));

    fireKey('k', { metaKey: true });
    expect(cb).toHaveBeenCalledTimes(1);
  });

  it('should handle cmd modifier (ctrlKey)', () => {
    const cb = jest.fn();
    renderHook(() => useKeyboardShortcuts({ 'cmd+k': cb }));

    fireKey('k', { ctrlKey: true });
    expect(cb).toHaveBeenCalledTimes(1);
  });

  it('should handle shift modifier', () => {
    const cb = jest.fn();
    renderHook(() => useKeyboardShortcuts({ 'shift+enter': cb }));

    fireKey('Enter', { shiftKey: true });
    expect(cb).toHaveBeenCalledTimes(1);
  });

  it('should handle alt modifier', () => {
    const cb = jest.fn();
    renderHook(() => useKeyboardShortcuts({ 'alt+n': cb }));

    fireKey('n', { altKey: true });
    expect(cb).toHaveBeenCalledTimes(1);
  });

  it('should handle combined modifiers', () => {
    const cb = jest.fn();
    renderHook(() => useKeyboardShortcuts({ 'cmd+shift+s': cb }));

    fireKey('s', { metaKey: true, shiftKey: true });
    expect(cb).toHaveBeenCalledTimes(1);
  });

  it('should not trigger when key does not match', () => {
    const cb = jest.fn();
    renderHook(() => useKeyboardShortcuts({ 'cmd+k': cb }));

    fireKey('j', { metaKey: true });
    expect(cb).not.toHaveBeenCalled();
  });

  it('should be case-insensitive', () => {
    const cb = jest.fn();
    renderHook(() => useKeyboardShortcuts({ 'cmd+n': cb }));

    fireKey('N', { metaKey: true });
    expect(cb).toHaveBeenCalledTimes(1);
  });

  it('should not fire when typing in INPUT', () => {
    const cb = jest.fn();
    renderHook(() => useKeyboardShortcuts({ escape: cb }));

    withDomElement('input', (el) => {
      fireKey('Escape', {}, el);
    });
    expect(cb).not.toHaveBeenCalled();
  });

  it('should not fire when typing in TEXTAREA', () => {
    const cb = jest.fn();
    renderHook(() => useKeyboardShortcuts({ escape: cb }));

    withDomElement('textarea', (el) => {
      fireKey('Escape', {}, el);
    });
    expect(cb).not.toHaveBeenCalled();
  });

  it('should not fire when typing in SELECT', () => {
    const cb = jest.fn();
    renderHook(() => useKeyboardShortcuts({ escape: cb }));

    withDomElement('select', (el) => {
      fireKey('Escape', {}, el);
    });
    expect(cb).not.toHaveBeenCalled();
  });

  // contentEditable detection skipped — JSDOM doesn't compute isContentEditable

  it('should fire when allowTyping flag is set', () => {
    const cb = jest.fn();
    renderHook(() =>
      useKeyboardShortcuts({
        'cmd+enter': cb,
        'cmd+enter:allowTyping': true,
      })
    );

    withDomElement('input', (el) => {
      fireKey('Enter', { metaKey: true }, el);
    });
    expect(cb).toHaveBeenCalledTimes(1);
  });

  it('should not fire when disabled', () => {
    const cb = jest.fn();
    renderHook(() => useKeyboardShortcuts({ escape: cb }, false));

    fireKey('Escape');
    expect(cb).not.toHaveBeenCalled();
  });

  it('should clean up on unmount', () => {
    const cb = jest.fn();
    const { unmount } = renderHook(() => useKeyboardShortcuts({ escape: cb }));

    unmount();
    fireKey('Escape');
    expect(cb).not.toHaveBeenCalled();
  });

  describe('SHORTCUTS constants', () => {
    it('should export expected shortcut keys', () => {
      expect(SHORTCUTS.ESCAPE).toBe('escape');
      expect(SHORTCUTS.ENTER).toBe('enter');
      expect(SHORTCUTS.CMD_ENTER).toBe('cmd+enter');
      expect(SHORTCUTS.SHIFT_ENTER).toBe('shift+enter');
      expect(SHORTCUTS.CMD_N).toBe('cmd+n');
      expect(SHORTCUTS.CMD_K).toBe('cmd+k');
      expect(SHORTCUTS.CMD_S).toBe('cmd+s');
      expect(SHORTCUTS.CMD_D).toBe('cmd+d');
    });
  });
});
