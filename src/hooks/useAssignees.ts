import { useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/fetch';
import { ApiResponse, Assignee } from '@/types/api';
import { taskDetailKey } from '@/lib/queryKeys';

export function useAddAssignee(boardId: string, columnId: string, taskId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (userID: string) =>
      api.post<ApiResponse<Assignee>>(`/api/boards/${boardId}/columns/${columnId}/tasks/${taskId}/assignees`, { userID }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: taskDetailKey(boardId, taskId) }),
  });
}

export function useRemoveAssignee(boardId: string, columnId: string, taskId: string) {
  const queryClient = useQueryClient();
  return useMutation({
   mutationFn: (userID: string) =>
  api.delete<void>(`/api/boards/${boardId}/columns/${columnId}/tasks/${taskId}/assignees`, {
    body: JSON.stringify({ userID }),
  }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: taskDetailKey(boardId, taskId) }),
  });
}