import type { Role } from '@/types/api';

const roleRank: Record<Role, number> = { VIEWER: 0, MEMBER: 1, ADMIN: 2, OWNER: 3 };

export function canDeleteTask(role: Role) {
  return roleRank[role] >= roleRank.ADMIN;
}

export function canDeleteComment(role: Role, comment: { userID: string }, currentUserID: string) {
  return comment.userID === currentUserID || roleRank[role] >= roleRank.ADMIN;
}

export function canChangeRole(role: Role) {
  return role === 'OWNER';
}

export function canRemoveMember(role: Role) {
  return roleRank[role] >= roleRank.ADMIN;
}

export function canAddMember(role: Role) {
  return roleRank[role] >= roleRank.ADMIN;
}

export function canDeleteBoard(role: Role) {
  return role === 'OWNER';
}

export function canUpdateBoard(role: Role) {
  return roleRank[role] >= roleRank.ADMIN;
}

export function canCreateColumn(role: Role) {
  return roleRank[role] >= roleRank.ADMIN;
}

export function canUpdateColumn(role: Role) {
  return roleRank[role] >= roleRank.ADMIN;
}

export function canDeleteColumn(role: Role) {
  return roleRank[role] >= roleRank.ADMIN;
}

export function canCreateTask(role: Role) {
  return roleRank[role] >= roleRank.MEMBER;
}
export function canDragTask(role: Role, task: { createdById: string }, currentUserID: string) {
  if (role === 'VIEWER') return false;
  if (role === 'MEMBER') return task.createdById === currentUserID;
  return true; 
}
export function canEditTaskFields(role: Role, task: { createdById: string }, currentUserID: string) {
  if (role === 'VIEWER') return false;
  if (role === 'MEMBER') return task.createdById === currentUserID; // D6
  return true; // OWNER/ADMIN
}

export function canCreateSubtaskOnTask(role: Role) {
  return role !== 'VIEWER'; // D7 — MEMBER can add to any task, no ownership check on create
}

export function canCreateComment(role: Role) {
  return role !== 'VIEWER';
}

export function canAssignMembers(role: Role) {
  return roleRank[role] >= roleRank.ADMIN;
}
