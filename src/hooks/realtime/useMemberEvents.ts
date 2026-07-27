'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import { useSocket } from '@/components/RealtimeProvider'
import { useCurrentUser } from '@/hooks/useCurrentUser'
import type { Member, Role } from '@/types/api'

export function useMemberEvents(boardId: string | undefined) {
  const { socket, isConnected } = useSocket()
  const queryClient = useQueryClient()
  const router = useRouter()
  const { data: currentUser } = useCurrentUser()

  useEffect(() => {
    if (!boardId || !isConnected) return

    const membersKey = ['boards', boardId, 'members']

    function handleAdded(payload: { boardID: string; member: Member }) {
      queryClient.setQueryData<Member[]>(membersKey, (old) =>
        old ? [...old.filter((m) => m.userID !== payload.member.userID), payload.member] : old
      )
    }

    function handleRemoved(payload: { boardID: string; userID: string }) {
      if (payload.userID === currentUser?.id) {
        toast.error('You were removed from this board')
        queryClient.removeQueries({ queryKey: ['boards', payload.boardID] })
        router.push('/dashboard')
        return
      }
      queryClient.setQueryData<Member[]>(membersKey, (old) =>
        old ? old.filter((m) => m.userID !== payload.userID) : old
      )
    }

    function handleRoleChanged(payload: { boardID: string; userID: string; role: Role }) {
      if (payload.userID === currentUser?.id) {
        toast.info(`Your role was changed to ${payload.role}`)
      }
      queryClient.setQueryData<Member[]>(membersKey, (old) =>
        old ? old.map((m) => (m.userID === payload.userID ? { ...m, role: payload.role } : m)) : old
      )
    }

    socket.on('member:added', handleAdded)
    socket.on('member:removed', handleRemoved)
    socket.on('member:roleChanged', handleRoleChanged)

    return () => {
      socket.off('member:added', handleAdded)
      socket.off('member:removed', handleRemoved)
      socket.off('member:roleChanged', handleRoleChanged)
    }
  }, [socket, isConnected, boardId, queryClient, router, currentUser?.id])
}