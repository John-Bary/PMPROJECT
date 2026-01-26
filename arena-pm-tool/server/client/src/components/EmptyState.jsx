import { Inbox } from 'lucide-react';

function EmptyState({
  icon: Icon = Inbox,
  title,
  description,
  primaryAction,
  secondaryAction,
  size = 'md',
  tone = 'default',
  align = 'center',
  className = '',
  children,
}) {
  const sizeClasses = {
    sm: 'px-4 py-4 gap-2 text-sm',
    md: 'px-6 py-6 gap-3',
    lg: 'px-8 py-8 gap-4',
  };

  const toneClasses = {
    default: 'bg-white border border-dashed border-neutral-200 rounded-xl shadow-sm',
    muted: 'bg-teal-50/40 border border-dashed border-teal-200 rounded-xl',
    ghost: 'bg-white/70 border border-dashed border-neutral-200 rounded-lg',
  };

  const alignment = align === 'left' ? 'items-start text-left' : 'items-center text-center';
  const PrimaryIcon = primaryAction?.icon;
  const SecondaryIcon = secondaryAction?.icon;
  const hasActions = primaryAction || secondaryAction;

  return (
    <div
      className={`flex flex-col ${alignment} ${sizeClasses[size] || sizeClasses.md} ${
        toneClasses[tone] || toneClasses.default
      } ${className}`}
    >
      {Icon && (
        <div className="flex items-center justify-center w-12 h-12 rounded-full bg-teal-50 text-teal-600">
          <Icon size={24} />
        </div>
      )}

      <div className="space-y-1 max-w-2xl">
        <h3 className="text-lg font-semibold text-neutral-900">{title}</h3>
        {description && <p className="text-sm text-neutral-600">{description}</p>}
        {children}
      </div>

      {hasActions && (
        <div className="flex flex-wrap items-center gap-3 mt-2">
          {primaryAction && (
            <button
              type="button"
              onClick={primaryAction.onClick}
              className="inline-flex items-center gap-2 px-4 py-2 bg-teal-500 text-white rounded-lg hover:bg-teal-600 shadow-sm hover:shadow transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-teal-500/40 focus:ring-offset-1 active:scale-[0.98]"
            >
              {PrimaryIcon && <PrimaryIcon size={16} />}
              <span>{primaryAction.label}</span>
            </button>
          )}

          {secondaryAction && (
            <button
              type="button"
              onClick={secondaryAction.onClick}
              className="inline-flex items-center gap-2 px-4 py-2 border border-neutral-200 text-neutral-700 rounded-lg hover:bg-neutral-50 hover:border-neutral-300 transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-teal-500/40 focus:ring-offset-1 active:scale-[0.98]"
            >
              {SecondaryIcon && <SecondaryIcon size={16} />}
              <span>{secondaryAction.label}</span>
            </button>
          )}
        </div>
      )}
    </div>
  );
}

export default EmptyState;
