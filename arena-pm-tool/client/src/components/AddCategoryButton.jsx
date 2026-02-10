import { Plus } from 'lucide-react';
import { Button } from 'components/ui/button';

function AddCategoryButton({ onClick }) {
  return (
    <div className="flex-shrink-0">
      <Button
        onClick={onClick}
        variant="ghost"
        size="sm"
        className="text-[#94A3B8] hover:text-primary-600 hover:bg-primary-50"
      >
        <Plus size={16} />
        <span>Add column</span>
      </Button>
    </div>
  );
}

export default AddCategoryButton;
