export const priorityStyles = {
  urgent: 'text-red-700 font-medium',
  high: 'text-orange-700',
  medium: 'text-amber-600',
  low: 'text-green-600',
};

export const priorityDotColors = {
  urgent: 'bg-red-600',
  high: 'bg-orange-600',
  medium: 'bg-amber-500',
  low: 'bg-green-600',
};

export const priorityPillStyles = {
  urgent: 'bg-red-50 text-red-700 border-red-200',
  high: 'bg-orange-50 text-orange-700 border-orange-200',
  medium: 'bg-amber-50 text-amber-700 border-amber-200',
  low: 'bg-green-50 text-green-700 border-green-200',
};

export const priorityBorderColors = {
  urgent: 'border-l-red-600',
  high: 'border-l-orange-600',
  medium: 'border-l-amber-500',
  low: 'border-l-green-600',
};

export const getPriorityColor = (priority) => {
  return priorityStyles[priority] || priorityStyles.medium;
};

export const getPriorityPillStyle = (priority) => {
  return priorityPillStyles[priority] || priorityPillStyles.medium;
};
