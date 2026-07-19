import { Role } from "../generated/prisma/client";
import type { Action } from "@/types/index";

export const rolePermissions: Record<Role, Action[]> = {
  OWNER: [
    // Board
    "VIEW_BOARD",
    "UPDATE_BOARD",
    "DELETE_BOARD",

    // Members & Roles
    "ADD_MEMBER",
    "REMOVE_MEMBER",
    "ASSIGN_MEMBER",
    "CHANGE_ROLE",

    // Columns
    "CREATE_COLUMN",
    "UPDATE_COLUMN",
    "DELETE_COLUMN",

    // Tasks
    "CREATE_TASK",
    "UPDATE_TASK",
    "DELETE_TASK",

    // Subtasks
    "CREATE_SUBTASK",
    "UPDATE_SUBTASK",
    "DELETE_SUBTASK",

    // Comments
    "CREATE_COMMENT",
    "UPDATE_COMMENT",
    "DELETE_COMMENT",
  ],

  ADMIN: [
    // Board
    "VIEW_BOARD",
    "UPDATE_BOARD",

    // Members
    "ADD_MEMBER",
    "REMOVE_MEMBER",
    "ASSIGN_MEMBER",

    // Columns
    "CREATE_COLUMN",
    "UPDATE_COLUMN",
    "DELETE_COLUMN",

    // Tasks
    "CREATE_TASK",
    "UPDATE_TASK",
    "DELETE_TASK",

    // Subtasks
    "CREATE_SUBTASK",
    "UPDATE_SUBTASK",
    "DELETE_SUBTASK",

    // Comments
    "CREATE_COMMENT",
    "UPDATE_COMMENT",
    "DELETE_COMMENT",
  ],

  MEMBER: [
    // Board
    "VIEW_BOARD",

    // Tasks
    "CREATE_TASK",
    "UPDATE_TASK",

    // Subtasks
    "CREATE_SUBTASK",
    "UPDATE_SUBTASK",
    "DELETE_SUBTASK",

    // Comments
    "CREATE_COMMENT",
    "UPDATE_COMMENT",
    "DELETE_COMMENT",
  ],

  VIEWER: [
    // Board
    "VIEW_BOARD",
  ],
};

export function hasPermission(
    role:Role,
    action:Action
):boolean{
    return rolePermissions[role].includes(action);
}
