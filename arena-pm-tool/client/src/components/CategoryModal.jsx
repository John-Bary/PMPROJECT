import { useState, useEffect } from 'react';
import { X } from 'lucide-react';
import useCategoryStore from '../store/categoryStore';
import { ButtonSpinner } from './Loader';

const AVAILABLE_COLORS = [
  { name: 'Teal', value: '#14b8a6' },
  { name: 'Blue', value: '#3b82f6' },
  { name: 'Green', value: '#22c55e' },
  { name: 'Indigo', value: '#6366f1' },
  { name: 'Purple', value: '#a855f7' },
  { name: 'Pink', value: '#ec4899' },
  { name: 'Orange', value: '#f97316' },
  { name: 'Yellow', value: '#eab308' },
  { name: 'Red', value: '#ef4444' },
  { name: 'Gray', value: '#6b7280' },
];

function CategoryModal({ isOpen, onClose, category = null }) {
  const { createCategory, updateCategory } = useCategoryStore();
  const isEditMode = !!category;
  const [isSubmitting, setIsSubmitting] = useState(false);

  const [formData, setFormData] = useState({
    name: '',
    color: '#14b8a6', // Default blue
  });

  useEffect(() => {
    if (isOpen) {
      if (category) {
        setFormData({
          name: category.name || '',
          color: category.color || '#3b82f6',
        });
      } else {
        setFormData({
          name: '',
          color: '#14b8a6',
        });
      }
    }
  }, [isOpen, category]);

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!formData.name.trim()) {
      return;
    }

    setIsSubmitting(true);

    try {
      const categoryData = {
        name: formData.name.trim(),
        color: formData.color,
      };

      let result;
      if (isEditMode) {
        result = await updateCategory(category.id, categoryData);
      } else {
        result = await createCategory(categoryData);
      }

      if (result.success) {
        onClose();
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleClose = () => {
    setFormData({ name: '', color: '#14b8a6' });
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto">
      <div
        className="fixed inset-0 bg-black/40 backdrop-blur-sm transition-opacity"
        onClick={handleClose}
      ></div>

      <div className="flex min-h-full items-end sm:items-center justify-center p-0 sm:p-4">
        <div className="relative bg-white rounded-t-2xl sm:rounded-2xl shadow-xl w-full sm:max-w-md max-h-[90vh] overflow-y-auto animate-scale-in">
          <div className="p-4 sm:p-6">
            {/* Mobile drag handle indicator */}
            <div className="w-12 h-1 bg-neutral-300 rounded-full mx-auto mb-4 sm:hidden"></div>

            {/* Header */}
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg sm:text-xl font-semibold text-neutral-900">
                {isEditMode ? 'Edit Category' : 'New Category'}
              </h2>
              <button
                onClick={handleClose}
                className="p-1.5 text-neutral-400 hover:text-neutral-600 hover:bg-neutral-100 rounded-lg transition-all duration-150"
                disabled={isSubmitting}
              >
                <X size={24} />
              </button>
            </div>

            {/* Form */}
            <form onSubmit={handleSubmit}>
              {/* Category Name */}
              <div className="mb-4">
                <label htmlFor="name" className="block text-sm font-medium text-neutral-700 mb-1">
                  Category Name
                </label>
                <input
                  type="text"
                  id="name"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  className="w-full px-3 py-2.5 sm:py-2 border border-neutral-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-500/40 focus:border-teal-500 transition-all duration-150 text-base sm:text-sm"
                  placeholder="e.g., Work, Personal, Shopping"
                  required
                  disabled={isSubmitting}
                />
              </div>

              {/* Color Picker */}
              <div className="mb-6">
                <label className="block text-sm font-medium text-neutral-700 mb-2">
                  Color
                </label>
                <div className="grid grid-cols-5 gap-2 sm:gap-2">
                  {AVAILABLE_COLORS.map((color) => (
                    <button
                      key={color.value}
                      type="button"
                      onClick={() => setFormData({ ...formData, color: color.value })}
                      className={`w-full h-11 sm:h-10 rounded-lg border-2 transition-all duration-150 active:scale-95 ${
                        formData.color === color.value
                          ? 'border-neutral-900 scale-110 shadow-sm'
                          : 'border-neutral-200 hover:border-neutral-400'
                      }`}
                      style={{ backgroundColor: color.value }}
                      title={color.name}
                    />
                  ))}
                </div>
              </div>

              {/* Buttons */}
              <div className="flex flex-col-reverse sm:flex-row gap-2 sm:gap-3">
                <button
                  type="button"
                  onClick={handleClose}
                  className="flex-1 px-4 py-2.5 sm:py-2 border border-neutral-200 text-neutral-700 rounded-lg hover:bg-neutral-50 hover:border-neutral-300 transition-all duration-200 text-sm sm:text-base active:scale-[0.98]"
                  disabled={isSubmitting}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="flex-1 px-4 py-2.5 sm:py-2 bg-teal-500 text-white rounded-lg hover:bg-teal-600 shadow-sm hover:shadow transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center text-sm sm:text-base active:scale-[0.98]"
                  disabled={isSubmitting}
                >
                  {isSubmitting && <ButtonSpinner />}
                  {isSubmitting
                    ? (isEditMode ? 'Updating...' : 'Creating...')
                    : (isEditMode ? 'Update' : 'Create')
                  }
                </button>
              </div>
            </form>
          </div>
        </div>
      </div>
    </div>
  );
}

export default CategoryModal;
