import { Plus } from 'lucide-react';

function AddCategoryButton({ onClick }) {
  return (
    <div className="flex-shrink-0">
      <button
        onClick={onClick}
        className="flex items-center gap-1.5 px-3 py-2 text-neutral-400 hover:text-neutral-700 transition-colors text-sm"
      >
        <Plus size={16} />
        <span>Add column</span>
      </button>
    </div>
  );
}

export default AddCategoryButton;
