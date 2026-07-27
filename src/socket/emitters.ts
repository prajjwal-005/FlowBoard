import { getIO } from './index'
import { boardRoom,userRoom } from './constants'
import type { Comment, Subtask, TaskBase, Member, Assignee, BoardBase, ColumnBase, NotificationEntry } from '@/types/api'
//TASK

export function emitTaskUpdated(boardId: string, task: TaskBase) {
  getIO().to(boardRoom(boardId)).emit('task:updated', {boardID:boardId,task})
}
export function emitTaskMoved(boardId: string,fromColumnId:string,toColumnId:string, task: TaskBase) {
  getIO().to(boardRoom(boardId)).emit('task:moved', {boardID:boardId,fromColumnID:fromColumnId,toColumnID:toColumnId,task})
}
export function emitTaskCreated(boardId:string,columnId:string,task:TaskBase){
    getIO().to(boardRoom(boardId)).emit('task:created',{ boardID: boardId, columnID: columnId, task })
}
export function emitTaskDeleted(boardId:string,columnId:string,taskId:string){
    getIO().to(boardRoom(boardId)).emit('task:deleted',{ boardID: boardId, columnID: columnId, taskID:taskId })
}
export function emitTaskReordered(boardId:string,columnId:string,tasks: { id: string; order: number }[]){
    getIO().to(boardRoom(boardId)).emit('task:reordered',{ boardID: boardId, columnID: columnId, tasks})
}

//SUBTASK

export function emitSubtaskCreated(boardId: string, taskId: string, subtask: Subtask){
    getIO().to(boardRoom(boardId)).emit('subtask:created',{ boardID: boardId, taskID:taskId,subtask})
}
export function emitSubtaskUpdated(boardId: string, taskId: string, subtask: Subtask){
    getIO().to(boardRoom(boardId)).emit('subtask:updated',{ boardID: boardId, taskID:taskId,subtask})
}
export function emitSubtaskDeleted(boardId: string, taskId: string, subtaskId: string){
    getIO().to(boardRoom(boardId)).emit('subtask:deleted',{ boardID: boardId, taskID:taskId,subtaskID:subtaskId})
}

//COMMENT

export function emitCommentCreated(boardId: string, taskId: string, comment: Comment){
    getIO().to(boardRoom(boardId)).emit('comment:created',{ boardID: boardId, taskID:taskId,comment})
}
export function emitCommentUpdated(boardId: string, taskId: string, comment:Comment){
    getIO().to(boardRoom(boardId)).emit('comment:updated',{ boardID: boardId, taskID:taskId,comment})
}
export function emitCommentDeleted(boardId: string, taskId: string, commentId: string){
    getIO().to(boardRoom(boardId)).emit('comment:deleted',{ boardID: boardId, taskID:taskId,commentID:commentId})
}

//Column

export function emitColumnRenamed(  boardId: string, columnId: string, title: string) {
  getIO().to(boardRoom(boardId)).emit('column:renamed', {boardID:boardId,columnID:columnId,title})
}
export function emitColumnCreated(boardId:string,column:ColumnBase){
    getIO().to(boardRoom(boardId)).emit('column:created',{ boardID: boardId,column })
}
export function emitColumnDeleted(boardId:string,columnId:string){
    getIO().to(boardRoom(boardId)).emit('column:deleted',{ boardID: boardId, columnID: columnId})
}
export function emitColumnReordered(boardId:string,columns: { id: string; order: number }[]){
    getIO().to(boardRoom(boardId)).emit('column:reordered',{ boardID: boardId, columns})
}

// BOARD

export function emitBoardUpdated(
  boardId: string,
  board:BoardBase) {
  getIO().to(boardRoom(boardId)).emit('board:updated', { board })
}
export function emitBoardDeleted(boardId: string) {
  getIO().to(boardRoom(boardId)).emit('board:deleted', { boardID: boardId })
}

// ASSIGNEE

export function emitAssigneeAdded(boardId: string, taskId: string, assignee: Assignee) {
  getIO().to(boardRoom(boardId)).emit('assignee:added', { boardID: boardId, taskID: taskId, assignee })
}
export function emitAssigneeRemoved(boardId: string, taskId: string, userId: string) {
  getIO().to(boardRoom(boardId)).emit('assignee:removed', { boardID: boardId, taskID: taskId, userID: userId })
}

// MEMBER

export function emitMemberAdded(boardId: string, member: Member) {
  getIO().to(boardRoom(boardId)).emit('member:added', { boardID: boardId, member })
}
export function emitMemberRemoved(boardId: string, userId: string) {
  getIO().to(boardRoom(boardId)).emit('member:removed', { boardID: boardId, userID: userId })
}
export function emitMemberRoleChanged(boardId: string, userId: string, role: Member['role']) {
  getIO().to(boardRoom(boardId)).emit('member:roleChanged', { boardID: boardId, userID: userId, role })
}




export function emitNotificationCreated(userId: string, notification: NotificationEntry) {
  getIO().to(userRoom(userId)).emit('notification:new', { notification })
}