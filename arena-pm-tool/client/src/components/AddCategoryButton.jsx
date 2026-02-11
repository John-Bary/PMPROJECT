import { Plus } from 'lucide-react';

function AddCategoryButton({ onClick }) {
  return (
    <div className="flex-shrink-0 min-w-[200px]">
      <button
        onClick={onClick}
        className="w-full flex items-center justify-center gap-2 border border-dashed border-border rounded-lg px-4 py-3 text-sm text-muted-foreground hover:border-primary/50 hover:text-foreground cursor-pointer transition-colors"
      >
        <Plus size={16} className="h-4 w-4" />
        <span>Add column</span>
      </button>
    </div>
  );
}

export default AddCategoryButton;
