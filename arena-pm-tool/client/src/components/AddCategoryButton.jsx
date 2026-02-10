import { Plus } from 'lucide-react';

function AddCategoryButton({ onClick }) {
  return (
    <div className="flex-shrink-0">
      <button
        onClick={onClick}
        className="flex items-center gap-1.5 px-3 py-2 text-[#94A3B8] hover:text-primary-600 hover:bg-primary-50 rounded-lg transition-all duration-150 text-sm"
      >
        <Plus size={16} />
        <span>Add column</span>
      </button>
    </div>
  );
}

export default AddCategoryButton;
