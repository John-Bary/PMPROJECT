import { Badge } from 'components/ui/badge';

const planConfig = {
  free: {
    label: 'Free',
    variant: 'secondary',
    className: 'text-neutral-400 bg-neutral-50 border-neutral-200',
  },
  pro: {
    label: 'Pro',
    variant: 'default',
    className: 'text-neutral-900 bg-neutral-100 border-neutral-200 font-medium',
  },
  business: {
    label: 'Business',
    variant: 'default',
    className: 'text-neutral-900 bg-neutral-100 border-neutral-200 font-medium',
  },
};

function PlanBadge({ plan = 'free' }) {
  const config = planConfig[plan] || planConfig.free;

  return (
    <Badge variant="outline" className={`text-xs ${config.className}`}>
      {config.label}
    </Badge>
  );
}

export default PlanBadge;
