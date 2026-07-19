'use client';

import { useActivity } from '@/hooks/useActivity';
import { Loader2 } from 'lucide-react';

// entityTitle's meaning varies by action (task title, column title, username,
// or — for comments, per current decision — the comment content itself).
const ACTION_TEXT: Record<string, (title: string) => string> = {
  BOARD_CREATED: () => 'created the board',
  BOARD_UPDATED: () => 'updated the board',
  COLUMN_CREATED: (t) => `created column "${t}"`,
  COLUMN_RENAMED: (t) => `renamed a column to "${t}"`,
  COLUMN_DELETED: (t) => `deleted column "${t}"`,
  COLUMN_REORDERED: (t) => `reordered column "${t}"`,
  TASK_CREATED: (t) => `created task "${t}"`,
  TASK_UPDATED: (t) => `updated task "${t}"`,
  TASK_MOVED: (t) => `moved task "${t}"`,
  TASK_DELETED: (t) => `deleted task "${t}"`,
  TASK_REORDERED: (t) => `reordered task "${t}"`,
  SUBTASK_CREATED: (t) => `added a subtask to "${t}"`,
  SUBTASK_UPDATED: (t) => `updated a subtask on "${t}"`,
  SUBTASK_DELETED: (t) => `removed a subtask from "${t}"`,
  COMMENT_CREATED: (t) => `commented: "${truncate(t)}"`,
  COMMENT_DELETED: () => 'deleted a comment',
  ASSIGNEE_ADDED: (t) => `assigned ${t} to a task`,
  ASSIGNEE_REMOVED: (t) => `unassigned ${t} from a task`,
  MEMBER_ADDED: (t) => `added ${t} to the board`,
  MEMBER_REMOVED: (t) => `removed ${t} from the board`,
  MEMBER_ROLE_CHANGED: (t) => `changed ${t}'s role`,
};

function truncate(s: string, max = 40) {
  return s.length > max ? `${s.slice(0, max)}…` : s;
}

function describeActivity(action: string, entityTitle: string) {
  const fn = ACTION_TEXT[action];
  return fn ? fn(entityTitle) : action.replace(/_/g, ' ').toLowerCase();
}

export function ActivityFeed({ boardId }: { boardId: string }) {
  const { data, isLoading, fetchNextPage, hasNextPage, isFetchingNextPage } = useActivity(boardId);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-8">
        <Loader2 className="w-5 h-5 animate-spin text-muted-foreground" />
      </div>
    );
  }

  const activities = data?.pages.flatMap((p) => p.activities) ?? [];

  if (activities.length === 0) {
    return <div className="text-caption text-muted-foreground text-center py-8">No activity yet.</div>;
  }

  return (
    <div className="space-y-1">
      {activities.map((a) => (
        <div
          key={a.id}
          className="flex items-start justify-between gap-3 py-2.5 border-b border-border/60 last:border-0"
        >
          <p className="text-body text-foreground">
            <span className="font-medium">{a.actorUsername}</span>{' '}
            {describeActivity(a.action, a.entityTitle)}
          </p>
          <span className="shrink-0 text-caption text-muted-foreground whitespace-nowrap">
            {new Date(a.createdAt).toLocaleString()}
          </span>
        </div>
      ))}

      {hasNextPage && (
        <button
          onClick={() => fetchNextPage()}
          disabled={isFetchingNextPage}
          className="w-full text-center text-caption text-primary hover:underline py-2 disabled:opacity-50"
        >
          {isFetchingNextPage ? 'Loading…' : 'Load more'}
        </button>
      )}
    </div>
  );
}