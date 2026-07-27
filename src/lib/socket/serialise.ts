// lib/socket/serialize.ts
import { EntityType } from '@/generated/prisma/enums';
import {  NotificationType} from '@/types/index';
import type { TaskBase, ColumnBase, BoardBase, Subtask, CommentBase, AssigneeBase, Priority, Assignee, Member,Comment, NotificationEntry, Role } from '@/types/api'

export function toTaskBase(t: {
  id: string; title: string; description: string | null;
  boardID: string; columnID: string; order: number;
  dueDate: Date | string | null; priority: Priority | null;
  createdById: string; createdAt: Date | string; updatedAt: Date | string;
}): TaskBase {
  return {
    ...t,
    dueDate: t.dueDate ? new Date(t.dueDate).toISOString() : null,
    createdAt: new Date(t.createdAt).toISOString(),
    updatedAt: new Date(t.updatedAt).toISOString(),
  }
}

export function toColumnBase(c: {
  id: string; title: string; boardID: string; order: number;
  createdAt: Date | string; updatedAt: Date | string;
}): ColumnBase {
  return { ...c, createdAt: new Date(c.createdAt).toISOString(), updatedAt: new Date(c.updatedAt).toISOString() }
}

export function toBoardBase(b: {
  id: string; name: string; description: string | null;
  createdAt: Date | string; updatedAt: Date | string;
  summary: string | null; summaryGeneratedAt: Date | string | null;
}): BoardBase {
  return {
    ...b,
    createdAt: new Date(b.createdAt).toISOString(),
    updatedAt: new Date(b.updatedAt).toISOString(),
    summaryGeneratedAt: b.summaryGeneratedAt ? new Date(b.summaryGeneratedAt).toISOString() : null,
  }
}


export function toSubtask(s: {
  id: string; title: string; isCompleted: boolean;
  taskID: string; createdByID: string;
  createdAt: Date | string; updatedAt: Date | string;
}): Subtask {
  return { ...s, createdAt: new Date(s.createdAt).toISOString(), updatedAt: new Date(s.updatedAt).toISOString() }
}

export function toCommentBase(c: {
  id: string; content: string; taskID: string; userID: string;
  createdAt: Date | string; updatedAt: Date | string;
}): CommentBase {
  return { ...c, createdAt: new Date(c.createdAt).toISOString(), updatedAt: new Date(c.updatedAt).toISOString() }
}

export function toAssigneeBase(a: {
  userID: string; taskID: string; createdAt: Date | string;
}): AssigneeBase {
  return { ...a, createdAt: new Date(a.createdAt).toISOString() }
}
export function toComment(c: {
  id: string; content: string; taskID: string; userID: string;
  createdAt: Date | string; updatedAt: Date | string;
  user: { username: string; avatarUrl: string | null };
}): Comment {
  return {
    id: c.id,
    content: c.content,
    taskID: c.taskID,
    userID: c.userID,
    createdAt: new Date(c.createdAt).toISOString(),
    updatedAt: new Date(c.updatedAt).toISOString(),
    user: c.user,
  }
}

export function toAssignee(a: {
  userID: string; taskID: string; createdAt: Date | string;
  user: { username: string; avatarUrl: string | null };
}): Assignee {
  return {
    userID: a.userID,
    taskID: a.taskID,
    createdAt: new Date(a.createdAt).toISOString(),
    user: a.user,
  }
}

export function toMember(m: { userID: string; role: Role; user: { username: string; avatarUrl: string | null } }): Member {
  return m
}
export function toNotificationEntry(n: {
  id: string; userID: string; type: string; message: string;
  boardID: string; entityType: EntityType; entityID: string;
  isRead: boolean; createdAt: Date | string;
}): NotificationEntry {
  return {
    id: n.id,
    userID: n.userID,
    type: n.type as NotificationType,
    message: n.message,
    boardID: n.boardID,
    entityType: n.entityType,
    entityID: n.entityID,
    isRead: n.isRead,
    createdAt: new Date(n.createdAt).toISOString(),
  }
}