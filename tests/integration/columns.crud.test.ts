import { describe, it, expect } from "vitest";
import { randomUUID } from "node:crypto";
import { prisma } from "@/lib/prisma";
import { api } from "../helpers/http";
import { setupCleanDb } from "../setup";
import { authCookie, createUser } from "../helpers/users";
import {
  createBoard,
  createBoardFixture,
  createColumn,
  createSubtask,
  createComment,
} from "../helpers/boards";
import { columnsUrl, columnUrl } from "../helpers/paths";

setupCleanDb();

describe("POST /columns", () => {
  it("appends with order = last + 1000", async () => {
    const ctx = await createBoardFixture(); // existing column has order 1000
    const res = await api
      .post(columnsUrl(ctx.board.id))
      .set("Cookie", await authCookie(ctx.users.OWNER))
      .send({ title: "Doing" });

    expect(res.status).toBe(201);
    expect(res.body.data).toMatchObject({ title: "Doing", order: 2000, boardID: ctx.board.id });
  });

  it("first column on an empty board gets order 1000", async () => {
    const owner = await createUser();
    const board = await createBoard(owner);
    const res = await api
      .post(columnsUrl(board.id))
      .set("Cookie", await authCookie(owner))
      .send({ title: "First" });
    expect(res.body.data.order).toBe(1000);
  });

  it("writes a COLUMN_CREATED activity row", async () => {
    const ctx = await createBoardFixture();
    const res = await api
      .post(columnsUrl(ctx.board.id))
      .set("Cookie", await authCookie(ctx.users.ADMIN))
      .send({ title: "Review" });

    const log = await prisma.activityLog.findFirst({
      where: { boardID: ctx.board.id, action: "COLUMN_CREATED" },
    });
    expect(log).toMatchObject({
      entityID: res.body.data.id,
      entityTitle: "Review",
      actorUsername: ctx.users.ADMIN.username,
    });
  });

  it.each([
    ["missing title", {}],
    ["empty title", { title: "" }],
    ["title of 101 chars (limit 100)", { title: "a".repeat(101) }],
  ])("400 for %s", async (_label, body) => {
    const ctx = await createBoardFixture();
    const res = await api
      .post(columnsUrl(ctx.board.id))
      .set("Cookie", await authCookie(ctx.users.OWNER))
      .send(body);
    expect(res.status).toBe(400);
  });

  it("[BUG?] 400 for a whitespace-only title", async () => {
    // Schema is z.string().min(1).max(100).trim(): min() may run BEFORE trim(),
    // letting "   " through as an empty title. Fix: .trim().min(1).max(100)
    const ctx = await createBoardFixture();
    const res = await api
      .post(columnsUrl(ctx.board.id))
      .set("Cookie", await authCookie(ctx.users.OWNER))
      .send({ title: "   " });
    expect(res.status).toBe(400);
  });
});

describe("GET /columns", () => {
  it("any member (VIEWER) gets columns with tasks nested and ordered", async () => {
    const ctx = await createBoardFixture();
    const res = await api
      .get(columnsUrl(ctx.board.id))
      .set("Cookie", await authCookie(ctx.users.VIEWER));

    expect(res.status).toBe(200);
    expect(res.body.data).toHaveLength(1);
    expect(res.body.data[0].tasks.map((t: { title: string }) => t.title)).toEqual([
      "Owner task",
      "Member task",
    ]);
  });

  it("200 and [] when the board has no columns", async () => {
    const owner = await createUser();
    const board = await createBoard(owner);
    const res = await api.get(columnsUrl(board.id)).set("Cookie", await authCookie(owner));
    expect(res.status).toBe(200);
    expect(res.body.data).toEqual([]);
  });
});

describe("PATCH /columns/[columnId]", () => {
  it("renames the column", async () => {
    const ctx = await createBoardFixture();
    const res = await api
      .patch(columnUrl(ctx.board.id, ctx.column.id))
      .set("Cookie", await authCookie(ctx.users.OWNER))
      .send({ title: "Backlog" });
    expect(res.status).toBe(200);
    expect(res.body.data.title).toBe("Backlog");
  });

  it("404 when the column belongs to ANOTHER board (compound where, IDOR guard)", async () => {
    const a = await createBoardFixture();
    const b = await createBoardFixture();
    // Caller is OWNER of A, but targets B's column through A's URL.
    const res = await api
      .patch(columnUrl(a.board.id, b.column.id))
      .set("Cookie", await authCookie(a.users.OWNER))
      .send({ title: "hacked" });

    expect(res.status).toBe(404);
    const untouched = await prisma.column.findUnique({ where: { id: b.column.id } });
    expect(untouched?.title).toBe("Todo");
  });

  it("409 when the new order collides with another column (@@unique boardID+order)", async () => {
    const ctx = await createBoardFixture();
    const second = await createColumn(ctx.board, ctx.users.OWNER, "Doing"); // order 2000
    const res = await api
      .patch(columnUrl(ctx.board.id, ctx.column.id))
      .set("Cookie", await authCookie(ctx.users.OWNER))
      .send({ order: second.order });
    // A 500 here means the P2002 `instanceof` check in the route is not matching.
    expect(res.status).toBe(409);
  });

  it.each([
    ["empty body", {}],
    ["negative order", { order: -1 }],
    ["empty title", { title: "" }],
  ])("400 for %s", async (_label, body) => {
    const ctx = await createBoardFixture();
    const res = await api
      .patch(columnUrl(ctx.board.id, ctx.column.id))
      .set("Cookie", await authCookie(ctx.users.OWNER))
      .send(body);
    expect(res.status).toBe(400);
  });
});

describe("DELETE /columns/[columnId]", () => {
  it("deletes the column and cascades to its tasks, subtasks and comments", async () => {
    const ctx = await createBoardFixture();
    const keep = await createColumn(ctx.board, ctx.users.OWNER, "Keep");
    await createSubtask(ctx.ownerTask, ctx.users.OWNER);
    await createComment(ctx.ownerTask, ctx.users.MEMBER);

    const res = await api
      .delete(columnUrl(ctx.board.id, ctx.column.id))
      .set("Cookie", await authCookie(ctx.users.OWNER));
    expect(res.status).toBe(200);

    expect(await prisma.column.count({ where: { id: ctx.column.id } })).toBe(0);
    expect(await prisma.task.count({ where: { columnID: ctx.column.id } })).toBe(0);
    expect(await prisma.subtask.count()).toBe(0);
    expect(await prisma.comment.count()).toBe(0);
    expect(await prisma.column.count({ where: { id: keep.id } })).toBe(1); // sibling intact
  });

  it("writes a COLUMN_DELETED activity row (not COLUMN_RENAMED)", async () => {
    const ctx = await createBoardFixture();
    await api
      .delete(columnUrl(ctx.board.id, ctx.column.id))
      .set("Cookie", await authCookie(ctx.users.OWNER));
    const log = await prisma.activityLog.findFirst({
      where: { boardID: ctx.board.id, entityID: ctx.column.id },
    });
    expect(log?.action).toBe("COLUMN_DELETED");
  });

  it("404 for an unknown column id", async () => {
    const ctx = await createBoardFixture();
    const res = await api
      .delete(columnUrl(ctx.board.id, randomUUID()))
      .set("Cookie", await authCookie(ctx.users.OWNER));
    expect(res.status).toBe(404);
  });

  it("404 and nothing deleted when the column belongs to another board", async () => {
    const a = await createBoardFixture();
    const b = await createBoardFixture();
    const res = await api
      .delete(columnUrl(a.board.id, b.column.id))
      .set("Cookie", await authCookie(a.users.OWNER));
    expect(res.status).toBe(404);
    expect(await prisma.column.count({ where: { id: b.column.id } })).toBe(1);
  });
});
