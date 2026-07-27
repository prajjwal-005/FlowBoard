import { api } from '@/lib/fetch';
import type { ApiResponse , Board} from '@/types/api';
import { useMutation, useQuery ,useQueryClient} from "@tanstack/react-query";
import { boardKeys } from "@/lib/queryKeys";
import { UpdateBoardInput } from '@/schemas/boardSchema';

export function useBoard(boardId:string) {
  return useQuery({
    queryKey: boardKeys.detail(boardId),
    queryFn: async () => {
      const res = await api.get<ApiResponse<Board>>(`/api/boards/${boardId}`);
      return res.data;
    },
    enabled: !!boardId,
  });
}
export function useUpdateBoard(boardId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: UpdateBoardInput) =>
      api.patch(`/api/boards/${boardId}`, data),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: boardKeys.detail(boardId) }),
  });
}
export function useDeleteBoard(boardId:string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: () => api.delete<ApiResponse<null>>(`/api/boards/${boardId}`),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: boardKeys.all })
  });
}
