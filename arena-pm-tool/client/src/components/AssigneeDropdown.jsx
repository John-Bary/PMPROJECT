import { useRef, useEffect, useState, useCallback } from 'react';
import { createPortal } from 'react-dom';
import AssigneeListItem from './AssigneeListItem';

/**
 * A reusable assignee dropdown component with proper positioning,
 * keyboard navigation, and accessibility features.
 *
 * @param {Object} props
 * @param {Array} props.users - Array of user objects with id and name
 * @param {Array} props.selectedIds - Array of selected user IDs
 * @param {Function} props.onToggle - Callback when selection changes, receives userId
 * @param {Function} props.onClose - Callback to close the dropdown
 * @param {Object} props.triggerRef - Ref to the trigger element for positioning
 * @param {'multi'|'single'} props.variant - 'multi' for checkbox, 'single' for radio
 * @param {number} props.maxHeight - Maximum height of the dropdown in pixels
 */
function AssigneeDropdown({
  users,
  selectedIds = [],
  onToggle,
  onClose,
  triggerRef,
  variant = 'multi',
  maxHeight = 240,
}) {
  const dropdownRef = useRef(null);
  const listRef = useRef(null);
  const [focusIndex, setFocusIndex] = useState(-1);
  const [position, setPosition] = useState({ top: 0, left: 0, placement: 'bottom' });

  // Calculate position relative to trigger element
  const updatePosition = useCallback(() => {
    if (!triggerRef?.current) return;

    const rect = triggerRef.current.getBoundingClientRect();
    const dropdownWidth = 224; // w-56 = 14rem = 224px
    const dropdownHeight = Math.min(maxHeight, users.length * 44 + 36); // Estimate height

    // Check horizontal overflow
    const rightOverflow = rect.left + dropdownWidth > window.innerWidth;
    const leftPos = rightOverflow
      ? Math.max(8, rect.right - dropdownWidth)
      : rect.left;

    // Check vertical overflow - prefer below, but go above if needed
    const spaceBelow = window.innerHeight - rect.bottom;
    const spaceAbove = rect.top;
    const placement = spaceBelow >= dropdownHeight || spaceBelow >= spaceAbove
      ? 'bottom'
      : 'top';

    const topPos = placement === 'bottom'
      ? rect.bottom + 4
      : rect.top - dropdownHeight - 4;

    setPosition({
      top: Math.max(8, topPos),
      left: leftPos,
      placement,
    });
  }, [triggerRef, maxHeight, users.length]);

  // Position calculation on mount and resize
  useEffect(() => {
    updatePosition();
    window.addEventListener('resize', updatePosition);
    window.addEventListener('scroll', updatePosition, true);

    return () => {
      window.removeEventListener('resize', updatePosition);
      window.removeEventListener('scroll', updatePosition, true);
    };
  }, [updatePosition]);

  // Click outside handler
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (
        dropdownRef.current &&
        !dropdownRef.current.contains(event.target) &&
        triggerRef?.current &&
        !triggerRef.current.contains(event.target)
      ) {
        onClose();
      }
    };

    // Use setTimeout to avoid immediate close from the opening click
    const timeoutId = setTimeout(() => {
      document.addEventListener('mousedown', handleClickOutside);
    }, 0);

    return () => {
      clearTimeout(timeoutId);
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [onClose, triggerRef]);

  // Keyboard navigation
  useEffect(() => {
    const handleKeyDown = (event) => {
      // Only handle if dropdown or its children have focus
      if (!dropdownRef.current?.contains(document.activeElement) &&
          document.activeElement !== document.body) {
        return;
      }

      switch (event.key) {
        case 'Escape':
          event.preventDefault();
          event.stopPropagation();
          onClose();
          triggerRef?.current?.focus();
          break;
        case 'ArrowDown':
          event.preventDefault();
          setFocusIndex((prev) =>
            prev < users.length - 1 ? prev + 1 : 0
          );
          break;
        case 'ArrowUp':
          event.preventDefault();
          setFocusIndex((prev) =>
            prev > 0 ? prev - 1 : users.length - 1
          );
          break;
        case 'Home':
          event.preventDefault();
          setFocusIndex(0);
          break;
        case 'End':
          event.preventDefault();
          setFocusIndex(users.length - 1);
          break;
        case 'Tab':
          // Allow tab to close the dropdown
          onClose();
          break;
        default:
          break;
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [focusIndex, users, onClose, triggerRef]);

  // Focus management - scroll focused item into view
  useEffect(() => {
    if (focusIndex >= 0) {
      const item = listRef.current?.querySelector(`[data-index="${focusIndex}"]`);
      if (item) {
        item.focus();
        item.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
      }
    }
  }, [focusIndex]);

  // Focus first item on open (only runs once on mount)
  useEffect(() => {
    const timeoutId = setTimeout(() => {
      if (users.length > 0) {
        // Find first selected item or default to first item
        const firstSelectedIndex = users.findIndex(u => selectedIds.includes(u.id));
        setFocusIndex(firstSelectedIndex >= 0 ? firstSelectedIndex : 0);
      }
    }, 50);

    return () => clearTimeout(timeoutId);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const isSelected = (userId) => selectedIds.includes(userId);

  const handleToggle = (userId) => {
    onToggle(userId);
    // For single select, close after selection
    if (variant === 'single') {
      onClose();
    }
  };

  const dropdownContent = (
    <div
      ref={dropdownRef}
      role="listbox"
      aria-label={variant === 'multi' ? 'Select assignees' : 'Select assignee'}
      aria-multiselectable={variant === 'multi'}
      className={`
        fixed bg-white border border-neutral-200 rounded-lg shadow-sm z-[100]
        animate-fade-in overflow-hidden
        ${position.placement === 'top' ? 'origin-bottom' : 'origin-top'}
      `}
      style={{
        top: `${position.top}px`,
        left: `${position.left}px`,
        width: '14rem',
        maxHeight: `${maxHeight}px`,
      }}
    >
      {/* Header */}
      <div className="px-3 py-2 text-xs font-medium text-neutral-500 border-b border-neutral-100 bg-neutral-50/50">
        {variant === 'multi' ? 'Select assignees' : 'Select assignee'}
      </div>

      {/* List */}
      <div
        ref={listRef}
        className="overflow-y-auto"
        style={{ maxHeight: `${maxHeight - 36}px` }}
      >
        {users.length > 0 ? (
          users.map((user, index) => (
            <div
              key={user.id}
              data-index={index}
              tabIndex={focusIndex === index ? 0 : -1}
              className="outline-none"
            >
              <AssigneeListItem
                user={user}
                isSelected={isSelected(user.id)}
                onToggle={handleToggle}
                variant={variant}
                groupName={`assignee-dropdown-${variant}`}
              />
            </div>
          ))
        ) : (
          <div className="px-3 py-4 text-sm text-neutral-500 text-center">
            No users available
          </div>
        )}
      </div>
    </div>
  );

  return createPortal(dropdownContent, document.body);
}

export default AssigneeDropdown;
