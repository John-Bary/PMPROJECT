const planConfig = {
  free: {
    label: 'Free',
    className: 'text-neutral-400',
  },
  pro: {
    label: 'Pro',
    className: 'text-neutral-900 font-medium',
  },
  business: {
    label: 'Business',
    className: 'text-neutral-900 font-medium',
  },
};

function PlanBadge({ plan = 'free' }) {
  const config = planConfig[plan] || planConfig.free;

  return (
    <span className={`text-xs ${config.className}`}>
      {config.label}
    </span>
  );
}

export default PlanBadge;
