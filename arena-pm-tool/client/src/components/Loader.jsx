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
    <div className="bg-white rounded-xl p-4 border border-[#E8EBF0] animate-pulse">
      <div className="flex items-start gap-3">
        {/* Checkbox skeleton */}
        <div className="w-5 h-5 bg-gray-100 rounded-md mt-1"></div>

        <div className="flex-1 space-y-3">
          {/* Title skeleton */}
          <div className="h-5 bg-gray-100 rounded-lg w-3/4"></div>

          {/* Description skeleton */}
          <div className="h-4 bg-gray-100 rounded-lg w-full"></div>
          <div className="h-4 bg-gray-100 rounded-lg w-2/3"></div>

          {/* Meta info skeleton */}
          <div className="flex items-center gap-4 mt-3">
            <div className="h-6 bg-gray-100 rounded-lg w-20"></div>
            <div className="h-6 bg-gray-100 rounded-lg w-24"></div>
            <div className="h-6 bg-gray-100 rounded-lg w-16"></div>
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
          <div className="w-2 h-2 rounded-full bg-gray-100"></div>
          <div className="h-4 w-24 bg-gray-100 rounded-lg"></div>
          <div className="h-4 w-8 bg-gray-100 rounded-lg"></div>
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
        <div className="h-4 w-4 bg-gray-100 rounded-md"></div>
      </td>
      <td className="px-4 py-3">
        <div className="h-4 w-40 bg-gray-100 rounded-lg"></div>
        <div className="h-3 w-28 bg-gray-100 rounded-lg mt-2"></div>
      </td>
      <td className="px-4 py-3">
        <div className="h-5 w-20 bg-gray-100 rounded-full"></div>
      </td>
      <td className="px-4 py-3">
        <div className="h-5 w-24 bg-gray-100 rounded-full"></div>
      </td>
      <td className="px-4 py-3">
        <div className="h-4 w-16 bg-gray-100 rounded-lg"></div>
      </td>
      <td className="px-4 py-3 text-right">
        <div className="flex justify-end gap-2">
          <div className="h-4 w-4 bg-gray-100 rounded-md"></div>
          <div className="h-4 w-4 bg-gray-100 rounded-md"></div>
          <div className="h-4 w-4 bg-gray-100 rounded-md"></div>
        </div>
      </td>
    </tr>
  );
}

export default Spinner;
