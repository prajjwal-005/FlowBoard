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
}

export interface Comment {
  id: string;
  content: string;
  taskID: string;
  userID: string;
  createdAt: string;
  updatedAt: string;
  user: {
    username: string;
    avatarUrl: string | null;
  };
}
export interface Assignee {
  userID: string;
  taskID: string;
  createdAt: string;
  user: {
    username: string;
    avatarUrl: string | null;
  };
}
export interface Task {
  id: string;
  title: string;
  description: string | null;
  boardID: string;
  columnID: string;
  order: number;
  dueDate: Date | null;
  priority: Priority | null;
  createdById: string;
  createdBy: { username: string };
  createdAt: string;
  updatedAt: string;
  subtasks: Subtask[];
  comments: Comment[];
  assignees: Assignee[];
}
export interface Member {
  userID: string;
  role: Role;
  user: {
    username: string;
    avatarUrl: string | null;
  };
}
export interface Column {
  id: string;
  title: string;
  boardID: string;
  order: number;
  createdAt: string;
  updatedAt: string;
  tasks: Task[];
}

export interface Board {
  id: string;
  name: string;
  description: string | null;
  createdAt: string;
  updatedAt: string;
  role:Role;
  summary: string | null;
  summaryGeneratedAt: string | null;
  columns: Column[];
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