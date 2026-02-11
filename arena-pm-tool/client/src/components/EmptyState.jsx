import { Inbox } from 'lucide-react';
import { Button } from 'components/ui/button';

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
    default: 'bg-card border border-border rounded-xl',
    muted: 'bg-background border border-border rounded-xl',
    ghost: 'bg-card/70 border-2 border-dashed border-border rounded-xl',
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
        <div className="flex items-center justify-center w-10 h-10 rounded-full bg-accent text-primary">
          <Icon size={20} />
        </div>
      )}

      <div className="space-y-1 max-w-2xl">
        <h3 className="text-lg font-semibold text-foreground">{title}</h3>
        {description && <p className="text-sm text-muted-foreground">{description}</p>}
        {children}
      </div>

      {hasActions && (
        <div className="flex flex-wrap items-center gap-3 mt-2">
          {primaryAction && (
            <Button
              type="button"
              onClick={primaryAction.onClick}
            >
              {PrimaryIcon && <PrimaryIcon size={16} />}
              <span>{primaryAction.label}</span>
            </Button>
          )}

          {secondaryAction && (
            <Button
              type="button"
              variant="outline"
              onClick={secondaryAction.onClick}
            >
              {SecondaryIcon && <SecondaryIcon size={16} />}
              <span>{secondaryAction.label}</span>
            </Button>
          )}
        </div>
      )}
    </div>
  );
}

export default EmptyState;
