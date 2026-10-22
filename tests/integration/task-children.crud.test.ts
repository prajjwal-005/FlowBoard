import { describe, it, expect, vi } from "vitest";
import { randomUUID } from "node:crypto";
import { prisma } from "@/lib/prisma";
import { api } from "../helpers/http";
import { setupCleanDb } from "../setup";
import { authCookie } from "../helpers/users";
import {
  createBoardFixture,
  createSubtask,
  createComment,
  assignUser,
  type Role,
} from "../helpers/boards";
import {
  subtasksUrl,
  subtaskUrl,
  commentsUrl,
  commentUrl,
  assigneesUrl,
} from "../helpers/paths";

setupCleanDb();

/* ------------------------------------------------------------------ */
/* Subtasks                                                            */
/* ------------------------------------------------------------------ */
describe("subtasks", () => {
  it("POST creates an incomplete subtask owned by the caller and logs activity", async () => {
    const ctx = await createBoardFixture();
    const res = await api
      .post(subtasksUrl(ctx.board.id, ctx.column.id, ctx.ownerTask.id))
      .set("Cookie", await authCookie(ctx.users.MEMBER))
      .send({ title: "Write tests" });

    expect(res.status).toBe(201);
    expect(res.body.data).toMatchObject({
      title: "Write tests",
      isCompleted: false,
      createdByID: ctx.users.MEMBER.id,
    });
    const log = await prisma.activityLog.findFirst({
      where: { boardID: ctx.board.id, action: "SUBTASK_CREATED" },
    });
    expect(log).toMatchObject({ entityID: ctx.ownerTask.id, entityTitle: "Owner task" });
  });

  it.each([
    ["missing title", {}],
    ["empty title", { title: "" }],
    ["title of 201 chars (limit 200)", { title: "a".repeat(201) }],
  ])("POST 400 for %s", async (_label, body) => {
    const ctx = await createBoardFixture();
    const res = await api
      .post(subtasksUrl(ctx.board.id, ctx.column.id, ctx.ownerTask.id))
      .set("Cookie", await authCookie(ctx.users.OWNER))
      .send(body);
    expect(res.status).toBe(400);
  });

  it("POST 404 for an unknown task", async () => {
    const ctx = await createBoardFixture();
    const res = await api
      .post(subtasksUrl(ctx.board.id, ctx.column.id, randomUUID()))
      .set("Cookie", await authCookie(ctx.users.OWNER))
      .send({ title: "x" });
    expect(res.status).toBe(404);
  });

  it("PATCH toggles isCompleted and renames", async () => {
    const ctx = await createBoardFixture();
    const s = await createSubtask(ctx.ownerTask, ctx.users.OWNER, "old");
    const res = await api
      .patch(subtaskUrl(ctx.board.id, ctx.column.id, ctx.ownerTask.id, s.id))
      .set("Cookie", await authCookie(ctx.users.OWNER))
      .send({ title: "new", isCompleted: true });
    expect(res.status).toBe(200);
    expect(res.body.data).toMatchObject({ title: "new", isCompleted: true });
  });

  it("PATCH by MEMBER works on a task the MEMBER created (D7)", async () => {
    const ctx = await createBoardFixture();
    const s = await createSubtask(ctx.memberTask, ctx.users.OWNER);
    const res = await api
      .patch(subtaskUrl(ctx.board.id, ctx.column.id, ctx.memberTask.id, s.id))
      .set("Cookie", await authCookie(ctx.users.MEMBER))
      .send({ isCompleted: true });
    expect(res.status).toBe(200);
  });

  it("PATCH 400 for an empty body", async () => {
    const ctx = await createBoardFixture();
    const s = await createSubtask(ctx.ownerTask, ctx.users.OWNER);
    const res = await api
      .patch(subtaskUrl(ctx.board.id, ctx.column.id, ctx.ownerTask.id, s.id))
      .set("Cookie", await authCookie(ctx.users.OWNER))
      .send({});
    expect(res.status).toBe(400);
  });

  it("PATCH/DELETE 404 for an unknown subtask", async () => {
    const ctx = await createBoardFixture();
    const cookie = await authCookie(ctx.users.OWNER);
    const url = subtaskUrl(ctx.board.id, ctx.column.id, ctx.ownerTask.id, randomUUID());
    expect((await api.patch(url).set("Cookie", cookie).send({ isCompleted: true })).status).toBe(404);
    expect((await api.delete(url).set("Cookie", cookie)).status).toBe(404);
  });

  it("404 when the subtask belongs to a different task (compound where)", async () => {
    const ctx = await createBoardFixture();
    const s = await createSubtask(ctx.memberTask, ctx.users.OWNER);
    const res = await api
      .patch(subtaskUrl(ctx.board.id, ctx.column.id, ctx.ownerTask.id, s.id))
      .set("Cookie", await authCookie(ctx.users.OWNER))
      .send({ isCompleted: true });
    expect(res.status).toBe(404);
  });

  it("DELETE removes the row; MEMBER may delete on a task they created (D7)", async () => {
    const ctx = await createBoardFixture();
    const s = await createSubtask(ctx.memberTask, ctx.users.OWNER);
    const res = await api
      .delete(subtaskUrl(ctx.board.id, ctx.column.id, ctx.memberTask.id, s.id))
      .set("Cookie", await authCookie(ctx.users.MEMBER));
    expect(res.status).toBe(200);
    expect(await prisma.subtask.count({ where: { id: s.id } })).toBe(0);
  });
});

/* ------------------------------------------------------------------ */
/* Comments                                                            */
/* ------------------------------------------------------------------ */
describe("comments", () => {
  it("POST returns the comment with the author's user info", async () => {
    const ctx = await createBoardFixture();
    const res = await api
      .post(commentsUrl(ctx.board.id, ctx.column.id, ctx.ownerTask.id))
      .set("Cookie", await authCookie(ctx.users.MEMBER))
      .send({ content: "looks good" });
    expect(res.status).toBe(201);
    expect(res.body.data).toMatchObject({
      content: "looks good",
      userID: ctx.users.MEMBER.id,
      user: { username: ctx.users.MEMBER.username },
    });
  });

  it.each([
    ["missing content", {}],
    ["empty content", { content: "" }],
    ["content of 2001 chars (limit 2000)", { content: "a".repeat(2001) }],
  ])("POST 400 for %s", async (_label, body) => {
    const ctx = await createBoardFixture();
    const res = await api
      .post(commentsUrl(ctx.board.id, ctx.column.id, ctx.ownerTask.id))
      .set("Cookie", await authCookie(ctx.users.OWNER))
      .send(body);
    expect(res.status).toBe(400);
  });

  it("POST 404 for an unknown task", async () => {
    const ctx = await createBoardFixture();
    const res = await api
      .post(commentsUrl(ctx.board.id, ctx.column.id, randomUUID()))
      .set("Cookie", await authCookie(ctx.users.OWNER))
      .send({ content: "x" });
    expect(res.status).toBe(404);
  });

  it("POST notifies task creator + assignees once each, never the commenter", async () => {
    const ctx = await createBoardFixture();
    // ownerTask: created by OWNER. OWNER is ALSO an assignee -> must still get exactly one.
    await assignUser(ctx.ownerTask, ctx.users.OWNER);
    await assignUser(ctx.ownerTask, ctx.users.ADMIN);

    await api
      .post(commentsUrl(ctx.board.id, ctx.column.id, ctx.ownerTask.id))
      .set("Cookie", await authCookie(ctx.users.MEMBER))
      .send({ content: "ping" });

    await vi.waitFor(
      async () => {
        const rows = await prisma.notification.findMany({ where: { type: "TASK_COMMENTED" } });
        expect(rows.map((r) => r.userID).sort()).toEqual(
          [ctx.users.OWNER.id, ctx.users.ADMIN.id].sort()
        );
      },
      { timeout: 5000, interval: 200 }
    );
  });

  it("PATCH: the author can edit their own comment", async () => {
    const ctx = await createBoardFixture();
    const c = await createComment(ctx.ownerTask, ctx.users.MEMBER, "typo");
    const res = await api
      .patch(commentUrl(ctx.board.id, ctx.column.id, ctx.ownerTask.id, c.id))
      .set("Cookie", await authCookie(ctx.users.MEMBER))
      .send({ content: "fixed" });
    expect(res.status).toBe(200);
    expect(res.body.data.content).toBe("fixed");
  });

  it.each(["OWNER", "ADMIN"] as Role[])(
    "PATCH: %s cannot edit someone else's comment (no moderation edit)",
    async (role) => {
      const ctx = await createBoardFixture();
      const c = await createComment(ctx.ownerTask, ctx.users.MEMBER, "mine");
      const res = await api
        .patch(commentUrl(ctx.board.id, ctx.column.id, ctx.ownerTask.id, c.id))
        .set("Cookie", await authCookie(ctx.users[role]))
        .send({ content: "tampered" });
      expect(res.status).toBe(403);
      expect((await prisma.comment.findUnique({ where: { id: c.id } }))?.content).toBe("mine");
    }
  );

  it("PATCH: a VIEWER cannot edit even their own comment (D8 role floor)", async () => {
    const ctx = await createBoardFixture();
    const c = await createComment(ctx.ownerTask, ctx.users.VIEWER, "from before demotion");
    const res = await api
      .patch(commentUrl(ctx.board.id, ctx.column.id, ctx.ownerTask.id, c.id))
      .set("Cookie", await authCookie(ctx.users.VIEWER))
      .send({ content: "edit" });
    expect(res.status).toBe(403);
  });

  it("PATCH 404 for an unknown comment", async () => {
    const ctx = await createBoardFixture();
    const res = await api
      .patch(commentUrl(ctx.board.id, ctx.column.id, ctx.ownerTask.id, randomUUID()))
      .set("Cookie", await authCookie(ctx.users.OWNER))
      .send({ content: "x" });
    expect(res.status).toBe(404);
  });

  // Documents the CURRENT route rules: MEMBER and ADMIN are author-only, only OWNER moderates.
  const DELETE_CASES: { name: string; actor: Role; author: Role; status: number }[] = [
    { name: "MEMBER deletes own", actor: "MEMBER", author: "MEMBER", status: 200 },
    { name: "MEMBER deletes OWNER's", actor: "MEMBER", author: "OWNER", status: 403 },
    { name: "ADMIN deletes own", actor: "ADMIN", author: "ADMIN", status: 200 },
    { name: "ADMIN deletes MEMBER's", actor: "ADMIN", author: "MEMBER", status: 403 },
    { name: "OWNER deletes MEMBER's (moderation)", actor: "OWNER", author: "MEMBER", status: 200 },
    { name: "VIEWER deletes own (pre-demotion comment)", actor: "VIEWER", author: "VIEWER", status: 403 },
  ];

  it.each(DELETE_CASES)("DELETE: $name -> $status", async ({ actor, author, status }) => {
    const ctx = await createBoardFixture();
    const c = await createComment(ctx.ownerTask, ctx.users[author]);
    const res = await api
      .delete(commentUrl(ctx.board.id, ctx.column.id, ctx.ownerTask.id, c.id))
      .set("Cookie", await authCookie(ctx.users[actor]));
    expect(res.status).toBe(status);
    expect(await prisma.comment.count({ where: { id: c.id } })).toBe(status === 200 ? 0 : 1);
  });

  it("DELETE writes a COMMENT_DELETED activity row", async () => {
    const ctx = await createBoardFixture();
    const c = await createComment(ctx.ownerTask, ctx.users.MEMBER);
    await api
      .delete(commentUrl(ctx.board.id, ctx.column.id, ctx.ownerTask.id, c.id))
      .set("Cookie", await authCookie(ctx.users.OWNER));
    const log = await prisma.activityLog.findFirst({
      where: { boardID: ctx.board.id, action: "COMMENT_DELETED" },
    });
    expect(log?.entityID).toBe(ctx.ownerTask.id);
  });

  it("[BUG] cannot delete a comment on a task that belongs to ANOTHER board (BOLA)", async () => {
    const a = await createBoardFixture(); // attacker is OWNER of board A
    const b = await createBoardFixture(); // victim board B
    const secret = await createComment(b.ownerTask, b.users.MEMBER, "private note");

    // Board A's URL prefix, board B's task + comment ids.
    const res = await api
      .delete(commentUrl(a.board.id, a.column.id, b.ownerTask.id, secret.id))
      .set("Cookie", await authCookie(a.users.OWNER));

    expect(res.status).toBe(404);
    expect(await prisma.comment.count({ where: { id: secret.id } })).toBe(1);
  });
});

/* ------------------------------------------------------------------ */
/* Assignees                                                           */
/* ------------------------------------------------------------------ */
describe("assignees", () => {
  it("POST assigns a board member, logs ASSIGNEE_ADDED and notifies them", async () => {
    const ctx = await createBoardFixture();
    const res = await api
      .post(assigneesUrl(ctx.board.id, ctx.column.id, ctx.ownerTask.id))
      .set("Cookie", await authCookie(ctx.users.OWNER))
      .send({ userID: ctx.users.MEMBER.id });

    expect(res.status).toBe(201);
    expect(res.body.data).toMatchObject({
      userID: ctx.users.MEMBER.id,
      taskID: ctx.ownerTask.id,
      user: { username: ctx.users.MEMBER.username },
    });

    const log = await prisma.activityLog.findFirst({
      where: { boardID: ctx.board.id, action: "ASSIGNEE_ADDED" },
    });
    expect(log?.entityTitle).toBe(ctx.users.MEMBER.username);

    await vi.waitFor(
      async () => {
        const n = await prisma.notification.findMany({
          where: { userID: ctx.users.MEMBER.id, type: "TASK_ASSIGNED" },
        });
        expect(n).toHaveLength(1);
      },
      { timeout: 5000, interval: 200 }
    );
  });

  it("POST 409 on a duplicate assignment (P2002)", async () => {
    const ctx = await createBoardFixture();
    await assignUser(ctx.ownerTask, ctx.users.MEMBER);
    const res = await api
      .post(assigneesUrl(ctx.board.id, ctx.column.id, ctx.ownerTask.id))
      .set("Cookie", await authCookie(ctx.users.OWNER))
      .send({ userID: ctx.users.MEMBER.id });
    expect(res.status).toBe(409);
  });

  it("POST 400 when the target user is not a member of this board", async () => {
    const ctx = await createBoardFixture();
    const res = await api
      .post(assigneesUrl(ctx.board.id, ctx.column.id, ctx.ownerTask.id))
      .set("Cookie", await authCookie(ctx.users.OWNER))
      .send({ userID: ctx.outsider.id });
    expect(res.status).toBe(400);
  });

  it("POST 404 for a user id that does not exist (OWNER)", async () => {
    const ctx = await createBoardFixture();
    const res = await api
      .post(assigneesUrl(ctx.board.id, ctx.column.id, ctx.ownerTask.id))
      .set("Cookie", await authCookie(ctx.users.OWNER))
      .send({ userID: randomUUID() });
    expect(res.status).toBe(404);
  });

  it("POST 400 for a non-uuid userID", async () => {
    const ctx = await createBoardFixture();
    const res = await api
      .post(assigneesUrl(ctx.board.id, ctx.column.id, ctx.ownerTask.id))
      .set("Cookie", await authCookie(ctx.users.OWNER))
      .send({ userID: "nope" });
    expect(res.status).toBe(400);
  });

  it("MEMBER cannot enumerate user IDs through task assignment", async () => {
    const ctx = await createBoardFixture();
    const cookie = await authCookie(ctx.users.MEMBER);
    const url = assigneesUrl(
      ctx.board.id,
      ctx.column.id,
      ctx.ownerTask.id
    );

    // Target user exists.
    const existingUserRes = await api
      .post(url)
      .set("Cookie", cookie)
      .send({ userID: ctx.users.OWNER.id });

    // Target user does not exist.
    const nonexistentUserRes = await api
      .post(url)
      .set("Cookie", cookie)
      .send({ userID: randomUUID() });

    expect(existingUserRes.status).toBe(403);
    expect(nonexistentUserRes.status).toBe(403);
  });

  it("DELETE unassigns (userID in the body) and logs ASSIGNEE_REMOVED", async () => {
    const ctx = await createBoardFixture();
    await assignUser(ctx.ownerTask, ctx.users.MEMBER);
    const res = await api
      .delete(assigneesUrl(ctx.board.id, ctx.column.id, ctx.ownerTask.id))
      .set("Cookie", await authCookie(ctx.users.ADMIN))
      .send({ userID: ctx.users.MEMBER.id });

    expect(res.status).toBe(200);
    expect(await prisma.taskAssignee.count()).toBe(0);
    const log = await prisma.activityLog.findFirst({
      where: { boardID: ctx.board.id, action: "ASSIGNEE_REMOVED" },
    });
    expect(log?.entityTitle).toBe(ctx.users.MEMBER.username);
  });

  it("DELETE 404 when that user is not assigned", async () => {
    const ctx = await createBoardFixture();
    const res = await api
      .delete(assigneesUrl(ctx.board.id, ctx.column.id, ctx.ownerTask.id))
      .set("Cookie", await authCookie(ctx.users.OWNER))
      .send({ userID: ctx.users.MEMBER.id });
    expect(res.status).toBe(404);
  });

  it("a MEMBER cannot unassign themselves (decided: ASSIGN_MEMBER is OWNER/ADMIN only)", async () => {
    const ctx = await createBoardFixture();
    await assignUser(ctx.ownerTask, ctx.users.MEMBER);
    const res = await api
      .delete(assigneesUrl(ctx.board.id, ctx.column.id, ctx.ownerTask.id))
      .set("Cookie", await authCookie(ctx.users.MEMBER))
      .send({ userID: ctx.users.MEMBER.id });
    expect(res.status).toBe(403);
    expect(await prisma.taskAssignee.count()).toBe(1);
  });
});
