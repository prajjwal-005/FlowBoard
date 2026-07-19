import { useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/fetch';
import { boardKeys } from '@/lib/queryKeys';
import { toast } from 'sonner';
import type { Board } from '@/types/api';

export function useDeleteColumn(boardId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (columnId: string) =>
      api.delete<void>(`/api/boards/${boardId}/columns/${columnId}`),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: boardKeys.detail(boardId) }),
  });
}

export function useRenameColumn(boardId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ columnId, title }: { columnId: string; title: string }) =>
      api.patch(`/api/boards/${boardId}/columns/${columnId}`, { title }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: boardKeys.detail(boardId) }),
  });
}


interface ReorderColumnVars {
  columnId: string;
  prevOrder: number | null;
  nextOrder: number | null;
  previousBoard: Board;
}

export function useReorderColumn(boardId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ columnId, prevOrder, nextOrder }: ReorderColumnVars) =>
      api.post(`/api/boards/${boardId}/columns/reorder`, { columnId, prevOrder, nextOrder }),

    onMutate: async ({ previousBoard }) => {
      await queryClient.cancelQueries({ queryKey: boardKeys.detail(boardId) });
      return { previousBoard };
    },

    onError: (_err, _vars, context) => {
      if (context?.previousBoard) {
        queryClient.setQueryData(boardKeys.detail(boardId), context.previousBoard);
      }
      toast.error('Could not reorder columns — reverted.');
    },
  });
}