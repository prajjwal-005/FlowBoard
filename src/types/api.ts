import { NotificationType } from ".";

export type Priority = 'LOW' | 'MEDIUM' | 'HIGH'
export type Role = 'OWNER' | 'ADMIN' | 'MEMBER' | 'VIEWER'
export type EntityType = 'BOARD' | 'COLUMN' | 'TASK'

export interface UpdateProfileInput {
  username?: string;
  avatarUrl?: string | null;
}

export interface ActivityLogEntry {
  id: string;
  boardID: string;
  userID: string;
  actorUsername: string;
  action: string;
  entityType: EntityType;
  entityID: string;
  entityTitle: string;
  createdAt: string;
}

export interface Subtask {
  id: string;
  title: string;
  isCompleted: boolean;
  taskID: string;
  createdByID: string;
  createdAt: string;
  updatedAt: string;        // fixed: was missing
}

export interface CommentBase {
  id: string;
  content: string;
  taskID: string;
  userID: string;
  createdAt: string;
  updatedAt: string;
}
export interface Comment extends CommentBase {
  user: { username: string; avatarUrl: string | null };
}

export interface AssigneeBase {
  userID: string;
  taskID: string;
  createdAt: string;
}
export interface Assignee extends AssigneeBase {
  user: { username: string; avatarUrl: string | null };
}

export interface TaskBase {
  id: string;
  title: string;
  description: string | null;
  boardID: string;
  columnID: string;
  order: number;
  dueDate: string | null;
  priority: Priority | null;
  createdById: string;
  createdAt: string;
  updatedAt: string;
}
export interface Task extends TaskBase {
  createdBy: { username: string };
  subtasks: Subtask[];
  comments: Comment[];
  assignees: Assignee[];
}

export interface MemberBase {
  userID: string;
  role: Role;
}
export interface Member extends MemberBase {
  user: { username: string; avatarUrl: string | null };
}

export interface ColumnBase {
  id: string;
  title: string;
  boardID: string;
  order: number;
  createdAt: string;
  updatedAt: string;
}
export interface Column extends ColumnBase {
  tasks: TaskBase[];
}


export interface BoardBase {
  id: string;
  name: string;
  description: string | null;
  createdAt: string;
  updatedAt: string;
  summary: string | null;
  summaryGeneratedAt: string | null;
}
export interface Board extends BoardBase {
  role: Role;
  columns: Column[];   // reverted — board GET does include nested tasks
}
export interface User {
  id: string;
  username: string;
  nickname: string | null;
  email: string;
  avatarUrl: string | null;
}

export interface ApiResponse<T> {
  statusCode: number;
  message: string;
  data: T;
  success: boolean;
}

export interface NotificationEntry {
  id: string;
  userID: string;
  type: NotificationType
  message: string;
  boardID: string;
  entityType: EntityType;
  entityID: string;
  isRead: boolean;
  createdAt: string;
}