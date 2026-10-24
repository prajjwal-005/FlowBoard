import { describe, it, expect } from "vitest";
import { randomUUID } from "node:crypto";
import { api } from "../helpers/http";
import { createBoardFixture } from "../helpers/boards";
import { actAs } from "../helpers/as";
import { inbox, waitForNotification } from "../helpers/inbox";
import { sleep } from "../helpers/socket";
import { setupCleanDb } from "../setup";

setupCleanDb();

async function assignMember() {
  const ctx = await createBoardFixture();
  const url = `/api/boards/${ctx.board.id}/columns/${ctx.column.id}/tasks/${ctx.ownerTask.id}/assignees`;
  const res = await actAs(ctx.users.OWNER).post(url, { userID: ctx.users.MEMBER.id });
  expect(res.status).toBeLessThan(300);
  return { ctx, url };
}

describe("GET /api/notifications", () => {
  it("401 without a session", async () => {
    const res = await api.get("/api/notifications");
    expect(res.status).toBe(401);
  });

  it("returns only the caller's notifications, unread, with entity info", async () => {
    const { ctx } = await assignMember();
    const hit = await waitForNotification(ctx.users.MEMBER, "TASK_ASSIGNED");
    expect(hit.isRead).toBe(false);
    expect(hit.boardID).toBe(ctx.board.id);
    expect(hit.entityID).toBe(ctx.ownerTask.id);

    // actor and bystanders see nothing from this action
    expect(await inbox(ctx.users.OWNER)).toHaveLength(0);
    expect(await inbox(ctx.users.VIEWER)).toHaveLength(0);
  });

  it("the actor is never notified of their own action", async () => {
    const ctx = await createBoardFixture();
    const url = `/api/boards/${ctx.board.id}/columns/${ctx.column.id}/tasks/${ctx.ownerTask.id}/assignees`;
    const owner = actAs(ctx.users.OWNER);

    await owner.post(url, { userID: ctx.users.OWNER.id }); // self-assign
    await owner.post(url, { userID: ctx.users.MEMBER.id }); // positive control

    await waitForNotification(ctx.users.MEMBER, "TASK_ASSIGNED");
    await sleep(300);
    expect(await inbox(ctx.users.OWNER)).toHaveLength(0);
  });
});

describe("PATCH /api/notifications/[id] (mark read)", () => {
  it("marks the caller's notification as read and it stays read", async () => {
    const { ctx } = await assignMember();
    const hit = await waitForNotification(ctx.users.MEMBER, "TASK_ASSIGNED");

    // body shape is a guess (route may ignore it): adjust if you get 400
    const res = await actAs(ctx.users.MEMBER).patch(`/api/notifications/${hit.id}`, {
      isRead: true,
    });
    expect(res.status).toBe(200);

    const after = (await inbox(ctx.users.MEMBER)).find((n) => n.id === hit.id);
    expect(after?.isRead).toBe(true);
  });

  it("404 when the notification belongs to another user, and it stays unread", async () => {
    const { ctx } = await assignMember();
    const hit = await waitForNotification(ctx.users.MEMBER, "TASK_ASSIGNED");

    const res = await actAs(ctx.users.OWNER).patch(`/api/notifications/${hit.id}`, {
      isRead: true,
    });
    expect(res.status).toBe(404);

    const still = (await inbox(ctx.users.MEMBER)).find((n) => n.id === hit.id);
    expect(still?.isRead).toBe(false);
  });

  it("404 for an unknown id", async () => {
    const ctx = await createBoardFixture();
    const res = await actAs(ctx.users.OWNER).patch(`/api/notifications/${randomUUID()}`, {
      isRead: true,
    });
    expect(res.status).toBe(404);
  });

  it("401 without a session", async () => {
    const res = await api.patch(`/api/notifications/${randomUUID()}`).send({ isRead: true });
    expect(res.status).toBe(401);
  });
});
