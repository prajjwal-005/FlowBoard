import { useState, useRef } from 'react';
import {
  DragStartEvent, DragOverEvent, DragEndEvent,
  PointerSensor, useSensor, useSensors, closestCenter,
} from '@dnd-kit/core';
import { arrayMove } from '@dnd-kit/sortable';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { api } from '@/lib/fetch';
import { boardKeys } from '@/lib/queryKeys';
import { useReorderColumn } from '@/hooks/useColumns';
import { useReorderTask } from '@/hooks/useTask';
import type { Board } from '@/types/api';
import { type CollisionDetection } from '@dnd-kit/core';

function useCrossColumnMove(boardId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({
      sourceColumnId, taskId, columnID, order,
    }: { sourceColumnId: string; taskId: string; columnID: string; order: number; previousBoard: Board }) =>
      api.patch(`/api/boards/${boardId}/columns/${sourceColumnId}/tasks/${taskId}`, { columnID, order }),

    onMutate: async ({ previousBoard }) => {
      await queryClient.cancelQueries({ queryKey: boardKeys.detail(boardId) });
      return { previousBoard };
    },
    onError: (_err, _vars, context) => {
      if (context?.previousBoard) queryClient.setQueryData(boardKeys.detail(boardId), context.previousBoard);
      toast.error('Could not move task — reverted.');
    },
    onSuccess: (_data, vars) => {
      queryClient.invalidateQueries({ queryKey: ['boards', boardId, 'tasks', vars.taskId] });
    },
  });
}

const boardCollisionDetection: CollisionDetection = (args) => {
  const activeType = args.active.data.current?.type;
  if (activeType === 'column') {
    const columnsOnly = args.droppableContainers.filter((c) => c.data.current?.type === 'column');
    return closestCenter({ ...args, droppableContainers: columnsOnly });
  }
  return closestCenter(args);
};


export function useBoardDnd(boardId: string) {
  const queryClient = useQueryClient();
  const reorderColumn = useReorderColumn(boardId);
  const reorderTask = useReorderTask(boardId);
  const crossColumnMove = useCrossColumnMove(boardId);
  const dragSourceColumnId = useRef<string | null>(null);
  const dragStartSnapshot = useRef<Board | null>(null);

  const [activeId, setActiveId] = useState<string | null>(null);
  const [activeType, setActiveType] = useState<'column' | 'task' | null>(null);

  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 4 } }));
  const getBoard = () => queryClient.getQueryData<Board>(boardKeys.detail(boardId));

  function handleDragStart(event: DragStartEvent) {
    setActiveId(String(event.active.id));
    setActiveType(event.active.data.current?.type ?? null);
    dragSourceColumnId.current = (event.active.data.current?.columnId as string) ?? null;
    dragStartSnapshot.current = getBoard() ?? null; // pristine, pre-drag-over state
  }
 

  function handleDragOver(event: DragOverEvent) {
    const { active, over } = event;
    if (!over || active.id === over.id) return;
    const board = getBoard();
    if (!board) return;
    const type = active.data.current?.type;

    if (type === 'column') {
      const oldIndex = board.columns.findIndex((c) => c.id === active.id);
      const newIndex = board.columns.findIndex((c) => c.id === over.id);
      if (oldIndex === -1 || newIndex === -1) return;
      queryClient.setQueryData<Board>(boardKeys.detail(boardId), {
        ...board,
        columns: arrayMove(board.columns, oldIndex, newIndex),
      });
      return;
    }

    if (type === 'task') {
      const sourceColId = active.data.current?.columnId as string;
      const overType = over.data.current?.type;
      const destColId = overType === 'task' ? (over.data.current?.columnId as string) : String(over.id);

      const sourceCol = board.columns.find((c) => c.id === sourceColId);
      const destCol = board.columns.find((c) => c.id === destColId);
      if (!sourceCol || !destCol) return;

      const activeTask = sourceCol.tasks.find((t) => t.id === active.id);
      if (!activeTask) return;

      if (sourceColId === destColId) {
        const oldIndex = sourceCol.tasks.findIndex((t) => t.id === active.id);
        const newIndex = overType === 'task' ? destCol.tasks.findIndex((t) => t.id === over.id) : destCol.tasks.length;
        if (oldIndex === newIndex) return;
        queryClient.setQueryData<Board>(boardKeys.detail(boardId), {
          ...board,
          columns: board.columns.map((c) =>
            c.id === sourceColId ? { ...c, tasks: arrayMove(c.tasks, oldIndex, newIndex) } : c
          ),
        });
      } else {
        const newIndex = overType === 'task' ? destCol.tasks.findIndex((t) => t.id === over.id) : destCol.tasks.length;
        queryClient.setQueryData<Board>(boardKeys.detail(boardId), {
          ...board,
          columns: board.columns.map((c) => {
            if (c.id === sourceColId) return { ...c, tasks: c.tasks.filter((t) => t.id !== active.id) };
            if (c.id === destColId) {
              const tasks = [...c.tasks];
              tasks.splice(newIndex, 0, { ...activeTask, columnID: destColId });
              return { ...c, tasks };
            }
            return c;
          }),
        });
      }
    }
  }

  function handleDragEnd(event: DragEndEvent) {
    const { active } = event;
    const board = getBoard();
    setActiveId(null);
    setActiveType(null);
    if (!board) return;

    const type = active.data.current?.type;

   if (type === 'column') {
        const index = board.columns.findIndex((c) => c.id === active.id);
        if (index === -1 || !dragStartSnapshot.current) return;
        const prevOrder = index > 0 ? board.columns[index - 1].order : null;
        const nextOrder = index < board.columns.length - 1 ? board.columns[index + 1].order : null;
        reorderColumn.mutate({ columnId: String(active.id), prevOrder, nextOrder, previousBoard: dragStartSnapshot.current });
        return;
    }

    if (type === 'task') {
      const originalColumnId = dragSourceColumnId.current;
      const col = board.columns.find((c) => c.tasks.some((t) => t.id === active.id));
      if (!col) return;

      const index = col.tasks.findIndex((t) => t.id === active.id);
      const prevOrder = index > 0 ? col.tasks[index - 1].order : null;
      const nextOrder = index < col.tasks.length - 1 ? col.tasks[index + 1].order : null;
      if (!originalColumnId || !dragStartSnapshot.current) return;
      if (col.id === originalColumnId) {
            reorderTask.mutate({ columnId: col.id, taskId: String(active.id), prevOrder, nextOrder, previousBoard: dragStartSnapshot.current });
      } else {
            const newOrder =
                prevOrder === null && nextOrder === null ? 1000
                : prevOrder === null ? nextOrder! - 500
                : nextOrder === null ? prevOrder + 1000
                : (prevOrder + nextOrder) / 2;

            if (!dragStartSnapshot.current) return;

            crossColumnMove.mutate({
                sourceColumnId: originalColumnId,
                taskId: String(active.id),
                columnID: col.id,
                order: newOrder,
                previousBoard: dragStartSnapshot.current,
            });
        }
    }
  }

  return { sensors, collisionDetection: boardCollisionDetection,closestCenter, activeId, activeType, handleDragStart, handleDragOver, handleDragEnd };
}