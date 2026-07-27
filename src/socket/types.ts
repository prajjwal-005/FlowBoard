import type { Server, Socket } from 'socket.io'
import type { ServerToClientEvents, ClientToServerEvents } from '@/types/socket'
export interface SocketData {
  userID: string
  username: string
  email: string
  joinedBoardIds?: Set<string>
}
export type InterServerEvents = Record<string, never>

export type TypedServer = Server<ClientToServerEvents, ServerToClientEvents, InterServerEvents, SocketData>
export type TypedSocket = Socket<ClientToServerEvents, ServerToClientEvents, InterServerEvents, SocketData>