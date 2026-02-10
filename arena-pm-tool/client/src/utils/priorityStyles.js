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

export const priorityPillStyles = {
  urgent: 'bg-red-50 text-red-700 border-red-200',
  high: 'bg-orange-50 text-orange-700 border-orange-200',
  medium: 'bg-amber-50 text-amber-700 border-amber-200',
  low: 'bg-blue-50 text-blue-700 border-blue-200',
};

export const priorityBorderColors = {
  urgent: 'border-l-red-500',
  high: 'border-l-orange-500',
  medium: 'border-l-amber-500',
  low: 'border-l-blue-500',
};

export const getPriorityColor = (priority) => {
  return priorityStyles[priority] || priorityStyles.medium;
};

export const getPriorityPillStyle = (priority) => {
  return priorityPillStyles[priority] || priorityPillStyles.medium;
};
