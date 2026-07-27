'use client'
import { useEffect, useState } from 'react'
import { useSocket } from '@/components/RealtimeProvider'

interface OnlineUser {
  userID: string
  username: string
}

export function usePresence(boardId: string | undefined) {
  const { socket, isConnected } = useSocket()
  const [onlineUsers, setOnlineUsers] = useState<OnlineUser[]>([])

  useEffect(() => {
  if (!boardId || !isConnected) return

  function handlePresenceUpdate(payload: { boardID: string; onlineUsers: OnlineUser[] }) {
    if (payload.boardID !== boardId) return
    setOnlineUsers(payload.onlineUsers)
  }

  socket.on('presence:update', handlePresenceUpdate)
  socket.emit('joinBoard', boardId, (users: OnlineUser[]) => setOnlineUsers(users))

  return () => {
    socket.off('presence:update', handlePresenceUpdate)
    setOnlineUsers([])
  }
}, [socket, isConnected, boardId])
  return onlineUsers
}