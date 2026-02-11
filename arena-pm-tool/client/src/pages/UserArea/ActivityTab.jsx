import { useState, useEffect, useCallback } from 'react';
import { Loader2 } from 'lucide-react';
import { workspacesAPI } from '../../utils/api';
import useWorkspaceStore from '../../store/workspaceStore';
import { formatDistanceToNow } from 'date-fns';
import { Card, CardContent } from 'components/ui/card';
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
        <h2 className="text-2xl font-bold text-foreground">Recent Activity</h2>
        <p className="text-muted-foreground mt-1">Activity feed for your current workspace.</p>
      </div>

      <Card>
        <CardContent className="p-6">
          {isLoading ? (
            <div className="flex justify-center py-12">
              <Loader2 size={24} className="animate-spin text-muted-foreground" />
            </div>
          ) : !currentWorkspaceId ? (
            <p className="text-sm text-muted-foreground text-center py-8">No workspace selected.</p>
          ) : activities.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-8">No activity yet.</p>
          ) : (
            <ul className="space-y-4">
              {activities.map((activity, index) => {
                const userName = activity.user?.firstName && activity.user?.lastName
                  ? `${activity.user.firstName} ${activity.user.lastName}`
                  : activity.user?.name || 'Someone';

                return (
                  <li key={activity.id}>
                    <div className="flex items-start gap-3 text-sm">
                      <Avatar className="h-7 w-7 mt-0.5">
                        <AvatarFallback className="bg-muted text-foreground text-xs font-medium">
                          {userName.charAt(0).toUpperCase()}
                        </AvatarFallback>
                      </Avatar>
                      <div className="min-w-0">
                        <p className="text-muted-foreground">
                          <span className="font-medium text-foreground">{userName}</span>{' '}
                          {formatAction(activity)}
                        </p>
                        <p className="text-xs text-muted-foreground mt-0.5">
                          {formatDistanceToNow(new Date(activity.createdAt), { addSuffix: true })}
                        </p>
                      </div>
                    </div>
                    {index < activities.length - 1 && (
                      <Separator className="mt-4" />
                    )}
                  </li>
                );
              })}
            </ul>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default ActivityTab;
