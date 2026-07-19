// hooks/useComments.ts
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/fetch';
import type { CreateCommentInput, UpdateCommentInput } from '@/schemas/taskSchema';
import { ApiResponse, Comment } from '@/types/api';
import { taskDetailKey } from '@/lib/queryKeys';

export function useCreateComment(boardId: string, columnId: string, taskId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: CreateCommentInput) =>
      api.post<ApiResponse<Comment>>(`/api/boards/${boardId}/columns/${columnId}/tasks/${taskId}/comments`, data),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: taskDetailKey(boardId, taskId) }),
  });
}

export function useUpdateComment(boardId: string, columnId: string, taskId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ commentId, ...data }: UpdateCommentInput & { commentId: string }) =>
      api.patch<ApiResponse<Comment>>(`/api/boards/${boardId}/columns/${columnId}/tasks/${taskId}/comments/${commentId}`, data),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: taskDetailKey(boardId, taskId) }),
  });
}

export function useDeleteComment(boardId: string, columnId: string, taskId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (commentId: string) =>
      api.delete<void>(`/api/boards/${boardId}/columns/${columnId}/tasks/${taskId}/comments/${commentId}`),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: taskDetailKey(boardId, taskId) }),
  });
}