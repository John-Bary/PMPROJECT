import { useState, useEffect, useRef, useCallback } from 'react';
import { format, formatDistanceToNow } from 'date-fns';
import { Send, MoreHorizontal, Pencil, Trash2, Loader2 } from 'lucide-react';
import useAuthStore from '../store/authStore';
import { commentsAPI } from '../utils/api';
import { InlineSpinner } from './Loader';
import { toast } from 'sonner';
import { Button } from 'components/ui/button';
import { Avatar, AvatarFallback } from 'components/ui/avatar';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from 'components/ui/dropdown-menu';

function CommentSection({ taskId }) {
  const { user } = useAuthStore();
  const [comments, setComments] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [newComment, setNewComment] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [editingCommentId, setEditingCommentId] = useState(null);
  const [editingContent, setEditingContent] = useState('');
  const [deletingIds, setDeletingIds] = useState(new Set());
  const textareaRef = useRef(null);
  const editTextareaRef = useRef(null);

  // Fetch comments
  const fetchComments = useCallback(async () => {
    try {
      setIsLoading(true);
      const response = await commentsAPI.getByTaskId(taskId);
      setComments(response.data.data.comments || []);
    } catch (error) {
      console.error('Failed to fetch comments:', error);
      // Don't show error toast for missing endpoint during development
      if (error.response?.status !== 404) {
        toast.error('Failed to load comments');
      }
    } finally {
      setIsLoading(false);
    }
  }, [taskId]);

  useEffect(() => {
    fetchComments();
  }, [fetchComments]);

  // Focus edit textarea
  useEffect(() => {
    if (editingCommentId && editTextareaRef.current) {
      editTextareaRef.current.focus();
      editTextareaRef.current.setSelectionRange(
        editTextareaRef.current.value.length,
        editTextareaRef.current.value.length
      );
    }
  }, [editingCommentId]);

  const handleSubmitComment = async () => {
    if (!newComment.trim() || isSubmitting) return;

    setIsSubmitting(true);
    try {
      await commentsAPI.create(taskId, { content: newComment.trim() });
      setNewComment('');
      await fetchComments();
      toast.success('Comment added');
    } catch (error) {
      console.error('Failed to add comment:', error);
      toast.error('Failed to add comment');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) {
      e.preventDefault();
      handleSubmitComment();
    }
  };

  const handleStartEdit = (comment) => {
    setEditingCommentId(comment.id);
    setEditingContent(comment.content);
  };

  const handleSaveEdit = async () => {
    if (!editingContent.trim() || !editingCommentId) return;

    try {
      await commentsAPI.update(editingCommentId, { content: editingContent.trim() });
      await fetchComments();
      setEditingCommentId(null);
      setEditingContent('');
      toast.success('Comment updated');
    } catch (error) {
      console.error('Failed to update comment:', error);
      toast.error('Failed to update comment');
    }
  };

  const handleCancelEdit = () => {
    setEditingCommentId(null);
    setEditingContent('');
  };

  const handleDeleteComment = async (commentId) => {
    if (deletingIds.has(commentId)) return;

    setDeletingIds(prev => new Set([...prev, commentId]));
    try {
      await commentsAPI.delete(commentId);
      await fetchComments();
      toast.success('Comment deleted');
    } catch (error) {
      console.error('Failed to delete comment:', error);
      toast.error('Failed to delete comment');
    } finally {
      setDeletingIds(prev => {
        const next = new Set(prev);
        next.delete(commentId);
        return next;
      });
    }
  };

  const formatCommentTime = (dateString) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffInHours = (now - date) / (1000 * 60 * 60);

    if (diffInHours < 24) {
      return formatDistanceToNow(date, { addSuffix: true });
    }
    return format(date, 'MMM d, yyyy');
  };

  return (
    <div>
      <h3 className="text-sm font-medium text-neutral-700 mb-4">Comments</h3>

      {/* Comment Input */}
      <div className="flex gap-3 mb-6">
        <Avatar className="h-8 w-8 flex-shrink-0">
          <AvatarFallback className="bg-neutral-600 text-white text-sm font-semibold">
            {user?.name?.charAt(0).toUpperCase() || '?'}
          </AvatarFallback>
        </Avatar>
        <div className="flex-1">
          <textarea
            ref={textareaRef}
            value={newComment}
            onChange={(e) => setNewComment(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Write a comment..."
            className="w-full px-3 py-2 border border-neutral-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500/20 focus:border-primary-300 resize-none text-sm"
            rows={2}
            disabled={isSubmitting}
          />
          <div className="flex items-center justify-between mt-2">
            <span className="text-xs text-neutral-400">
              Press {navigator.platform.includes('Mac') ? 'Cmd' : 'Ctrl'}+Enter to send
            </span>
            <Button
              onClick={handleSubmitComment}
              disabled={!newComment.trim() || isSubmitting}
              size="sm"
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Sending...
                </>
              ) : (
                <>
                  <Send size={14} />
                  Comment
                </>
              )}
            </Button>
          </div>
        </div>
      </div>

      {/* Comments List */}
      {isLoading ? (
        <div className="flex items-center justify-center py-6">
          <InlineSpinner />
          <span className="ml-2 text-sm text-neutral-500">Loading comments...</span>
        </div>
      ) : comments.length === 0 ? (
        <div className="text-center py-6 text-sm text-neutral-400">
          No comments yet. Be the first to comment!
        </div>
      ) : (
        <div className="space-y-4">
          {comments.map((comment) => (
            <div key={comment.id} className="flex gap-3 group">
              <Avatar className="h-8 w-8 flex-shrink-0">
                <AvatarFallback className="bg-neutral-600 text-white text-sm font-semibold">
                  {comment.authorName?.charAt(0).toUpperCase() || '?'}
                </AvatarFallback>
              </Avatar>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <span className="text-sm font-medium text-neutral-900">
                    {comment.authorName || 'Unknown'}
                  </span>
                  <span className="text-xs text-neutral-400">
                    {formatCommentTime(comment.createdAt)}
                  </span>
                  {comment.updatedAt !== comment.createdAt && (
                    <span className="text-xs text-neutral-400">(edited)</span>
                  )}

                  {/* Actions Menu */}
                  {user?.id === comment.authorId && !editingCommentId && (
                    <div className="ml-auto">
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <button
                            className="p-1 text-neutral-400 hover:text-neutral-600 hover:bg-neutral-100 rounded opacity-0 group-hover:opacity-100 transition"
                          >
                            <MoreHorizontal size={16} />
                          </button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end" className="w-32">
                          <DropdownMenuItem
                            onClick={() => handleStartEdit(comment)}
                            className="flex items-center gap-2 cursor-pointer"
                          >
                            <Pencil size={14} />
                            Edit
                          </DropdownMenuItem>
                          <DropdownMenuItem
                            onClick={() => handleDeleteComment(comment.id)}
                            disabled={deletingIds.has(comment.id)}
                            className="flex items-center gap-2 cursor-pointer text-red-600 focus:text-red-600 focus:bg-red-50"
                          >
                            {deletingIds.has(comment.id) ? (
                              <>
                                <Loader2 className="h-3.5 w-3.5 animate-spin" />
                                Deleting...
                              </>
                            ) : (
                              <>
                                <Trash2 size={14} />
                                Delete
                              </>
                            )}
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </div>
                  )}
                </div>

                {/* Comment Content */}
                {editingCommentId === comment.id ? (
                  <div className="mt-1">
                    <textarea
                      ref={editTextareaRef}
                      value={editingContent}
                      onChange={(e) => setEditingContent(e.target.value)}
                      className="w-full px-3 py-2 border border-neutral-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500/20 focus:border-primary-300 resize-none text-sm"
                      rows={2}
                    />
                    <div className="flex gap-2 mt-2">
                      <Button
                        onClick={handleSaveEdit}
                        disabled={!editingContent.trim()}
                        size="sm"
                        className="h-7 text-xs"
                      >
                        Save
                      </Button>
                      <Button
                        onClick={handleCancelEdit}
                        variant="ghost"
                        size="sm"
                        className="h-7 text-xs"
                      >
                        Cancel
                      </Button>
                    </div>
                  </div>
                ) : (
                  <p className="mt-1 text-sm text-neutral-700 whitespace-pre-wrap break-words">
                    {comment.content}
                  </p>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

export default CommentSection;
