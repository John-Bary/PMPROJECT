import { Plus } from 'lucide-react';

function AddCategoryButton({ onClick }) {
  return (
    <div className="flex-shrink-0 w-80">
      <button
        onClick={onClick}
        className="w-full h-full min-h-[100px] border-2 border-dashed border-gray-300 rounded-lg hover:border-blue-500 hover:bg-blue-50 transition-all flex flex-col items-center justify-center gap-2 text-gray-500 hover:text-blue-600"
      >
        <Plus size={24} />
        <span className="font-medium">Add Category</span>
      </button>
    </div>
  );
}

export default AddCategoryButton;
