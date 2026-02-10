import { useState, useEffect, useCallback } from 'react';
import { Loader2 } from 'lucide-react';
import { workspacesAPI } from '../../utils/api';
import useWorkspaceStore from '../../store/workspaceStore';
import { formatDistanceToNow } from 'date-fns';

function formatAction(activity) {
  const title = activity.metadata?.title;
  const entityLabel = activity.entityType === 'task' ? 'task' : activity.entityType;
  const titlePart = title ? ` "${title}"` : '';

  switch (activity.action) {
    case 'created':
      return `created ${entityLabel}${titlePart}`;
    case 'updated':
      return `updated ${entityLabel}${titlePart}`;
    case 'deleted':
      return `deleted ${entityLabel}${titlePart}`;
    case 'completed':
      return `completed ${entityLabel}${titlePart}`;
    default:
      return `${activity.action} ${entityLabel}${titlePart}`;
  }
}

const ActivityTab = () => {
  const { currentWorkspaceId } = useWorkspaceStore();
  const [activities, setActivities] = useState([]);
  const [isLoading, setIsLoading] = useState(true);

  const fetchActivities = useCallback(async () => {
    if (!currentWorkspaceId) return;
    try {
      const { data } = await workspacesAPI.getActivity(currentWorkspaceId, { limit: 50 });
      setActivities(data.data.activities);
    } catch {
      // silently fail
    } finally {
      setIsLoading(false);
    }
  }, [currentWorkspaceId]);

  useEffect(() => {
    fetchActivities();
  }, [fetchActivities]);

  return (
    <div>
      <div className="mb-6">
        <h2 className="text-2xl font-bold text-white">Recent Activity</h2>
        <p className="text-neutral-400 mt-1">Activity feed for your current workspace.</p>
      </div>

      <div className="rounded-xl border border-neutral-800 bg-neutral-900 p-6">
        {isLoading ? (
          <div className="flex justify-center py-12">
            <Loader2 size={24} className="animate-spin text-neutral-500" />
          </div>
        ) : !currentWorkspaceId ? (
          <p className="text-sm text-neutral-500 text-center py-8">No workspace selected.</p>
        ) : activities.length === 0 ? (
          <p className="text-sm text-neutral-500 text-center py-8">No activity yet.</p>
        ) : (
          <ul className="space-y-4">
            {activities.map((activity) => {
              const userName = activity.user?.firstName && activity.user?.lastName
                ? `${activity.user.firstName} ${activity.user.lastName}`
                : activity.user?.name || 'Someone';

              return (
                <li key={activity.id} className="flex items-start gap-3 text-sm">
                  <div className="w-7 h-7 rounded-full bg-neutral-700/20 flex items-center justify-center flex-shrink-0 mt-0.5">
                    <span className="text-xs font-medium text-neutral-300">
                      {userName.charAt(0).toUpperCase()}
                    </span>
                  </div>
                  <div className="min-w-0">
                    <p className="text-neutral-300">
                      <span className="font-medium text-white">{userName}</span>{' '}
                      {formatAction(activity)}
                    </p>
                    <p className="text-xs text-neutral-500 mt-0.5">
                      {formatDistanceToNow(new Date(activity.createdAt), { addSuffix: true })}
                    </p>
                  </div>
                </li>
              );
            })}
          </ul>
        )}
      </div>
    </div>
  );
};

export default ActivityTab;
