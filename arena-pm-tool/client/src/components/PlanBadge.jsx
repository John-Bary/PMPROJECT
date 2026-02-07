import { Crown, Sparkles } from 'lucide-react';

const planConfig = {
  free: {
    label: 'Free',
    className: 'bg-neutral-100 text-neutral-600 border-neutral-200',
    icon: null,
  },
  pro: {
    label: 'Pro',
    className: 'bg-teal-50 text-teal-700 border-teal-200',
    icon: Sparkles,
  },
  business: {
    label: 'Business',
    className: 'bg-purple-50 text-purple-700 border-purple-200',
    icon: Crown,
  },
};

function PlanBadge({ plan = 'free', size = 'sm' }) {
  const config = planConfig[plan] || planConfig.free;
  const Icon = config.icon;

  const sizeClasses = size === 'sm'
    ? 'text-xs px-2 py-0.5'
    : 'text-sm px-3 py-1';

  return (
    <span className={`inline-flex items-center gap-1 font-medium border rounded-full ${config.className} ${sizeClasses}`}>
      {Icon && <Icon size={size === 'sm' ? 12 : 14} />}
      {config.label}
    </span>
  );
}

export default PlanBadge;
