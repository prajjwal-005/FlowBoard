import { useInfiniteQuery } from "@tanstack/react-query";
import { ApiResponse } from "@/types/api";
import { api } from "@/lib/fetch";
import { ActivityLogEntry } from "@/types/api";
export function useActivity(boardId:string){
    return useInfiniteQuery({
        queryKey: ['boards', boardId, 'activity'],        
        queryFn: async ({ pageParam }) => {
        const url = pageParam
            ? `/api/boards/${boardId}/activity?cursor=${pageParam}`
            : `/api/boards/${boardId}/activity`;
        const res = await api.get<ApiResponse<{ activities: ActivityLogEntry[]; nextCursor: string | null }>>(url);
        return res.data;
        },
        initialPageParam: null as string | null,        
        getNextPageParam:(lastPage) =>lastPage.nextCursor?? undefined,
        enabled: !!boardId
    })
}