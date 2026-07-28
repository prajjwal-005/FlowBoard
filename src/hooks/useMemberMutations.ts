import { useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/fetch';
import type { ApiResponse, Member } from '@/types/api';
import { memberKeys } from '@/lib/queryKeys';

export function useAddMember(boardId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (identifier: string) =>
      api.post<ApiResponse<Member>>(`/api/boards/${boardId}/members`, { identifier }),
    onSuccess: (res) => {
      queryClient.setQueryData<Member[]>(memberKeys.list(boardId), (old) =>
        old ? [...old.filter((m) => m.userID !== res.data.userID), res.data] : old
      );
    },
  });
}

export function useRemoveMember(boardId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (identifier: string) =>
      api.delete<ApiResponse<{ userID: string }>>(`/api/boards/${boardId}/members`, {
        body: JSON.stringify({ identifier }),
      }),
    onSuccess: (res) => {
      queryClient.setQueryData<Member[]>(memberKeys.list(boardId), (old) =>
        old ? old.filter((m) => m.userID !== res.data.userID) : old
      );
    },
  });
}

export function useChangeRole(boardId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ identifier, role }: { identifier: string; role: string }) =>
      api.patch<ApiResponse<Member>>(`/api/boards/${boardId}/members`, { identifier, role }),
    onSuccess: (res) => {
      queryClient.setQueryData<Member[]>(memberKeys.list(boardId), (old) =>
        old ? old.map((m) => (m.userID === res.data.userID ? { ...m, role: res.data.role } : m)) : old
      );
    },
  });
}