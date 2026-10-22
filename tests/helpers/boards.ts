import { prisma } from "@/lib/prisma";
import { createUser, type TestUser } from "./users";

export type { TestUser };
export type Role = "OWNER" | "ADMIN" | "MEMBER" | "VIEWER";

/** Board + OWNER membership, created directly via Prisma (no API, no rate limit). */
export async function createBoard(owner: TestUser, name = "Test Board") {
  return prisma.board.create({
    data: {
      name,
      createdById: owner.id,
      members: { create: { userID: owner.id, role: "OWNER" } },
    },
  });
}

export async function addMember(
  board: { id: string },
  user: TestUser,
  role: Role = "MEMBER"
) {
  return prisma.boardMember.create({
    data: { boardID: board.id, userID: user.id, role },
  });
}

/** Column order = current max + 1000 (same gap strategy as the API). */
export async function createColumn(
  board: { id: string },
  creator: TestUser,
  title = "Todo"
) {
  const max = await prisma.column.aggregate({
    where: { boardID: board.id },
    _max: { order: true },
  });
  return prisma.column.create({
    data: {
      title,
      boardID: board.id,
      createdById: creator.id,
      order: (max._max.order ?? 0) + 1000,
    },
  });
}

/** Task order = current max in that column + 1000. */
export async function createTask(
  board: { id: string },
  column: { id: string },
  creator: TestUser,
  title = "Test Task"
) {
  const last = await prisma.task.findFirst({
    where: { columnID: column.id },
    orderBy: { order: "desc" },
    select: { order: true },
  });
  return prisma.task.create({
    data: {
      title,
      boardID: board.id,
      columnID: column.id,
      createdById: creator.id,
      order: (last?.order ?? 0) + 1000,
    },
  });
}

export async function createSubtask(
  task: { id: string },
  creator: TestUser,
  title = "Test Subtask"
) {
  return prisma.subtask.create({
    data: { title, taskID: task.id, createdByID: creator.id },
  });
}

export async function createComment(
  task: { id: string },
  author: TestUser,
  content = "Test comment"
) {
  return prisma.comment.create({
    data: { content, taskID: task.id, userID: author.id },
  });
}

export async function assignUser(task: { id: string }, user: TestUser) {
  return prisma.taskAssignee.create({
    data: { taskID: task.id, userID: user.id },
  });
}

/**
 * One call = everything an RBAC test needs:
 * a user per role, an outsider (not a member), one column (order 1000),
 * a task made by the OWNER (order 1000) and a task made by the MEMBER (order 2000).
 */
export async function createBoardFixture() {
  const [owner, admin, member, viewer, outsider] = await Promise.all([
    createUser(),
    createUser(),
    createUser(),
    createUser(),
    createUser(),
  ]);

  const board = await createBoard(owner);
  await Promise.all([
    addMember(board, admin, "ADMIN"),
    addMember(board, member, "MEMBER"),
    addMember(board, viewer, "VIEWER"),
  ]);

  const column = await createColumn(board, owner);
  const ownerTask = await createTask(board, column, owner, "Owner task");
  const memberTask = await createTask(board, column, member, "Member task");

  return {
    board,
    column,
    ownerTask,
    memberTask,
    users: { OWNER: owner, ADMIN: admin, MEMBER: member, VIEWER: viewer },
    outsider,
  };
}
