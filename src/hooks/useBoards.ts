import { useQuery } from '@tanstack/react-query';
import { api } from '@/lib/fetch';
import type { ApiResponse } from '@/types/api';
import { Board } from '@/types/api';
import { boardKeys } from '@/lib/queryKeys';

export function useBoards() {
  return useQuery({
    queryKey: boardKeys.all,
    queryFn: async () => {
      const res = await api.get<ApiResponse<Board[]>>('/api/boards');
      return res.data;
    },
  });
}

