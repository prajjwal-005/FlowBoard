'use client';

import { Calendar } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import type { TaskBase } from '@/types/api';

interface TaskCardProps {
  task: TaskBase   ;
  onClick?: () => void;
  canDrag: boolean;
}

const priorityStyles: Record<string, string> = {
  LOW: 'bg-info-subtle text-info-text',
  MEDIUM: 'bg-warning-subtle text-warning-text',
  HIGH: 'bg-error-subtle text-error-text',
};

export function TaskCard({ task, onClick, canDrag }: TaskCardProps) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: task.id,
    data: { type: 'task', columnId: task.columnID },
    disabled: !canDrag,
  });

   const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.4 : canDrag ? 1 : 0.7,
  };

return (
    <div
      ref={setNodeRef}
      style={style}
      {...(canDrag ? attributes : {})}
      {...(canDrag ? listeners : {})}
      onClick={onClick}
      title={!canDrag ? "You can only move tasks you created" : undefined}
      className={`bg-card border border-border rounded-card p-3 space-y-2 transition-all ${
        canDrag ? 'cursor-pointer hover:border-primary/40 hover:shadow-sm' : 'cursor-default'
      }`}
    >
      <p className="text-body text-foreground line-clamp-2">{task.title}</p>

      <div className="flex items-center gap-2 flex-wrap">
        {task.priority && (
          <Badge
            variant="secondary"
            className={`text-[10px] font-medium uppercase tracking-wide ${priorityStyles[task.priority] ?? ''}`}
          >
            {task.priority}
          </Badge>
        )}

        {task.dueDate && (
          <span className="inline-flex items-center gap-1 text-caption text-muted-foreground">
            <Calendar className="w-3 h-3" />
            {new Date(task.dueDate).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
          </span>
        )}
      </div>
    </div>
  );
}