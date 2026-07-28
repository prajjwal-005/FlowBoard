import { useQuery } from '@tanstack/react-query';
import { api } from '@/lib/fetch';
import { ApiResponse,Member } from '@/types/api';
import { memberKeys } from '@/lib/queryKeys';
export function useMembers(boardId:string) {
  return useQuery({
   queryKey: memberKeys.list(boardId),  
    queryFn: async () => {
      const res = await api.get<ApiResponse<Member[]>>(`/api/boards/${boardId}/members`);
      return res.data;
    },  
  });
}