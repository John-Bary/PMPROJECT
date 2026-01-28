import { useState, useRef, useEffect } from 'react';
import { Filter } from 'lucide-react';
import useUserStore from '../store/userStore';
import useCategoryStore from '../store/categoryStore';
import useWorkspaceStore from '../store/workspaceStore';
import AssigneeListItem from './AssigneeListItem';

const PRIORITY_OPTIONS = ['Low', 'Medium', 'High', 'Urgent'];

function FilterDropdown({ filters, onFiltersChange, disabled = false }) {
  const { users, fetchUsers } = useUserStore();
  const { categories, fetchCategories } = useCategoryStore();
  const { currentWorkspaceId } = useWorkspaceStore();
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef(null);

  useEffect(() => {
    if (currentWorkspaceId) {
      fetchUsers(currentWorkspaceId);
    }
    fetchCategories();
  }, [currentWorkspaceId, fetchUsers, fetchCategories]);

  useEffect(() => {
    if (disabled) {
      setIsOpen(false);
    }
  }, [disabled]);

  // Click outside to close
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setIsOpen(false);
      }
    };

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isOpen]);

  const handleToggleAssignee = (userId) => {
    const newAssignees = filters.assignees.includes(userId)
      ? filters.assignees.filter((id) => id !== userId)
      : [...filters.assignees, userId];

    onFiltersChange({ ...filters, assignees: newAssignees });
  };

  const handleTogglePriority = (priority) => {
    const newPriorities = filters.priorities.includes(priority)
      ? filters.priorities.filter((p) => p !== priority)
      : [...filters.priorities, priority];

    onFiltersChange({ ...filters, priorities: newPriorities });
  };

  const handleToggleCategory = (categoryId) => {
    const newCategories = filters.categories.includes(categoryId)
      ? filters.categories.filter((id) => id !== categoryId)
      : [...filters.categories, categoryId];

    onFiltersChange({ ...filters, categories: newCategories });
  };

  const handleToggleCompleted = () => {
    onFiltersChange({ ...filters, hideCompleted: !filters.hideCompleted });
  };

  const clearAllFilters = () => {
    onFiltersChange({
      assignees: [],
      priorities: [],
      categories: [],
      hideCompleted: false,
    });
  };

  // Count active filters
  const activeFilterCount =
    filters.assignees.length +
    filters.priorities.length +
    filters.categories.length +
    (filters.hideCompleted ? 1 : 0);

  return (
    <div className="relative" ref={dropdownRef}>
      <button
        onClick={() => {
          if (disabled) return;
          setIsOpen(!isOpen);
        }}
        disabled={disabled}
        className={`flex items-center gap-1.5 sm:gap-2 px-3 py-2 sm:px-4 text-sm border rounded-lg transition-all duration-200 ${
          activeFilterCount > 0
            ? 'border-teal-500 bg-teal-50 text-teal-700'
            : 'border-neutral-200 text-neutral-700 hover:bg-neutral-50'
        } ${disabled ? 'opacity-60 cursor-not-allowed' : ''}`}
      >
        <Filter size={18} className="sm:w-5 sm:h-5" />
        <span className="hidden sm:inline">Filters</span>
        {activeFilterCount > 0 && (
          <span className="flex items-center justify-center w-5 h-5 text-xs font-semibold text-white bg-teal-500 rounded-full">
            {activeFilterCount}
          </span>
        )}
      </button>

      {isOpen && (
        <>
          {/* Mobile overlay backdrop */}
          <div
            className="fixed inset-0 bg-black bg-opacity-25 z-40 sm:hidden"
            onClick={() => setIsOpen(false)}
          />
          <div className="fixed inset-x-4 top-1/2 -translate-y-1/2 sm:translate-y-0 sm:absolute sm:inset-auto sm:top-full sm:right-0 sm:mt-2 w-auto sm:w-72 bg-white border border-neutral-150 rounded-xl shadow-lg z-50 max-h-[80vh] overflow-y-auto animate-fade-in">
            <div className="p-4">
              {/* Header */}
              <div className="flex items-center justify-between mb-4">
                <h3 className="font-semibold text-neutral-900">Filter Tasks</h3>
                <div className="flex items-center gap-3">
                  {activeFilterCount > 0 && (
                    <button
                      onClick={clearAllFilters}
                      className="text-sm text-teal-600 hover:text-teal-700 transition-all duration-150"
                    >
                      Clear all
                    </button>
                  )}
                  <button
                    onClick={() => setIsOpen(false)}
                    className="sm:hidden p-1 text-neutral-400 hover:text-neutral-600"
                  >
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </button>
                </div>
              </div>

            {/* Assignee Filter */}
            <div className="mb-4">
              <h4 className="text-sm font-medium text-neutral-600 mb-2">Assignee</h4>
              <div className="max-h-40 overflow-y-auto rounded-lg border border-neutral-100">
                {users.map((user) => (
                  <AssigneeListItem
                    key={user.id}
                    user={user}
                    isSelected={filters.assignees.includes(user.id)}
                    onToggle={() => handleToggleAssignee(user.id)}
                    variant="multi"
                    size="compact"
                  />
                ))}
              </div>
            </div>

            {/* Priority Filter */}
            <div className="mb-4">
              <h4 className="text-sm font-medium text-neutral-600 mb-2">Priority</h4>
              <div className="space-y-1">
                {PRIORITY_OPTIONS.map((priority) => (
                  <label
                    key={priority}
                    className="flex items-center gap-3 cursor-pointer hover:bg-neutral-100 p-2 rounded-lg active:bg-neutral-100 transition-all duration-150"
                  >
                    <input
                      type="checkbox"
                      checked={filters.priorities.includes(priority)}
                      onChange={() => handleTogglePriority(priority)}
                      className="w-5 h-5 sm:w-4 sm:h-4 text-teal-600 border-neutral-300 rounded focus:ring-2 focus:ring-teal-500/40"
                    />
                    <span className="text-sm text-neutral-700">{priority}</span>
                  </label>
                ))}
              </div>
            </div>

            {/* Category Filter */}
            <div className="mb-4">
              <h4 className="text-sm font-medium text-neutral-600 mb-2">Category</h4>
              <div className="space-y-1 max-h-40 overflow-y-auto">
                {categories.map((category) => (
                  <label
                    key={category.id}
                    className="flex items-center gap-3 cursor-pointer hover:bg-neutral-100 p-2 rounded-lg active:bg-neutral-100 transition-all duration-150"
                  >
                    <input
                      type="checkbox"
                      checked={filters.categories.includes(category.id)}
                      onChange={() => handleToggleCategory(category.id)}
                      className="w-5 h-5 sm:w-4 sm:h-4 text-teal-600 border-neutral-300 rounded focus:ring-2 focus:ring-teal-500/40"
                    />
                    <div className="flex items-center gap-2">
                      <div
                        className="w-3 h-3 rounded-full flex-shrink-0"
                        style={{ backgroundColor: category.color }}
                      ></div>
                      <span className="text-sm text-neutral-700">{category.name}</span>
                    </div>
                  </label>
                ))}
              </div>
            </div>

            {/* Completed Filter */}
            <div className="pt-3 border-t border-neutral-150">
              <label className="flex items-center gap-3 cursor-pointer hover:bg-neutral-100 p-2 rounded-lg active:bg-neutral-100 transition-all duration-150">
                <input
                  type="checkbox"
                  checked={filters.hideCompleted}
                  onChange={handleToggleCompleted}
                  className="w-5 h-5 sm:w-4 sm:h-4 text-blue-600 border-gray-300 rounded focus:ring-2 focus:ring-blue-500"
                />
                <span className="text-sm text-gray-700">Hide completed tasks</span>
              </label>
            </div>

            {/* Mobile Apply Button */}
            <div className="mt-4 sm:hidden">
              <button
                onClick={() => setIsOpen(false)}
                className="w-full py-2.5 bg-teal-500 text-white rounded-lg font-medium hover:bg-teal-600 transition-all duration-200"
              >
                Apply Filters
              </button>
            </div>
          </div>
        </div>
        </>
      )}
    </div>
  );
}

export default FilterDropdown;
