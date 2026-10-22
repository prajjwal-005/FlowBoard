import { describe, it, expect, vi } from "vitest";
import { randomUUID } from "node:crypto";
import { prisma } from "@/lib/prisma";
import { api } from "../helpers/http";
import { setupCleanDb } from "../setup";
import { authCookie } from "../helpers/users";
import {
  createBoardFixture,
  createColumn,
  createSubtask,
  createComment,
  assignUser,
} from "../helpers/boards";
import { tasksUrl, taskUrl } from "../helpers/paths";

setupCleanDb();

// The route answers 400 today when the column isn't on this board.
// Arguably 404 ("resource not found"). If you change the route, change this one constant.
const COLUMN_MISMATCH_STATUS = 400;

describe("POST /tasks", () => {
  it("defaults priority to MEDIUM, appends with order = last + 1000, sets createdById", async () => {
    const ctx = await createBoardFixture(); // last task order = 2000
    const res = await api
      .post(tasksUrl(ctx.board.id, ctx.column.id))
      .set("Cookie", await authCookie(ctx.users.MEMBER))
      .send({ title: "New" });

    expect(res.status).toBe(201);
    expect(res.body.data).toMatchObject({
      title: "New",
      priority: "MEDIUM",
      order: 3000,
      createdById: ctx.users.MEMBER.id,
      columnID: ctx.column.id,
      boardID: ctx.board.id,
    });
  });

  it("stores optional description, priority and dueDate", async () => {
    const ctx = await createBoardFixture();
    const res = await api
      .post(tasksUrl(ctx.board.id, ctx.column.id))
      .set("Cookie", await authCookie(ctx.users.OWNER))
      .send({
        title: "Full",
        description: "details",
        priority: "HIGH",
        dueDate: "2030-01-01T00:00:00.000Z",
      });
    expect(res.status).toBe(201);
    expect(res.body.data).toMatchObject({ description: "details", priority: "HIGH" });
    expect(res.body.data.dueDate).toBe("2030-01-01T00:00:00.000Z");
  });

  it("writes a TASK_CREATED activity row", async () => {
    const ctx = await createBoardFixture();
    const res = await api
      .post(tasksUrl(ctx.board.id, ctx.column.id))
      .set("Cookie", await authCookie(ctx.users.OWNER))
      .send({ title: "Logged" });
    const log = await prisma.activityLog.findFirst({
      where: { boardID: ctx.board.id, action: "TASK_CREATED" },
    });
    expect(log).toMatchObject({ entityID: res.body.data.id, entityTitle: "Logged" });
  });

  it.each([
    ["missing title", {}],
    ["empty title", { title: "" }],
    ["title of 201 chars (limit 200)", { title: "a".repeat(201) }],
    ["description of 2001 chars (limit 2000)", { title: "t", description: "a".repeat(2001) }],
    ["invalid priority", { title: "t", priority: "URGENT" }],
    ["invalid dueDate", { title: "t", dueDate: "not-a-date" }],
  ])("400 for %s", async (_label, body) => {
    const ctx = await createBoardFixture();
    const res = await api
      .post(tasksUrl(ctx.board.id, ctx.column.id))
      .set("Cookie", await authCookie(ctx.users.OWNER))
      .send(body);
    expect(res.status).toBe(400);
  });

  it("rejects a column that belongs to another board", async () => {
    const a = await createBoardFixture();
    const b = await createBoardFixture();
    const res = await api
      .post(tasksUrl(a.board.id, b.column.id))
      .set("Cookie", await authCookie(a.users.OWNER))
      .send({ title: "sneaky" });
    expect(res.status).toBe(COLUMN_MISMATCH_STATUS);
    expect(await prisma.task.count({ where: { columnID: b.column.id } })).toBe(2); // unchanged
  });
});

describe("GET /tasks", () => {
  it("lists the column's tasks ordered by `order` asc (VIEWER allowed)", async () => {
    const ctx = await createBoardFixture();
    const res = await api
      .get(tasksUrl(ctx.board.id, ctx.column.id))
      .set("Cookie", await authCookie(ctx.users.VIEWER));
    expect(res.status).toBe(200);
    expect(res.body.data.map((t: { title: string }) => t.title)).toEqual([
      "Owner task",
      "Member task",
    ]);
  });
});

describe("GET /tasks/[taskId]", () => {
  it("returns subtasks, comments (with user), assignees (reshaped) and createdBy", async () => {
    const ctx = await createBoardFixture();
    await createSubtask(ctx.ownerTask, ctx.users.OWNER, "s1");
    await createComment(ctx.ownerTask, ctx.users.MEMBER, "c1");
    await assignUser(ctx.ownerTask, ctx.users.ADMIN);

    const res = await api
      .get(taskUrl(ctx.board.id, ctx.column.id, ctx.ownerTask.id))
      .set("Cookie", await authCookie(ctx.users.VIEWER));

    expect(res.status).toBe(200);
    const t = res.body.data;
    expect(t.subtasks).toHaveLength(1);
    expect(t.comments[0]).toMatchObject({
      content: "c1",
      user: { username: ctx.users.MEMBER.username },
    });
    expect(t.assignees[0]).toMatchObject({
      userID: ctx.users.ADMIN.id,
      user: { username: ctx.users.ADMIN.username },
    });
    expect(t).not.toHaveProperty("taskAssignee"); // reshaped to `assignees`
    expect(t.createdBy.username).toBe(ctx.users.OWNER.username);
  });

  it("returns empty arrays (never undefined) for a bare task", async () => {
    const ctx = await createBoardFixture();
    const res = await api
      .get(taskUrl(ctx.board.id, ctx.column.id, ctx.memberTask.id))
      .set("Cookie", await authCookie(ctx.users.OWNER));
    expect(res.body.data).toMatchObject({ subtasks: [], comments: [], assignees: [] });
  });

  it("404 for an unknown task id", async () => {
    const ctx = await createBoardFixture();
    const res = await api
      .get(taskUrl(ctx.board.id, ctx.column.id, randomUUID()))
      .set("Cookie", await authCookie(ctx.users.OWNER));
    expect(res.status).toBe(404);
  });

  it("404 when the task is requested through the wrong column's URL", async () => {
    const ctx = await createBoardFixture();
    const other = await createColumn(ctx.board, ctx.users.OWNER, "Other");
    const res = await api
      .get(taskUrl(ctx.board.id, other.id, ctx.ownerTask.id))
      .set("Cookie", await authCookie(ctx.users.OWNER));
    expect(res.status).toBe(404);
  });
});

describe("PATCH /tasks/[taskId]", () => {
  it("edits fields and logs TASK_UPDATED", async () => {
    const ctx = await createBoardFixture();
    const res = await api
      .patch(taskUrl(ctx.board.id, ctx.column.id, ctx.ownerTask.id))
      .set("Cookie", await authCookie(ctx.users.OWNER))
      .send({ title: "Edited", description: "d", priority: "LOW" });

    expect(res.status).toBe(200);
    expect(res.body.data).toMatchObject({ title: "Edited", description: "d", priority: "LOW" });
    const log = await prisma.activityLog.findFirst({
      where: { boardID: ctx.board.id, entityID: ctx.ownerTask.id },
    });
    expect(log?.action).toBe("TASK_UPDATED");
  });

  it("moves a task to another column of the same board and logs TASK_MOVED", async () => {
    const ctx = await createBoardFixture();
    const done = await createColumn(ctx.board, ctx.users.OWNER, "Done");

    const res = await api
      .patch(taskUrl(ctx.board.id, ctx.column.id, ctx.ownerTask.id))
      .set("Cookie", await authCookie(ctx.users.OWNER))
      .send({ columnID: done.id, order: 1000 });

    expect(res.status).toBe(200);
    expect(res.body.data.columnID).toBe(done.id);
    const row = await prisma.task.findUnique({ where: { id: ctx.ownerTask.id } });
    expect(row?.columnID).toBe(done.id);
    const log = await prisma.activityLog.findFirst({
      where: { boardID: ctx.board.id, entityID: ctx.ownerTask.id },
    });
    expect(log?.action).toBe("TASK_MOVED");
  });

  it("400 when columnID is sent without order (move must carry a position)", async () => {
    const ctx = await createBoardFixture();
    const done = await createColumn(ctx.board, ctx.users.OWNER, "Done");
    const res = await api
      .patch(taskUrl(ctx.board.id, ctx.column.id, ctx.ownerTask.id))
      .set("Cookie", await authCookie(ctx.users.OWNER))
      .send({ columnID: done.id });
    expect(res.status).toBe(400);
  });

  it("rejects a cross-board move (D12) and leaves the task untouched", async () => {
    const a = await createBoardFixture();
    const b = await createBoardFixture();
    const res = await api
      .patch(taskUrl(a.board.id, a.column.id, a.ownerTask.id))
      .set("Cookie", await authCookie(a.users.OWNER))
      .send({ columnID: b.column.id, order: 1000 });

    expect(res.status).toBe(400);
    const row = await prisma.task.findUnique({ where: { id: a.ownerTask.id } });
    expect(row).toMatchObject({ columnID: a.column.id, boardID: a.board.id });
  });

  it("400 for an empty body", async () => {
    const ctx = await createBoardFixture();
    const res = await api
      .patch(taskUrl(ctx.board.id, ctx.column.id, ctx.ownerTask.id))
      .set("Cookie", await authCookie(ctx.users.OWNER))
      .send({});
    expect(res.status).toBe(400);
  });

  it("404 for an unknown task id", async () => {
    const ctx = await createBoardFixture();
    const res = await api
      .patch(taskUrl(ctx.board.id, ctx.column.id, randomUUID()))
      .set("Cookie", await authCookie(ctx.users.OWNER))
      .send({ title: "x" });
    expect(res.status).toBe(404);
  });

  // Notifications are fire-and-forget in the route, so poll the DB instead of reading it once.
  it("[BUG] notifies assignees when priority really changes", async () => {
    const ctx = await createBoardFixture();
    await prisma.task.update({ where: { id: ctx.ownerTask.id }, data: { priority: "LOW" } });
    await assignUser(ctx.ownerTask, ctx.users.MEMBER);

    await api
      .patch(taskUrl(ctx.board.id, ctx.column.id, ctx.ownerTask.id))
      .set("Cookie", await authCookie(ctx.users.OWNER))
      .send({ priority: "HIGH" });

    await vi.waitFor(
      async () => {
        const n = await prisma.notification.findMany({
          where: { userID: ctx.users.MEMBER.id, type: "TASK_PRIORITY_CHANGED" },
        });
        expect(n).toHaveLength(1);
      },
      { timeout: 5000, interval: 200 }
    );
  });

  it("[BUG] notifies assignees when dueDate really changes", async () => {
    const ctx = await createBoardFixture();
    await prisma.task.update({
      where: { id: ctx.ownerTask.id },
      data: { dueDate: new Date("2030-01-01T00:00:00.000Z") },
    });
    await assignUser(ctx.ownerTask, ctx.users.MEMBER);

    await api
      .patch(taskUrl(ctx.board.id, ctx.column.id, ctx.ownerTask.id))
      .set("Cookie", await authCookie(ctx.users.OWNER))
      .send({ dueDate: "2031-06-15T00:00:00.000Z" });

    await vi.waitFor(
      async () => {
        const n = await prisma.notification.findMany({
          where: { userID: ctx.users.MEMBER.id, type: "TASK_DUE_DATE_CHANGED" },
        });
        expect(n).toHaveLength(1);
      },
      { timeout: 5000, interval: 200 }
    );
  });
});

describe("DELETE /tasks/[taskId]", () => {
  it("deletes the task and cascades to subtasks, comments and assignees", async () => {
    const ctx = await createBoardFixture();
    await createSubtask(ctx.ownerTask, ctx.users.OWNER);
    await createComment(ctx.ownerTask, ctx.users.MEMBER);
    await assignUser(ctx.ownerTask, ctx.users.ADMIN);

    const res = await api
      .delete(taskUrl(ctx.board.id, ctx.column.id, ctx.ownerTask.id))
      .set("Cookie", await authCookie(ctx.users.ADMIN));
    expect(res.status).toBe(200);

    expect(await prisma.task.count({ where: { id: ctx.ownerTask.id } })).toBe(0);
    expect(await prisma.subtask.count()).toBe(0);
    expect(await prisma.comment.count()).toBe(0);
    expect(await prisma.taskAssignee.count()).toBe(0);
    expect(await prisma.task.count({ where: { id: ctx.memberTask.id } })).toBe(1); // sibling intact
  });

  it("writes a TASK_DELETED activity row and a second DELETE returns 404", async () => {
    const ctx = await createBoardFixture();
    const cookie = await authCookie(ctx.users.OWNER);
    const url = taskUrl(ctx.board.id, ctx.column.id, ctx.ownerTask.id);

    expect((await api.delete(url).set("Cookie", cookie)).status).toBe(200);
    const log = await prisma.activityLog.findFirst({
      where: { boardID: ctx.board.id, entityID: ctx.ownerTask.id },
    });
    expect(log).toMatchObject({ action: "TASK_DELETED", entityTitle: "Owner task" });

    expect((await api.delete(url).set("Cookie", cookie)).status).toBe(404);
  });

  it("404 when the task is addressed through the wrong column", async () => {
    const ctx = await createBoardFixture();
    const other = await createColumn(ctx.board, ctx.users.OWNER, "Other");
    const res = await api
      .delete(taskUrl(ctx.board.id, other.id, ctx.ownerTask.id))
      .set("Cookie", await authCookie(ctx.users.OWNER));
    expect(res.status).toBe(404);
    expect(await prisma.task.count({ where: { id: ctx.ownerTask.id } })).toBe(1);
  });
});
