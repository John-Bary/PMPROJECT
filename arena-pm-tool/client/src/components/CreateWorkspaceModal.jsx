import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Loader2, Briefcase } from 'lucide-react';
import { useWorkspace } from '../contexts/WorkspaceContext';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from 'components/ui/dialog';
import { Button } from 'components/ui/button';
import { Input } from 'components/ui/input';
import { Label } from 'components/ui/label';

function CreateWorkspaceModal({ isOpen, onClose, redirectToDashboard = true }) {
  const navigate = useNavigate();
  const { createWorkspace, switchWorkspace } = useWorkspace();
  const [name, setName] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!name.trim()) {
      setError('Workspace name is required');
      return;
    }

    setIsLoading(true);
    setError('');

    try {
      const result = await createWorkspace(name.trim());

      if (result.success) {
        // Switch to the new workspace
        await switchWorkspace(result.workspace.id);
        setName('');
        onClose();

        // Optionally redirect to dashboard after creating workspace
        if (redirectToDashboard) {
          navigate('/dashboard');
        }
      } else {
        setError(result.error || 'Failed to create workspace');
      }
    } catch (err) {
      setError(err.message || 'An error occurred');
    } finally {
      setIsLoading(false);
    }
  };

  const handleClose = () => {
    if (!isLoading) {
      setName('');
      setError('');
      onClose();
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && handleClose()}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <div className="flex items-center gap-3">
            <div className="p-2 bg-neutral-100 rounded-lg">
              <Briefcase className="w-5 h-5 text-neutral-600" />
            </div>
            <div>
              <DialogTitle>Create Workspace</DialogTitle>
              <DialogDescription>
                Create a new workspace to organize your projects and invite team members.
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        {/* Form */}
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="workspace-name">
              Workspace Name
            </Label>
            <Input
              id="workspace-name"
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g., Marketing Team"
              disabled={isLoading}
              autoFocus
            />
          </div>

          {error && (
            <div className="p-3 bg-red-50 border border-red-200 rounded-lg">
              <p className="text-sm text-red-600">{error}</p>
            </div>
          )}

          {/* Actions */}
          <DialogFooter className="flex gap-3 pt-2">
            <Button
              type="button"
              variant="outline"
              onClick={handleClose}
              disabled={isLoading}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={isLoading || !name.trim()}
            >
              {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              {isLoading ? 'Creating...' : 'Create Workspace'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

export default CreateWorkspaceModal;
