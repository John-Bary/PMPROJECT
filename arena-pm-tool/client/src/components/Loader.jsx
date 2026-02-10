import { Skeleton } from 'components/ui/skeleton';

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
      className={`animate-spin rounded-full border-primary-600 border-t-transparent ${sizeClasses[size]} ${className}`}
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
    <div className="bg-white rounded-xl p-4 border border-[#E8EBF0]">
      <div className="flex items-start gap-3">
        {/* Checkbox skeleton */}
        <Skeleton className="w-5 h-5 rounded-md mt-1" />

        <div className="flex-1 space-y-3">
          {/* Title skeleton */}
          <Skeleton className="h-5 w-3/4" />

          {/* Description skeleton */}
          <Skeleton className="h-4 w-full" />
          <Skeleton className="h-4 w-2/3" />

          {/* Meta info skeleton */}
          <div className="flex items-center gap-4 mt-3">
            <Skeleton className="h-6 w-20" />
            <Skeleton className="h-6 w-24" />
            <Skeleton className="h-6 w-16" />
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
          <Skeleton className="w-2 h-2 rounded-full" />
          <Skeleton className="h-4 w-24" />
          <Skeleton className="h-4 w-8" />
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
    <tr>
      <td className="px-4 py-3">
        <Skeleton className="h-4 w-4 rounded-md" />
      </td>
      <td className="px-4 py-3">
        <Skeleton className="h-4 w-40" />
        <Skeleton className="h-3 w-28 mt-2" />
      </td>
      <td className="px-4 py-3">
        <Skeleton className="h-5 w-20 rounded-full" />
      </td>
      <td className="px-4 py-3">
        <Skeleton className="h-5 w-24 rounded-full" />
      </td>
      <td className="px-4 py-3">
        <Skeleton className="h-4 w-16" />
      </td>
      <td className="px-4 py-3 text-right">
        <div className="flex justify-end gap-2">
          <Skeleton className="h-4 w-4 rounded-md" />
          <Skeleton className="h-4 w-4 rounded-md" />
          <Skeleton className="h-4 w-4 rounded-md" />
        </div>
      </td>
    </tr>
  );
}

export default Spinner;
