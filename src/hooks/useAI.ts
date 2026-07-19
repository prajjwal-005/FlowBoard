'use client';

import { useQuery, useQueryClient,useMutation } from '@tanstack/react-query';
import { api } from '@/lib/fetch';
import type { ApiResponse,Board } from '@/types/api';
import { boardKeys,suggestionsKey,descriptionExpansionKey } from '@/lib/queryKeys';


export function useSubtaskSuggestions(boardId: string, columnId: string, taskId: string) {
  return useQuery({
    queryKey: suggestionsKey(boardId, taskId),
    queryFn: async () => {
      const res = await api.post<ApiResponse<{ suggestions: string[] }>>(
        `/api/boards/${boardId}/columns/${columnId}/tasks/${taskId}/subtasks/generate`
      );
      return res.data.suggestions;
    },
    enabled: false,
    staleTime: Infinity,
    retry: false,
  });
}


export function useDescriptionExpansion(boardId: string, columnId: string, taskId: string) {
  return useQuery({
    queryKey: descriptionExpansionKey(boardId, taskId),
    queryFn: async () => {
      const res = await api.post<ApiResponse<{ description: string }>>(
        `/api/boards/${boardId}/columns/${columnId}/tasks/${taskId}/description/expand`
      );
      return res.data.description;
    },
    enabled: false,
    staleTime: Infinity,
    retry: false,
  });
}
export function useGenerateBoardSummary(boardId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async () => {
      const res = await api.post<ApiResponse<{ summary: string; summaryGeneratedAt: string }>>(
        `/api/boards/${boardId}/summary/generate`
      );
      return res.data;
    },
    onSuccess: (data) => {
      queryClient.setQueryData<Board>(boardKeys.detail(boardId), (old) =>
        old ? { ...old, summary: data.summary, summaryGeneratedAt: data.summaryGeneratedAt } : old
      );
    },
  });
}