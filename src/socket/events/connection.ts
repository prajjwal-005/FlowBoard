import { getIO } from "..";
import { boardRoom, userRoom } from "../constants";
import { joinBoard, leaveBoard } from "../rooms";
import { TypedSocket } from "../types";
import { getBoardPresence, removeUserFromBoard } from "./presence";

export function handleConnection(socket: TypedSocket){

    console.log(socket.data.username);
    socket.join(userRoom(socket.data.userID));

    socket.on('joinBoard', (boardId, callback) => {
    joinBoard(socket, boardId)
    if (typeof callback === 'function') {
        callback(getBoardPresence(boardId))
    }
    });  
    socket.on('leaveBoard', (boardId) => leaveBoard(socket, boardId));

    socket.on('disconnect', () => { 
        console.log('user disconnected')
        const boards = socket.data.joinedBoardIds;
        if(boards){
            for(const boardId of boards){
                removeUserFromBoard(boardId,socket.data.userID);
                getIO().to(boardRoom(boardId)).emit('presence:update', {
                    boardID:boardId,
                    onlineUsers:getBoardPresence(boardId),
                });
            }
        }
    });
}
