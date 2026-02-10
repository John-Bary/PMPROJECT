// Loading spinner component
function Spinner({ size = 'md', className = '' }) {
  const sizeClasses = {
    sm: 'h-4 w-4 border-2',
    md: 'h-8 w-8 border-2',
    lg: 'h-12 w-12 border-2',
    xl: 'h-16 w-16 border-3',
  };

  return (
    <div
      className={`animate-spin rounded-full border-neutral-900 border-t-transparent ${sizeClasses[size]} ${className}`}
    ></div>
  );
}

// Full page loader
export function PageLoader() {
  return (
    <div className="flex items-center justify-center py-12">
      <Spinner size="lg" />
    </div>
  );
}

// Skeleton loader for task items
export function TaskSkeleton() {
  return (
    <div className="bg-white rounded-lg p-4 border border-neutral-200 animate-pulse">
      <div className="flex items-start gap-3">
        {/* Checkbox skeleton */}
        <div className="w-5 h-5 bg-neutral-200 rounded mt-1"></div>

        <div className="flex-1 space-y-3">
          {/* Title skeleton */}
          <div className="h-5 bg-neutral-200 rounded w-3/4"></div>

          {/* Description skeleton */}
          <div className="h-4 bg-neutral-200 rounded w-full"></div>
          <div className="h-4 bg-neutral-200 rounded w-2/3"></div>

          {/* Meta info skeleton */}
          <div className="flex items-center gap-4 mt-3">
            <div className="h-6 bg-neutral-200 rounded w-20"></div>
            <div className="h-6 bg-neutral-200 rounded w-24"></div>
            <div className="h-6 bg-neutral-200 rounded w-16"></div>
          </div>
        </div>
      </div>
    </div>
  );
}

// Button loading spinner
export function ButtonSpinner() {
  return <Spinner size="sm" className="mr-2" />;
}

// Inline spinner
export function InlineSpinner({ className = '', size = 'sm' }) {
  return <Spinner size={size} className={className} />;
}

// Skeleton for task columns (board view)
export function TaskColumnSkeleton({ items = 3 }) {
  return (
    <div className="flex-shrink-0 w-80">
      <div className="mb-4">
        <div className="flex items-center gap-2">
          <div className="w-3 h-3 rounded-full bg-neutral-200"></div>
          <div className="h-4 w-24 bg-neutral-200 rounded"></div>
          <div className="h-4 w-8 bg-neutral-200 rounded"></div>
        </div>
      </div>
      <div className="space-y-3">
        {Array.from({ length: items }).map((_, index) => (
          <TaskSkeleton key={index} />
        ))}
      </div>
    </div>
  );
}

// Skeleton for task rows (list view)
export function TaskRowSkeleton() {
  return (
    <tr className="animate-pulse">
      <td className="px-4 py-3">
        <div className="h-4 w-4 bg-neutral-200 rounded"></div>
      </td>
      <td className="px-4 py-3">
        <div className="h-4 w-40 bg-neutral-200 rounded"></div>
        <div className="h-3 w-28 bg-neutral-200 rounded mt-2"></div>
      </td>
      <td className="px-4 py-3">
        <div className="h-5 w-20 bg-neutral-200 rounded-full"></div>
      </td>
      <td className="px-4 py-3">
        <div className="h-5 w-24 bg-neutral-200 rounded-full"></div>
      </td>
      <td className="px-4 py-3">
        <div className="h-4 w-16 bg-neutral-200 rounded"></div>
      </td>
      <td className="px-4 py-3 text-right">
        <div className="flex justify-end gap-2">
          <div className="h-4 w-4 bg-neutral-200 rounded"></div>
          <div className="h-4 w-4 bg-neutral-200 rounded"></div>
          <div className="h-4 w-4 bg-neutral-200 rounded"></div>
        </div>
      </td>
    </tr>
  );
}

export default Spinner;
