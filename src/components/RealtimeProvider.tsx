'use client'

import { createContext, useContext, useEffect, useState, type ReactNode } from 'react'
import { io, type Socket } from 'socket.io-client'
import type { ServerToClientEvents, ClientToServerEvents } from '@/types/socket'

export type TypedClientSocket = Socket<ServerToClientEvents, ClientToServerEvents>

interface RealtimeContextValue {
  socket: TypedClientSocket
  isConnected: boolean
}

const RealtimeContext = createContext<RealtimeContextValue | null>(null)

export function RealtimeProvider({ children }: { children: ReactNode }) {
  const [socket] = useState<TypedClientSocket>(() =>
    io({ withCredentials: true, autoConnect: false })
  )
  const [isConnected, setIsConnected] = useState(false)

  useEffect(() => {
    function handleConnect() { setIsConnected(true) }
    function handleDisconnect() { setIsConnected(false) }
    function handleError(err: Error) {
      console.error('Socket connection error:', err.message)
      setIsConnected(false)
    }

    socket.on('connect', handleConnect)
    socket.on('disconnect', handleDisconnect)
    socket.on('connect_error', handleError)

    socket.connect()

    return () => {
      socket.off('connect', handleConnect)
      socket.off('disconnect', handleDisconnect)
      socket.off('connect_error', handleError)
      socket.disconnect()
    }
  }, [socket])

  return (
    <RealtimeContext.Provider value={{ socket, isConnected }}>
      {children}
    </RealtimeContext.Provider>
  )
}


export function useSocket() {
  const ctx = useContext(RealtimeContext)
  if (!ctx) throw new Error('useSocket must be used within a RealtimeProvider')
  return ctx
}