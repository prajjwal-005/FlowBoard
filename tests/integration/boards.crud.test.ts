import { describe, it, expect } from "vitest";
import { randomUUID } from "node:crypto";
import { prisma } from "@/lib/prisma";
import { api } from "../helpers/http";
import { setupCleanDb } from "../setup";
import { authCookie, createUser } from "../helpers/users";
import {
  createBoardFixture,
  createColumn,
  createTask,
  createSubtask,
  createComment,
} from "../helpers/boards";
import { boardsUrl, boardUrl } from "../helpers/paths";

setupCleanDb();

describe("POST /api/boards", () => {
  it("creates a board and makes the creator OWNER", async () => {
    const user = await createUser();
    const res = await api
      .post(boardsUrl)
      .set("Cookie", await authCookie(user))
      .send({ name: "Sprint", description: "Q4 plan" });

    expect(res.status).toBe(201);
    expect(res.body).toMatchObject({
      success: true,
      data: { name: "Sprint", description: "Q4 plan" },
    });

    const membership = await prisma.boardMember.findUnique({
      where: { userID_boardID: { userID: user.id, boardID: res.body.data.id } },
    });
    expect(membership?.role).toBe("OWNER");
  });

  it("writes a BOARD_CREATED activity row with the actor's username", async () => {
    const user = await createUser();
    const res = await api
      .post(boardsUrl)
      .set("Cookie", await authCookie(user))
      .send({ name: "Logged" });

    const log = await prisma.activityLog.findFirst({
      where: { boardID: res.body.data.id },
    });
    expect(log).toMatchObject({
      action: "BOARD_CREATED",
      actorUsername: user.username,
      entityType: "BOARD",
      entityTitle: "Logged",
    });
  });

  it.each([
    ["missing name", {}],
    ["empty name", { name: "" }],
    ["name of 101 chars (limit 100)", { name: "a".repeat(101) }],
    ["description of 1001 chars (limit 1000)", { name: "ok", description: "a".repeat(1001) }],
  ])("400 for %s", async (_label, body) => {
    const user = await createUser();
    const res = await api.post(boardsUrl).set("Cookie", await authCookie(user)).send(body);
    expect(res.status).toBe(400);
  });

  it("accepts a name of exactly 100 chars (boundary)", async () => {
    const user = await createUser();
    const res = await api
      .post(boardsUrl)
      .set("Cookie", await authCookie(user))
      .send({ name: "a".repeat(100) });
    expect(res.status).toBe(201);
  });

  it("401 without a cookie", async () => {
    const res = await api.post(boardsUrl).send({ name: "x" });
    expect(res.status).toBe(401);
  });

  it("[BUG] 400 (not 500) for malformed JSON", async () => {
    const user = await createUser();
    const res = await api
      .post(boardsUrl)
      .set("Cookie", await authCookie(user))
      .set("Content-Type", "application/json")
      .send("{not json");
    expect(res.status).toBe(400);
  });
});

describe("GET /api/boards", () => {
  it("returns only the caller's boards, with a flat `role` and no `members`", async () => {
    const mine = await createBoardFixture();
    await createBoardFixture(); // someone else's board must not leak in

    const res = await api
      .get(boardsUrl)
      .set("Cookie", await authCookie(mine.users.VIEWER));

    expect(res.status).toBe(200);
    expect(res.body.data).toHaveLength(1);
    expect(res.body.data[0]).toMatchObject({ id: mine.board.id, role: "VIEWER" });
    expect(res.body.data[0]).not.toHaveProperty("members");
  });

  it("returns 200 and [] for a user with no boards", async () => {
    const user = await createUser();
    const res = await api.get(boardsUrl).set("Cookie", await authCookie(user));
    expect(res.status).toBe(200);
    expect(res.body.data).toEqual([]);
  });

  it("401 without a cookie", async () => {
    expect((await api.get(boardsUrl)).status).toBe(401);
  });
});

describe("GET /api/boards/[boardId]", () => {
  it.each(["OWNER", "ADMIN", "MEMBER", "VIEWER"] as const)(
    "returns the board with role=%s",
    async (role) => {
      const ctx = await createBoardFixture();
      const res = await api
        .get(boardUrl(ctx.board.id))
        .set("Cookie", await authCookie(ctx.users[role]));
      expect(res.status).toBe(200);
      expect(res.body.data).toMatchObject({ id: ctx.board.id, role });
      expect(res.body.data).not.toHaveProperty("members");
    }
  );

  it("nests columns and tasks, both ordered by `order` asc", async () => {
    const ctx = await createBoardFixture();
    const done = await createColumn(ctx.board, ctx.users.OWNER, "Done");
    await createTask(ctx.board, ctx.column, ctx.users.OWNER, "third");

    const res = await api
      .get(boardUrl(ctx.board.id))
      .set("Cookie", await authCookie(ctx.users.VIEWER));

    const columns = res.body.data.columns;
    expect(columns.map((c: { id: string }) => c.id)).toEqual([ctx.column.id, done.id]);
    expect(columns[0].tasks.map((t: { title: string }) => t.title)).toEqual([
      "Owner task",
      "Member task",
      "third",
    ]);
    expect(columns[1].tasks).toEqual([]);
  });

  it("404 for an unknown board id", async () => {
    const user = await createUser();
    const res = await api
      .get(boardUrl(randomUUID()))
      .set("Cookie", await authCookie(user));
    expect(res.status).toBe(404);
  });

  it("400 for a malformed board id", async () => {
    const user = await createUser();
    const res = await api
      .get(boardUrl("not-a-uuid"))
      .set("Cookie", await authCookie(user));
    expect(res.status).toBe(400);
  });
});

describe("PATCH /api/boards/[boardId]", () => {
  it("updates only the fields sent (description stays)", async () => {
    const ctx = await createBoardFixture();
    await prisma.board.update({
      where: { id: ctx.board.id },
      data: { description: "keep me" },
    });

    const res = await api
      .patch(boardUrl(ctx.board.id))
      .set("Cookie", await authCookie(ctx.users.OWNER))
      .send({ name: "New name" });

    expect(res.status).toBe(200);
    expect(res.body.data).toMatchObject({ name: "New name", description: "keep me" });
  });

  it("writes a BOARD_UPDATED activity row", async () => {
    const ctx = await createBoardFixture();
    await api
      .patch(boardUrl(ctx.board.id))
      .set("Cookie", await authCookie(ctx.users.ADMIN))
      .send({ name: "Renamed" });

    const log = await prisma.activityLog.findFirst({
      where: { boardID: ctx.board.id, action: "BOARD_UPDATED" },
    });
    expect(log).toMatchObject({
      actorUsername: ctx.users.ADMIN.username,
      entityTitle: "Renamed",
    });
  });

  it.each([
    ["empty body", {}],
    ["empty name", { name: "" }],
    ["name of 101 chars", { name: "a".repeat(101) }],
  ])("400 for %s", async (_label, body) => {
    const ctx = await createBoardFixture();
    const res = await api
      .patch(boardUrl(ctx.board.id))
      .set("Cookie", await authCookie(ctx.users.OWNER))
      .send(body);
    expect(res.status).toBe(400);
  });
});

describe("DELETE /api/boards/[boardId]", () => {
  it("deletes the board and cascades to members, columns, tasks, subtasks and comments", async () => {
    const ctx = await createBoardFixture();
    await createSubtask(ctx.ownerTask, ctx.users.OWNER);
    await createComment(ctx.ownerTask, ctx.users.MEMBER);

    const res = await api
      .delete(boardUrl(ctx.board.id))
      .set("Cookie", await authCookie(ctx.users.OWNER));
    expect(res.status).toBe(200);

    const where = { boardID: ctx.board.id };
    expect(await prisma.board.count({ where: { id: ctx.board.id } })).toBe(0);
    expect(await prisma.boardMember.count({ where })).toBe(0);
    expect(await prisma.column.count({ where })).toBe(0);
    expect(await prisma.task.count({ where })).toBe(0);
    expect(await prisma.subtask.count()).toBe(0);
    expect(await prisma.comment.count()).toBe(0);
    // Cascade goes down the tree only: users are untouched.
    expect(await prisma.user.count()).toBe(5);
  });

  it("the board is gone afterwards (404)", async () => {
    const ctx = await createBoardFixture();
    const cookie = await authCookie(ctx.users.OWNER);
    await api.delete(boardUrl(ctx.board.id)).set("Cookie", cookie);
    const res = await api.get(boardUrl(ctx.board.id)).set("Cookie", cookie);
    expect(res.status).toBe(404);
  });

  it("does not touch other boards", async () => {
    const a = await createBoardFixture();
    const b = await createBoardFixture();
    await api.delete(boardUrl(a.board.id)).set("Cookie", await authCookie(a.users.OWNER));
    expect(await prisma.board.count({ where: { id: b.board.id } })).toBe(1);
    expect(await prisma.task.count({ where: { boardID: b.board.id } })).toBe(2);
  });
});
