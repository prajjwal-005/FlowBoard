import type { BoardBase, ColumnBase, TaskBase, Subtask, Comment, Assignee, Member, Role, NotificationEntry } from '@/types/api'

export interface ServerToClientEvents {
  'board:updated': (payload: { board: BoardBase }) => void
  'board:deleted': (payload: { boardID: string }) => void

  'column:created':   (payload: { boardID: string; column: ColumnBase }) => void
  'column:renamed':   (payload: { boardID: string; columnID: string; title: string }) => void
  'column:deleted':   (payload: { boardID: string; columnID: string }) => void
  'column:reordered': (payload: { boardID: string; columns: { id: string; order: number }[] }) => void

  'task:created':   (payload: { boardID: string; columnID: string; task: TaskBase }) => void
  'task:updated':   (payload: { boardID: string; task: TaskBase }) => void
  'task:moved':     (payload: { boardID: string; fromColumnID: string; toColumnID: string; task: TaskBase }) => void
  'task:deleted':   (payload: { boardID: string; columnID: string; taskID: string }) => void
  'task:reordered': (payload: { boardID: string; columnID: string; tasks: { id: string; order: number }[] }) => void

  'subtask:created': (payload: { boardID: string; taskID: string; subtask: Subtask }) => void
  'subtask:updated': (payload: { boardID: string; taskID: string; subtask: Subtask }) => void
  'subtask:deleted': (payload: { boardID: string; taskID: string; subtaskID: string }) => void

  'comment:created': (payload: { boardID: string; taskID: string; comment: Comment }) => void
  'comment:updated': (payload: { boardID: string; taskID: string; comment: Comment }) => void
  'comment:deleted': (payload: { boardID: string; taskID: string; commentID: string }) => void

  'assignee:added': (payload: { boardID: string; taskID: string; assignee: Assignee }) => void
  'assignee:removed': (payload: { boardID: string; taskID: string; userID: string }) => void

  'member:added': (payload: { boardID: string; member: Member }) => void
  'member:removed': (payload: { boardID: string; userID: string }) => void
  'member:roleChanged': (payload: { boardID: string; userID: string; role: Role }) => void

  'presence:update': (payload: { boardID: string; onlineUsers: { userID: string; username: string; }[] }) => void

  'notification:new': (payload: { notification: NotificationEntry }) => void
}

export interface ClientToServerEvents {
  joinBoard: (boardId: string, callback?: (users: { userID: string; username: string }[]) => void) => void
  leaveBoard: (boardId: string) => void
}
