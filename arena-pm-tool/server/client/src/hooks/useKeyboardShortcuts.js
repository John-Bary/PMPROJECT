import { useEffect, useCallback } from 'react';

/**
 * Hook for handling keyboard shortcuts
 * @param {Object} shortcuts - Object mapping key combinations to callbacks
 * @param {boolean} enabled - Whether shortcuts are enabled
 */
export function useKeyboardShortcuts(shortcuts, enabled = true) {
  const handleKeyDown = useCallback((event) => {
    if (!enabled) return;

    // Don't trigger shortcuts when typing in inputs
    const isTyping = ['INPUT', 'TEXTAREA', 'SELECT'].includes(event.target.tagName);
    const isContentEditable = event.target.isContentEditable;

    // Build key combination string
    const keys = [];
    if (event.metaKey || event.ctrlKey) keys.push('cmd');
    if (event.shiftKey) keys.push('shift');
    if (event.altKey) keys.push('alt');
    keys.push(event.key.toLowerCase());
    const combo = keys.join('+');

    // Check for matching shortcut
    const callback = shortcuts[combo];
    if (callback) {
      // Some shortcuts should work even when typing
      const allowWhileTyping = shortcuts[`${combo}:allowTyping`];

      if ((!isTyping && !isContentEditable) || allowWhileTyping) {
        event.preventDefault();
        callback(event);
      }
    }
  }, [shortcuts, enabled]);

  useEffect(() => {
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [handleKeyDown]);
}

/**
 * Common keyboard shortcut combinations
 */
export const SHORTCUTS = {
  // Modal shortcuts
  ESCAPE: 'escape',
  ENTER: 'enter',
  CMD_ENTER: 'cmd+enter',
  SHIFT_ENTER: 'shift+enter',

  // Navigation
  CMD_N: 'cmd+n',
  CMD_K: 'cmd+k',

  // Task actions
  CMD_S: 'cmd+s',
  CMD_D: 'cmd+d',
};

export default useKeyboardShortcuts;
