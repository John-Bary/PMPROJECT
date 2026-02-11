import { useRef, useEffect, useState, useCallback } from 'react';
import { createPortal } from 'react-dom';
import { Check } from 'lucide-react';
import { Avatar, AvatarFallback } from 'components/ui/avatar';
import { Command, CommandInput, CommandList, CommandEmpty, CommandGroup, CommandItem } from 'components/ui/command';

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
  const [position, setPosition] = useState({ top: 0, left: 0, placement: 'bottom' });

  // Calculate position relative to trigger element
  const updatePosition = useCallback(() => {
    if (!triggerRef?.current) return;

    const rect = triggerRef.current.getBoundingClientRect();
    const dropdownWidth = 224; // w-56 = 14rem = 224px
    const dropdownHeight = Math.min(maxHeight, users.length * 44 + 76); // Estimate height (includes search input)

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

  // Keyboard: Escape to close
  useEffect(() => {
    const handleKeyDown = (event) => {
      if (event.key === 'Escape') {
        event.preventDefault();
        event.stopPropagation();
        onClose();
        triggerRef?.current?.focus();
      }
      if (event.key === 'Tab') {
        onClose();
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [onClose, triggerRef]);

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
        fixed bg-card border border-border rounded-lg shadow-sm z-[100]
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
      <Command className="rounded-lg">
        <CommandInput placeholder="Search users..." className="h-9" />
        <CommandList style={{ maxHeight: `${maxHeight - 44}px` }}>
          <CommandEmpty>No users found.</CommandEmpty>
          <CommandGroup heading={variant === 'multi' ? 'Select assignees' : 'Select assignee'}>
            {users.map((user) => (
              <CommandItem
                key={user.id}
                value={user.name}
                onSelect={() => handleToggle(user.id)}
                className="flex items-center gap-2 cursor-pointer"
              >
                <div className={`
                  flex-shrink-0 w-4 h-4 rounded border-2 flex items-center justify-center transition-all
                  ${isSelected(user.id)
                    ? 'bg-primary border-primary'
                    : 'border-input'
                  }
                `}>
                  {isSelected(user.id) && <Check size={10} className="text-primary-foreground" />}
                </div>
                <Avatar className="h-6 w-6">
                  <AvatarFallback className="text-xs bg-neutral-600 text-white font-semibold">
                    {user.name?.charAt(0).toUpperCase() || '?'}
                  </AvatarFallback>
                </Avatar>
                <span className={`text-sm truncate ${isSelected(user.id) ? 'font-medium text-foreground' : 'text-foreground'}`}>
                  {user.name}
                </span>
              </CommandItem>
            ))}
          </CommandGroup>
        </CommandList>
      </Command>
    </div>
  );

  return createPortal(dropdownContent, document.body);
}

export default AssigneeDropdown;
