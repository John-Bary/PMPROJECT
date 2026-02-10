export const priorityStyles = {
  urgent: 'text-neutral-900 font-medium',
  high: 'text-neutral-700',
  medium: 'text-neutral-600',
  low: 'text-neutral-400',
};

export const priorityDotColors = {
  urgent: 'bg-red-500',
  high: 'bg-orange-500',
  medium: 'bg-yellow-500',
  low: 'bg-neutral-300',
};

export const getPriorityColor = (priority) => {
  return priorityStyles[priority] || priorityStyles.medium;
};
