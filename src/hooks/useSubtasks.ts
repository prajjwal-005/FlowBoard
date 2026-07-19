import { useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/fetch';
import type { ApiResponse, Subtask } from '@/types/api';
import type { CreateSubtaskInput, UpdateSubtaskInput } from '@/schemas/taskSchema';
import { taskDetailKey } from '@/lib/queryKeys';

export function useCreateSubtask(boardId:string,columnId:string,taskId:string) {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: async (data:CreateSubtaskInput) => {
            const res = await api.post<ApiResponse<Subtask>>(
                `/api/boards/${boardId}/columns/${columnId}/tasks/${taskId}/subtasks`,
                data
            );
            return res.data
        },
        onSuccess: () => queryClient.invalidateQueries({ queryKey: taskDetailKey(boardId,taskId)})
    })
}
export function useUpdateSubtask(boardId:string,columnId:string,taskId:string) {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: async ({subtaskId,...data}:UpdateSubtaskInput&{subtaskId:string}) => {
            const res = await api.patch<ApiResponse<Subtask>>(
                `/api/boards/${boardId}/columns/${columnId}/tasks/${taskId}/subtasks/${subtaskId}`,
                data
            );
            return res.data
        },
        onSuccess: () => queryClient.invalidateQueries({ queryKey: taskDetailKey(boardId,taskId)})
    })
}
export function useDeleteSubtask(boardId:string,columnId:string,taskId:string) {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: (subtaskId:string) => 
            api.delete<void>(
                `/api/boards/${boardId}/columns/${columnId}/tasks/${taskId}/subtasks/${subtaskId}`
            ),
        onSuccess: () => queryClient.invalidateQueries({ queryKey: taskDetailKey(boardId,taskId)})
    })
}