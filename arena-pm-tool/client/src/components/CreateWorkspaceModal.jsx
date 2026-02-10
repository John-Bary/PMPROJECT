import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { X, Loader2, Briefcase } from 'lucide-react';
import { useWorkspace } from '../contexts/WorkspaceContext';

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

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto">
      {/* Backdrop */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 bg-black/20"
        onClick={handleClose}
      />

      {/* Modal */}
      <div className="flex min-h-full items-center justify-center p-4">
        <motion.div
          initial={{ opacity: 0, scale: 0.98 }}
          animate={{ opacity: 1, scale: 1 }}
          exit={{ opacity: 0, scale: 0.98 }}
          transition={{ duration: 0.2 }}
          className="relative bg-white rounded-xl shadow-md w-full max-w-md border border-neutral-200">
          {/* Header */}
          <div className="flex items-center justify-between px-6 py-4 border-b border-neutral-200">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-neutral-100 rounded-lg">
                <Briefcase className="w-5 h-5 text-neutral-600" />
              </div>
              <h2 className="text-lg font-semibold text-neutral-900">Create Workspace</h2>
            </div>
            <button
              onClick={handleClose}
              disabled={isLoading}
              className="p-2 text-neutral-400 hover:text-neutral-600 hover:bg-neutral-100 rounded-lg transition-colors disabled:opacity-50"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Form */}
          <form onSubmit={handleSubmit} className="p-6 space-y-4">
            <div>
              <label htmlFor="workspace-name" className="block text-sm font-medium text-neutral-700 mb-2">
                Workspace Name
              </label>
              <input
                id="workspace-name"
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="e.g., Marketing Team"
                disabled={isLoading}
                className="w-full px-4 py-2.5 bg-white border border-neutral-300 rounded-lg
                         text-neutral-900 placeholder-neutral-400
                         focus:outline-none focus:ring-2 focus:ring-primary-500/20 focus:border-primary-300
                         disabled:opacity-50 disabled:cursor-not-allowed"
                autoFocus
              />
            </div>

            {error && (
              <div className="p-3 bg-red-50 border border-red-200 rounded-lg">
                <p className="text-sm text-red-600">{error}</p>
              </div>
            )}

            <p className="text-xs text-neutral-500">
              Create a new workspace to organize your projects and invite team members.
            </p>

            {/* Actions */}
            <div className="flex gap-3 pt-2">
              <button
                type="button"
                onClick={handleClose}
                disabled={isLoading}
                className="flex-1 px-4 py-2.5 border border-neutral-300 text-neutral-700 rounded-lg
                         hover:bg-neutral-50 hover:border-neutral-400 transition-colors
                         disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={isLoading || !name.trim()}
                className="flex-1 px-4 py-2.5 bg-primary-600 text-white rounded-lg
                         hover:bg-primary-700 transition-colors
                         disabled:opacity-50 disabled:cursor-not-allowed
                         flex items-center justify-center gap-2"
              >
                {isLoading && <Loader2 className="w-4 h-4 animate-spin" />}
                {isLoading ? 'Creating...' : 'Create Workspace'}
              </button>
            </div>
          </form>
        </motion.div>
      </div>
    </div>
  );
}

export default CreateWorkspaceModal;
