import { useQuery } from '@tanstack/react-query';
import { api } from '@/lib/fetch';
import type { ApiResponse } from '@/types/api';
import { Task } from '@/types/api';

export function useTask(boardId:string,columnId:string,taskId:string) {
  return useQuery({
    queryKey: ['boards', boardId, 'tasks', taskId],
    queryFn: async () => {
      const res = await api.get<ApiResponse<Task>>(`/api/boards/${boardId}/columns/${columnId}/tasks/${taskId}`);
      return res.data;
    },
    enabled: !!boardId && !!columnId && !!taskId,
  });
}