import { useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/fetch';
import type { ApiResponse, User, UpdateProfileInput } from '@/types/api';

export function useUpdateProfile() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: UpdateProfileInput) =>
      api.patch<ApiResponse<User>>('/api/profile', data),
    onSuccess: (res) => {
      queryClient.setQueryData(['currentUser'], res.data);
    },
  });
}