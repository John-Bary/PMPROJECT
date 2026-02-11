import { Check } from 'lucide-react';

const AVATAR_COLORS = ['bg-neutral-600'];

function getAvatarColor() {
  return 'bg-neutral-600';
}

/**
 * A reusable assignee list item component with proper alignment and accessibility.
 *
 * @param {Object} props
 * @param {Object} props.user - User object with id and name
 * @param {boolean} props.isSelected - Whether this user is selected
 * @param {Function} props.onToggle - Callback when selection changes, receives userId
 * @param {'multi'|'single'} props.variant - 'multi' for checkbox, 'single' for radio
 * @param {'default'|'compact'} props.size - Size variant for different contexts
 * @param {string} props.groupName - Name for radio group (required for single variant)
 */
function AssigneeListItem({
  user,
  isSelected,
  onToggle,
  variant = 'multi',
  size = 'default',
  groupName = 'assignee-selection',
}) {
  const itemId = `assignee-${user.id}`;

  const sizeClasses = {
    default: {
      container: 'px-3 py-2.5',
      checkbox: 'w-4 h-4',
      avatar: 'w-6 h-6 text-xs',
      text: 'text-sm',
    },
    compact: {
      container: 'px-2.5 py-2',
      checkbox: 'w-3.5 h-3.5',
      avatar: 'w-5 h-5 text-[10px]',
      text: 'text-xs',
    },
  };

  const sizes = sizeClasses[size];

  const handleClick = (e) => {
    e.preventDefault();
    onToggle(user.id);
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      onToggle(user.id);
    }
  };

  return (
    <label
      htmlFor={itemId}
      onClick={handleClick}
      onKeyDown={handleKeyDown}
      tabIndex={0}
      role="option"
      aria-selected={isSelected}
      className={`
        flex items-center gap-3 cursor-pointer
        ${sizes.container}
        hover:bg-muted active:bg-accent
        transition-colors duration-150
        ${isSelected ? 'bg-accent hover:bg-accent/70' : ''}
        focus:outline-none focus:ring-2 focus:ring-ring/20 focus:ring-inset
      `}
    >
      {/* Checkbox/Radio visual indicator */}
      <div className="flex-shrink-0 flex items-center justify-center">
        <input
          type={variant === 'multi' ? 'checkbox' : 'radio'}
          id={itemId}
          name={groupName}
          checked={isSelected}
          onChange={() => {}} // Handled by label click
          className="sr-only"
          tabIndex={-1}
        />
        <div
          className={`
            ${sizes.checkbox} flex-shrink-0
            flex items-center justify-center
            transition-all duration-150
            ${variant === 'single' ? 'rounded-full' : 'rounded'}
            ${isSelected
              ? 'bg-primary border-2 border-primary'
              : 'border-2 border-input bg-background'
            }
          `}
          aria-hidden="true"
        >
          {isSelected && (
            <Check
              size={size === 'compact' ? 8 : 10}
              className="text-primary-foreground"
              strokeWidth={3}
            />
          )}
        </div>
      </div>

      {/* Avatar */}
      <div
        className={`
          ${sizes.avatar} rounded-full flex-shrink-0
          flex items-center justify-center
          text-white font-semibold
          ${getAvatarColor(user.name)}
        `}
        aria-hidden="true"
      >
        {user.name?.charAt(0).toUpperCase() || '?'}
      </div>

      {/* Name with proper text handling */}
      <span
        className={`
          ${sizes.text} flex-1 min-w-0
          ${isSelected ? 'text-foreground font-medium' : 'text-foreground'}
          truncate
        `}
        title={user.name}
      >
        {user.name}
      </span>
    </label>
  );
}

export default AssigneeListItem;
export { getAvatarColor, AVATAR_COLORS };
