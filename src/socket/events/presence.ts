export interface PresenceUser {
  userID: string;
  username: string;
}

const boardPresence = new Map<string, Map<string, PresenceUser>>();
export function addUserToBoard(boardId:string,user:PresenceUser){
    let users = boardPresence.get(boardId);
    if(!users){
        users = new Map();
        boardPresence.set(boardId,users)
    }
    users.set(user.userID,user);
}
export function removeUserFromBoard(boardID:string, userID:string){
    const users = boardPresence.get(boardID);
    if(!users) return;
    users?.delete(userID);
     if (users.size === 0) {
    boardPresence.delete(boardID);
  }
}

export function getBoardPresence(boardID:string): PresenceUser[] {
    const users = boardPresence.get(boardID);
    
    if(!users) return [];
    return [...users.values()];
}

export function isUserOnBoard(boardID:string, userID:string){
    return boardPresence.get(boardID)?.has(userID)??false;
}
export function clearPresence(){
    boardPresence.clear();
}