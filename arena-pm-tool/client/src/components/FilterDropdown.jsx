import { useState, useEffect } from 'react';
import { Filter } from 'lucide-react';
import useUserStore from '../store/userStore';
import useCategoryStore from '../store/categoryStore';
import useWorkspaceStore from '../store/workspaceStore';
import AssigneeListItem from './AssigneeListItem';
import { Button } from 'components/ui/button';
import { Popover, PopoverContent, PopoverTrigger } from 'components/ui/popover';

const PRIORITY_OPTIONS = ['Low', 'Medium', 'High', 'Urgent'];

function FilterDropdown({ filters, onFiltersChange, disabled = false }) {
  const { users, fetchUsers } = useUserStore();
  const { categories, fetchCategories } = useCategoryStore();
  const { currentWorkspaceId } = useWorkspaceStore();
  const [isOpen, setIsOpen] = useState(false);

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
    <Popover open={isOpen} onOpenChange={(open) => { if (!disabled) setIsOpen(open); }}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          size="default"
          disabled={disabled}
          className={`flex items-center gap-1.5 sm:gap-2 px-3 py-2 sm:px-4 h-10 ${
            activeFilterCount > 0
              ? 'border-ring bg-accent text-primary hover:bg-accent'
              : ''
          }`}
        >
          <Filter size={18} className="sm:w-5 sm:h-5" />
          <span className="hidden sm:inline">Filters</span>
          {activeFilterCount > 0 && (
            <span className="flex items-center justify-center w-5 h-5 text-xs font-semibold text-primary-foreground bg-primary rounded-full">
              {activeFilterCount}
            </span>
          )}
        </Button>
      </PopoverTrigger>

      <PopoverContent
        align="end"
        className="w-72 max-h-[80vh] overflow-y-auto p-4"
      >
        {/* Header */}
        <div className="flex items-center justify-between mb-4">
          <h3 className="font-semibold text-foreground">Filter Tasks</h3>
          <div className="flex items-center gap-3">
            {activeFilterCount > 0 && (
              <button
                onClick={clearAllFilters}
                className="text-sm text-foreground hover:text-foreground transition-all duration-150"
              >
                Clear all
              </button>
            )}
          </div>
        </div>

        {/* Assignee Filter */}
        <div className="mb-4">
          <h4 className="text-sm font-medium text-muted-foreground mb-2">Assignee</h4>
          <div className="max-h-40 overflow-y-auto rounded-lg border border-border">
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
          <h4 className="text-sm font-medium text-muted-foreground mb-2">Priority</h4>
          <div className="space-y-1">
            {PRIORITY_OPTIONS.map((priority) => (
              <label
                key={priority}
                className="flex items-center gap-3 cursor-pointer hover:bg-background p-2 rounded-lg active:bg-background transition-all duration-150"
              >
                <input
                  type="checkbox"
                  checked={filters.priorities.includes(priority)}
                  onChange={() => handleTogglePriority(priority)}
                  className="w-5 h-5 sm:w-4 sm:h-4 text-primary border-input rounded focus:ring-2 focus:ring-ring/20"
                />
                <span className="text-sm text-foreground">{priority}</span>
              </label>
            ))}
          </div>
        </div>

        {/* Category Filter */}
        <div className="mb-4">
          <h4 className="text-sm font-medium text-muted-foreground mb-2">Category</h4>
          <div className="space-y-1 max-h-40 overflow-y-auto">
            {categories.map((category) => (
              <label
                key={category.id}
                className="flex items-center gap-3 cursor-pointer hover:bg-accent p-2 rounded-lg active:bg-accent transition-all duration-150"
              >
                <input
                  type="checkbox"
                  checked={filters.categories.includes(category.id)}
                  onChange={() => handleToggleCategory(category.id)}
                  className="w-5 h-5 sm:w-4 sm:h-4 text-foreground border-input rounded focus:ring-2 focus:ring-neutral-900/10"
                />
                <div className="flex items-center gap-2">
                  <div
                    className="w-3 h-3 rounded-full flex-shrink-0"
                    style={{ backgroundColor: category.color }}
                  ></div>
                  <span className="text-sm text-foreground">{category.name}</span>
                </div>
              </label>
            ))}
          </div>
        </div>

        {/* Completed Filter */}
        <div className="pt-3 border-t border-border">
          <label className="flex items-center gap-3 cursor-pointer hover:bg-accent p-2 rounded-lg active:bg-accent transition-all duration-150">
            <input
              type="checkbox"
              checked={filters.hideCompleted}
              onChange={handleToggleCompleted}
              className="w-5 h-5 sm:w-4 sm:h-4 text-foreground border-input rounded focus:ring-2 focus:ring-neutral-900/10"
            />
            <span className="text-sm text-foreground">Hide completed tasks</span>
          </label>
        </div>

        {/* Mobile Apply Button */}
        <div className="mt-4 sm:hidden">
          <Button
            onClick={() => setIsOpen(false)}
            className="w-full"
          >
            Apply Filters
          </Button>
        </div>
      </PopoverContent>
    </Popover>
  );
}

export default FilterDropdown;
