import { useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/fetch';
import type { ApiResponse, Task } from '@/types/api';
import { boardKeys } from '@/lib/queryKeys';
import type { CreateTaskInput, UpdateTaskInput } from '@/schemas/taskSchema';
import type { Board } from '@/types/api';
import { toast } from 'sonner';

export function useCreateTask(boardId: string, columnId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (data: CreateTaskInput) => {
      const res = await api.post<ApiResponse<Task>>(
        `/api/boards/${boardId}/columns/${columnId}/tasks`,
        data
      );
      return res.data;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: boardKeys.detail(boardId) }),
  });
}

// export function useUpdateTask(boardId: string, columnId: string, taskId: string) {
//   const queryClient = useQueryClient();
//   return useMutation({
//     mutationFn: (data: UpdateTaskInput) =>
//       api.patch(`/api/boards/${boardId}/columns/${columnId}/tasks/${taskId}`, data),
//     onSuccess: () => {
//       queryClient.invalidateQueries({ queryKey: boardKeys.detail(boardId) });
//       queryClient.invalidateQueries({ queryKey: ['boards', boardId, 'tasks', taskId] });
//     },
//   });
// }


export function useUpdateTask(boardId: string, columnId: string, taskId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: UpdateTaskInput) =>
      api.patch(`/api/boards/${boardId}/columns/${columnId}/tasks/${taskId}`, data),

    onMutate: async (data) => {
      await queryClient.cancelQueries({ queryKey: boardKeys.detail(boardId) });
      await queryClient.cancelQueries({ queryKey: ['boards', boardId, 'tasks', taskId] });

      const previousBoard = queryClient.getQueryData<Board>(boardKeys.detail(boardId));
      const previousTask = queryClient.getQueryData(['boards', boardId, 'tasks', taskId]);

      if (previousBoard) {
        queryClient.setQueryData<Board>(boardKeys.detail(boardId), {
          ...previousBoard,
          columns: previousBoard.columns.map((c) =>
            c.id === columnId
              ? { ...c, tasks: c.tasks.map((t) => (t.id === taskId ? { ...t, ...data } : t)) }
              : c
          ),
        });
      }

      if (previousTask) {
        queryClient.setQueryData(['boards', boardId, 'tasks', taskId], { ...previousTask, ...data });
      }

      return { previousBoard, previousTask };
    },

    onError: (_err, _vars, context) => {
      if (context?.previousBoard) queryClient.setQueryData(boardKeys.detail(boardId), context.previousBoard);
      if (context?.previousTask) queryClient.setQueryData(['boards', boardId, 'tasks', taskId], context.previousTask);
    },

    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: boardKeys.detail(boardId) });
      queryClient.invalidateQueries({ queryKey: ['boards', boardId, 'tasks', taskId] });
    },
  });
}
export function useDeleteTask(boardId: string, columnId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (taskId: string) =>
      api.delete<void>(`/api/boards/${boardId}/columns/${columnId}/tasks/${taskId}`),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: boardKeys.detail(boardId) }),
  });
}

interface ReorderTaskVars {
  columnId: string;
  taskId: string;
  prevOrder: number | null;
  nextOrder: number | null;
  previousBoard: Board;
}

export function useReorderTask(boardId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ columnId, taskId, prevOrder, nextOrder }: ReorderTaskVars) =>
      api.post(`/api/boards/${boardId}/columns/${columnId}/tasks/reorder`, { taskId, prevOrder, nextOrder }),

    onMutate: async ({ previousBoard }) => {
      await queryClient.cancelQueries({ queryKey: boardKeys.detail(boardId) });
      return { previousBoard };
    },

    onError: (_err, _vars, context) => {
      if (context?.previousBoard) {
        queryClient.setQueryData(boardKeys.detail(boardId), context.previousBoard);
      }
      toast.error('Could not reorder task — reverted.');
    },
  });
}