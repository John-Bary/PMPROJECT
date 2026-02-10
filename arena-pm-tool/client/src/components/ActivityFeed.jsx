import { useState, useEffect, useCallback } from 'react';
import { Activity, Loader2 } from 'lucide-react';
import { workspacesAPI } from '../utils/api';
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

function ActivityFeed({ workspaceId }) {
  const [activities, setActivities] = useState([]);
  const [isLoading, setIsLoading] = useState(true);

  const fetchActivities = useCallback(async () => {
    if (!workspaceId) return;
    try {
      const { data } = await workspacesAPI.getActivity(workspaceId, { limit: 20 });
      setActivities(data.data.activities);
    } catch {
      // silently fail
    } finally {
      setIsLoading(false);
    }
  }, [workspaceId]);

  useEffect(() => {
    fetchActivities();
  }, [fetchActivities]);

  if (!workspaceId) return null;

  return (
    <div className="bg-white rounded-lg border border-neutral-200 p-4">
      <div className="flex items-center gap-2 mb-4">
        <Activity size={18} className="text-neutral-500" />
        <h3 className="text-sm font-semibold text-neutral-900">Recent Activity</h3>
      </div>

      {isLoading ? (
        <div className="flex justify-center py-6">
          <Loader2 size={20} className="animate-spin text-neutral-400" />
        </div>
      ) : activities.length === 0 ? (
        <p className="text-sm text-neutral-400 text-center py-4">No activity yet.</p>
      ) : (
        <ul className="space-y-3">
          {activities.map((activity) => {
            const userName = activity.user?.firstName && activity.user?.lastName
              ? `${activity.user.firstName} ${activity.user.lastName}`
              : activity.user?.name || 'Someone';

            return (
              <li key={activity.id} className="flex items-start gap-3 text-sm">
                <div className="w-6 h-6 rounded-full bg-neutral-100 flex items-center justify-center flex-shrink-0 mt-0.5">
                  <span className="text-xs font-medium text-neutral-600">
                    {userName.charAt(0).toUpperCase()}
                  </span>
                </div>
                <div className="min-w-0">
                  <p className="text-neutral-700">
                    <span className="font-medium">{userName}</span>{' '}
                    {formatAction(activity)}
                  </p>
                  <p className="text-xs text-neutral-400 mt-0.5">
                    {formatDistanceToNow(new Date(activity.createdAt), { addSuffix: true })}
                  </p>
                </div>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}

export default ActivityFeed;
