import { useState, useEffect, useCallback } from 'react';
import { Activity, Loader2 } from 'lucide-react';
import { workspacesAPI } from '../utils/api';
import { formatDistanceToNow } from 'date-fns';
import { Avatar, AvatarFallback } from 'components/ui/avatar';
import { Separator } from 'components/ui/separator';

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
        <ul className="space-y-0">
          {activities.map((activity, index) => {
            const userName = activity.user?.firstName && activity.user?.lastName
              ? `${activity.user.firstName} ${activity.user.lastName}`
              : activity.user?.name || 'Someone';

            return (
              <li key={activity.id}>
                <div className="flex items-start gap-3 text-sm py-3">
                  <Avatar className="h-6 w-6 flex-shrink-0 mt-0.5">
                    <AvatarFallback className="text-xs font-medium bg-neutral-100 text-neutral-600">
                      {userName.charAt(0).toUpperCase()}
                    </AvatarFallback>
                  </Avatar>
                  <div className="min-w-0">
                    <p className="text-neutral-700">
                      <span className="font-medium">{userName}</span>{' '}
                      {formatAction(activity)}
                    </p>
                    <p className="text-xs text-neutral-400 mt-0.5">
                      {formatDistanceToNow(new Date(activity.createdAt), { addSuffix: true })}
                    </p>
                  </div>
                </div>
                {index < activities.length - 1 && <Separator />}
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}

export default ActivityFeed;
