'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import { useSocket } from '@/components/RealtimeProvider'
import { boardKeys } from '@/lib/queryKeys'
import type { Board, BoardBase } from '@/types/api'

export function useBoardEvents(boardId: string | undefined) {
  const { socket, isConnected } = useSocket()
  const queryClient = useQueryClient()
  const router = useRouter()

  useEffect(() => {
    if (!boardId || !isConnected) return

    function handleBoardUpdated(payload: { board: BoardBase }) {
      queryClient.setQueryData<Board>(boardKeys.detail(payload.board.id), (old) =>
        old ? { ...old, ...payload.board } : old
      )
    }

    function handleBoardDeleted(payload: { boardID: string }) {
      if (payload.boardID !== boardId) return
      toast.error('This board was deleted by the owner')
      queryClient.removeQueries({ queryKey: boardKeys.detail(payload.boardID) })
      queryClient.invalidateQueries({ queryKey: boardKeys.all })
      router.push('/dashboard')
    }

    socket.on('board:updated', handleBoardUpdated)
    socket.on('board:deleted', handleBoardDeleted)

    return () => {
      socket.off('board:updated', handleBoardUpdated)
      socket.off('board:deleted', handleBoardDeleted)
    }
  }, [socket, isConnected, boardId, queryClient, router])
}