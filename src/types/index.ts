import type { User, Board, Column, Task, Role } from "../generated/prisma/client";

// Re-export Prisma types you'll use frequently
export type { User, Board, Column, Task, Role };


export interface ApiErrorResponse {
  success: false;
  message: string;
  errors?: string[];
}


// RBAC
export type Action =
  | "CREATE_COLUMN"
  | "DELETE_COLUMN"
  | "CREATE_TASK"
  | "DELETE_TASK"
  | "UPDATE_COLUMN" 
  | "ASSIGN_MEMBER"
  | "REMOVE_MEMBER"
  | "DELETE_BOARD"
  | "CHANGE_ROLE"
  | "UPDATE_BOARD"
  | "ADD_MEMBER"
  | "UPDATE_TASK"
  | "VIEW_BOARD"
  | "CREATE_COMMENT"
  | "DELETE_COMMENT"
  | "UPDATE_COMMENT"
  | "CREATE_SUBTASK"
  | "UPDATE_SUBTASK"
  | "DELETE_SUBTASK";


export type ActivityAction =
  | "BOARD_CREATED"
  | "BOARD_UPDATED"
  | "BOARD_DELETED"
  | "COLUMN_CREATED"
  | "COLUMN_RENAMED"
  | "COLUMN_DELETED"
  | "COLUMN_REORDERED"
  | "TASK_CREATED"
  | "TASK_UPDATED"
  | "TASK_DELETED"
  | "TASK_MOVED"
  | "TASK_REORDERED"
  | "SUBTASK_CREATED"
  | "SUBTASK_UPDATED"
  | "SUBTASK_DELETED"
  | "COMMENT_CREATED"
  | "COMMENT_DELETED"
  | "ASSIGNEE_ADDED"
  | "ASSIGNEE_REMOVED"
  | "MEMBER_ADDED"
  | "MEMBER_REMOVED"
  | "MEMBER_ROLE_CHANGED";

  export type NotificationType =
  | 'TASK_ASSIGNED'
  | 'MEMBER_ADDED'
  | 'MEMBER_REMOVED'
  | 'ROLE_CHANGED'
  | 'TASK_PRIORITY_CHANGED'
  | 'TASK_DUE_DATE_CHANGED'
  | 'TASK_COMMENTED'