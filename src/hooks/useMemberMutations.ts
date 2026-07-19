import { useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/fetch';
import type { ApiResponse, Member } from '@/types/api';

export function useAddMember(boardId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (identifier: string) =>
      api.post<ApiResponse<Member>>(`/api/boards/${boardId}/members`, { identifier }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['boards', boardId, 'members'] }),
  });
}

export function useRemoveMember(boardId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (identifier: string) =>
      api.delete<ApiResponse<null>>(`/api/boards/${boardId}/members`, {
    body: JSON.stringify({ identifier }),
    }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['boards', boardId, 'members'] }),
  });
}

export function useChangeRole(boardId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ identifier, role }: { identifier: string; role: string }) =>
      api.patch<ApiResponse<Member>>(`/api/boards/${boardId}/members`, { identifier, role }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['boards', boardId, 'members'] }),
  });
}