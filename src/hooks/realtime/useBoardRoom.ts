'use client'

import { useEffect } from 'react'
import { useSocket } from '@/components/RealtimeProvider'

export function useBoardRoom(boardId: string | undefined) {
  const { socket, isConnected } = useSocket()

  useEffect(() => {
    if (!boardId || !isConnected) return

    socket.emit('joinBoard', boardId)

    return () => {
      socket.emit('leaveBoard', boardId)
    }
  }, [socket, isConnected, boardId])
}