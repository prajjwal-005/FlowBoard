import { TypedServer , InterServerEvents, SocketData,} from "./types";
import type { ServerToClientEvents, ClientToServerEvents } from '@/types/socket'
import { Server } from "socket.io";
import { Server as HTTPServer} from "http";
import { socketAuthMiddleware } from "./auth";
import { handleConnection } from "./events/connection";
// let io:TypedServer|undefined
// export function initSocket(httpServer: HTTPServer):TypedServer{
    
//     if(io)
//     {
//         return io;
//     }  
//     io = new Server<ClientToServerEvents,ServerToClientEvents,InterServerEvents,SocketData>(httpServer, {
//     cors: {
//       origin: 'http://localhost:3000',
//       credentials: true,
//     },
//   })
  
//   io.use(socketAuthMiddleware)  
//   io.on('connection',handleConnection) 
  
//   return io;
// }
// export function getIO(){
//     if(!io){
//        throw new Error('Socket.IO not initialized — call initSocket() first')
//     }
//     return io;
// }

const globalForIO = globalThis as unknown as { io?: TypedServer }

export function initSocket(httpServer: HTTPServer): TypedServer {
  if (globalForIO.io) return globalForIO.io
  const io = new Server<ClientToServerEvents, ServerToClientEvents, InterServerEvents, SocketData>(httpServer, {
    cors: { origin: 'http://localhost:3000', credentials: true },
  })
  io.use(socketAuthMiddleware)
  io.on('connection', handleConnection)
  globalForIO.io = io
  return io
}

export function getIO(): TypedServer {
  if (!globalForIO.io) throw new Error('Socket.IO not initialized — call initSocket() first')
  return globalForIO.io
}