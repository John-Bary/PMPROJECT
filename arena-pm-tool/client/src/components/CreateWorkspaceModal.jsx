import { useState } from 'react';
import { X, Loader2, Briefcase } from 'lucide-react';
import { useWorkspace } from '../contexts/WorkspaceContext';

function CreateWorkspaceModal({ isOpen, onClose }) {
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

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto">
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-black/60 backdrop-blur-sm transition-opacity"
        onClick={handleClose}
      />

      {/* Modal */}
      <div className="flex min-h-full items-center justify-center p-4">
        <div className="relative bg-slate-800 rounded-xl shadow-xl w-full max-w-md border border-slate-700 animate-scale-in">
          {/* Header */}
          <div className="flex items-center justify-between px-6 py-4 border-b border-slate-700">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-indigo-600/20 rounded-lg">
                <Briefcase className="w-5 h-5 text-indigo-400" />
              </div>
              <h2 className="text-lg font-semibold text-white">Create Workspace</h2>
            </div>
            <button
              onClick={handleClose}
              disabled={isLoading}
              className="p-2 text-slate-400 hover:text-white hover:bg-slate-700 rounded-lg transition-colors disabled:opacity-50"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Form */}
          <form onSubmit={handleSubmit} className="p-6 space-y-4">
            <div>
              <label htmlFor="workspace-name" className="block text-sm font-medium text-slate-300 mb-2">
                Workspace Name
              </label>
              <input
                id="workspace-name"
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="e.g., Marketing Team"
                disabled={isLoading}
                className="w-full px-4 py-2.5 bg-slate-900 border border-slate-600 rounded-lg
                         text-white placeholder-slate-500
                         focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent
                         disabled:opacity-50 disabled:cursor-not-allowed"
                autoFocus
              />
            </div>

            {error && (
              <div className="p-3 bg-red-500/10 border border-red-500/30 rounded-lg">
                <p className="text-sm text-red-400">{error}</p>
              </div>
            )}

            <p className="text-xs text-slate-500">
              Create a new workspace to organize your projects and invite team members.
            </p>

            {/* Actions */}
            <div className="flex gap-3 pt-2">
              <button
                type="button"
                onClick={handleClose}
                disabled={isLoading}
                className="flex-1 px-4 py-2.5 border border-slate-600 text-slate-300 rounded-lg
                         hover:bg-slate-700 hover:border-slate-500 transition-colors
                         disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={isLoading || !name.trim()}
                className="flex-1 px-4 py-2.5 bg-indigo-600 text-white rounded-lg
                         hover:bg-indigo-700 transition-colors
                         disabled:opacity-50 disabled:cursor-not-allowed
                         flex items-center justify-center gap-2"
              >
                {isLoading && <Loader2 className="w-4 h-4 animate-spin" />}
                {isLoading ? 'Creating...' : 'Create Workspace'}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}

export default CreateWorkspaceModal;
