import { getIO } from ".";
import { boardRoom } from "./constants"
import { addUserToBoard, getBoardPresence, removeUserFromBoard } from "./events/presence";
import { TypedSocket } from "./types"
export function joinBoard(socket:TypedSocket, boardId:string) {
    
    socket.join(boardRoom(boardId));
    addUserToBoard(boardId,{
        userID:socket.data.userID,
        username:socket.data.username,
    })
    if (!socket.data.joinedBoardIds) socket.data.joinedBoardIds = new Set();
        socket.data.joinedBoardIds.add(boardId);
    getIO().to(boardRoom(boardId)).emit('presence:update',{
        boardID:boardId,
        onlineUsers:getBoardPresence(boardId),
    })
    console.log(`${socket.data.username} joined ${boardRoom(boardId)}`)
}
export function leaveBoard(socket:TypedSocket, boardId:string) {
    
    socket.leave(boardRoom(boardId));
    removeUserFromBoard(boardId, socket.data.userID);

  getIO().to(boardRoom(boardId)).emit(
    "presence:update",{
        boardID:boardId,
        onlineUsers:getBoardPresence(boardId),
    }
  );
    console.log(`${socket.data.username} left ${boardRoom(boardId)}`)
}