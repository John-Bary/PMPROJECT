export const priorityStyles = {
  urgent: 'text-red-700 font-medium',
  high: 'text-orange-700',
  medium: 'text-yellow-700',
  low: 'text-blue-700',
};

export const priorityDotColors = {
  urgent: 'bg-red-600',
  high: 'bg-orange-500',
  medium: 'bg-yellow-500',
  low: 'bg-blue-600',
};

export const priorityPillStyles = {
  urgent: 'bg-red-50 text-red-700 border-red-200',
  high: 'bg-orange-50 text-orange-700 border-orange-200',
  medium: 'bg-yellow-50 text-yellow-700 border-yellow-300',
  low: 'bg-blue-50 text-blue-700 border-blue-200',
};

export const priorityBorderColors = {
  urgent: 'border-l-red-600',
  high: 'border-l-orange-500',
  medium: 'border-l-yellow-500',
  low: 'border-l-blue-600',
};

export const getPriorityColor = (priority) => {
  return priorityStyles[priority] || priorityStyles.medium;
};

export const getPriorityPillStyle = (priority) => {
  return priorityPillStyles[priority] || priorityPillStyles.medium;
};
