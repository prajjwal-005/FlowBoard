import { useQuery } from '@tanstack/react-query';
import { api } from '@/lib/fetch';
import type { ApiResponse, User } from '@/types/api';

export function useCurrentUser() {
  return useQuery({
    queryKey: ['currentUser'],
    queryFn: async () => {
      const res = await api.get<ApiResponse<User>>('/api/profile');
      return res.data;
    },
    staleTime: Infinity,
  });
}