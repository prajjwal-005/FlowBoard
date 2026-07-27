'use client'
import { useEffect } from 'react'
import { useQueryClient, useInfiniteQuery ,useMutation} from '@tanstack/react-query'
import { useSocket } from '@/components/RealtimeProvider'
import { api } from '@/lib/fetch'
import { toast } from 'sonner'
import type { ApiResponse, NotificationEntry } from '@/types/api'

export const notificationKeys = { all: ['notifications'] as const }

interface NotificationPage {
  notifications: NotificationEntry[]
  nextCursor: string | null
}

export function useNotifications() {
  const { socket, isConnected } = useSocket()
  const queryClient = useQueryClient()

  const query = useInfiniteQuery({
    queryKey: notificationKeys.all,
    queryFn: async ({ pageParam }) => {
      const res = await api.get<ApiResponse<NotificationPage>>(
        `/api/notifications${pageParam ? `?cursor=${pageParam}` : ''}`
      )
      return res.data
    },
    initialPageParam: null as string | null,
    getNextPageParam: (lastPage) => lastPage.nextCursor,
  })

  useEffect(() => {
    if (!isConnected) return

    function handleNewNotification(payload: { notification: NotificationEntry }) {
      queryClient.setQueryData<{ pages: NotificationPage[]; pageParams: unknown[] }>(
        notificationKeys.all,
        (old) => {
          if (!old) return old
          const [first, ...rest] = old.pages
          return { ...old, pages: [{ ...first, notifications: [payload.notification, ...first.notifications] }, ...rest] }
        }
      )
      toast(payload.notification.message)
    }

    socket.on('notification:new', handleNewNotification)
    return () => { socket.off('notification:new', handleNewNotification) }
  }, [socket, isConnected, queryClient])

  return query
}

interface NotificationPage { notifications: NotificationEntry[]; nextCursor: string | null }

export function useMarkNotificationRead() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (notificationId: string) =>
      api.patch<void>(`/api/notifications/${notificationId}`, { isRead: true }),
    onSuccess: (_data, notificationId) => {
      queryClient.setQueryData<{ pages: NotificationPage[]; pageParams: unknown[] }>(
        notificationKeys.all,
        (old) => old ? {
          ...old,
          pages: old.pages.map((p) => ({
            ...p,
            notifications: p.notifications.map((n) => n.id === notificationId ? { ...n, isRead: true } : n),
          })),
        } : old
      )
    },
  })
}