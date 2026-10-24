import { describe, it, expect, afterEach } from "vitest";
import { randomUUID } from "node:crypto";
import { createBoardFixture } from "../helpers/boards";
import { actAs } from "../helpers/as";
import { setupCleanDb } from "../setup";
import {
  closeAllSockets,
  connectAs,
  joinBoard,
  waitForEvent,
} from "../helpers/socket";

setupCleanDb();
afterEach(closeAllSockets);

type Item = { id: string; order: number };

const diffs = (orders: number[]) => orders.slice(1).map((o, i) => o - orders[i]);

// ---------------------------------------------------------------- columns
async function columnSetup() {
  const ctx = await createBoardFixture();
  const owner = actAs(ctx.users.OWNER);
  const base = `/api/boards/${ctx.board.id}`;

  const mk = async (title: string): Promise<Item> =>
    (await owner.post(`${base}/columns`, { title })).body.data;
  const a = await mk("A");
  const b = await mk("B");
  const c = await mk("C");

  const list = async (): Promise<Item[]> =>
    (await owner.get(`${base}/columns`)).body.data;
  const mine = new Set([a.id, b.id, c.id]);
  const mineIds = async () => (await list()).filter((x) => mine.has(x.id)).map((x) => x.id);
  const reorder = (user: typeof ctx.users.OWNER, body: object) =>
    actAs(user).post(`${base}/columns/reorder`, body);

  return { ctx, owner, base, a, b, c, list, mineIds, reorder };
}

describe("POST /columns/reorder", () => {
  it("places the column between its neighbours", async () => {
    const { ctx, a, b, c, mineIds, reorder } = await columnSetup();
    const res = await reorder(ctx.users.OWNER, {
      columnId: c.id,
      prevOrder: a.order,
      nextOrder: b.order,
    });
    expect(res.status).toBe(200);
    expect(await mineIds()).toEqual([a.id, c.id, b.id]);
  });

  it("moves a column to the very start (prevOrder null)", async () => {
    const { ctx, c, list, reorder } = await columnSetup();
    const first = (await list())[0];
    const res = await reorder(ctx.users.OWNER, {
      columnId: c.id,
      prevOrder: null,
      nextOrder: first.order,
    });
    expect(res.status).toBe(200);
    expect((await list())[0].id).toBe(c.id);
  });

  it("moves a column to the very end (nextOrder null)", async () => {
    const { ctx, a, b, c, mineIds, reorder } = await columnSetup();
    const res = await reorder(ctx.users.OWNER, {
      columnId: a.id,
      prevOrder: c.order,
      nextOrder: null,
    });
    expect(res.status).toBe(200);
    expect(await mineIds()).toEqual([b.id, c.id, a.id]);
  });

  it("collision triggers a rebalance: unique, 1000-gap orders, and column:reordered still fires", async () => {
    const { ctx, owner, base, a, b, c, list, reorder } = await columnSetup();

    // squeeze B right next to A so there is no gap left
    const squeeze = await owner.patch(`${base}/columns/${b.id}`, {
      order: a.order + 1,
    });
    expect(squeeze.status).toBe(200);

    const s = await connectAs(ctx.users.OWNER);
    await joinBoard(s, ctx.board.id);
    const event = waitForEvent(s, "column:reordered");

    const res = await reorder(ctx.users.OWNER, {
      columnId: c.id,
      prevOrder: a.order,
      nextOrder: a.order + 1,
    });
    expect(res.status).toBe(200);
    await event; // regression: rebalance path used to emit nothing

    const orders = (await list()).map((x) => x.order);
    expect(new Set(orders).size).toBe(orders.length);
    expect(diffs(orders).every((d) => d === 1000)).toBe(true);
  });

  it("OWNER-path emits column:reordered with the new order", async () => {
    const { ctx, a, b, c, reorder } = await columnSetup();
    const s = await connectAs(ctx.users.OWNER);
    await joinBoard(s, ctx.board.id);
    const event = waitForEvent(s, "column:reordered");

    await reorder(ctx.users.OWNER, {
      columnId: c.id,
      prevOrder: a.order,
      nextOrder: b.order,
    });
    const payload = await event;
    expect(payload.boardID).toBe(ctx.board.id);
    expect(payload.columns.some((x) => x.id === c.id)).toBe(true);
  });

  it("ADMIN is allowed", async () => {
    const { ctx, a, b, c, reorder } = await columnSetup();
    const res = await reorder(ctx.users.ADMIN, {
      columnId: c.id,
      prevOrder: a.order,
      nextOrder: b.order,
    });
    expect(res.status).toBe(200);
  });

  it.each(["MEMBER", "VIEWER"] as const)("%s gets 403", async (role) => {
    const { ctx, a, b, c, reorder } = await columnSetup();
    const res = await reorder(ctx.users[role], {
      columnId: c.id,
      prevOrder: a.order,
      nextOrder: b.order,
    });
    expect(res.status).toBe(403);
  });

  it("404 for an unknown column id", async () => {
    const { ctx, reorder } = await columnSetup();
    const res = await reorder(ctx.users.OWNER, {
      columnId: randomUUID(),
      prevOrder: null,
      nextOrder: null,
    });
    expect(res.status).toBe(404);
  });

  it("404 for a column that belongs to ANOTHER board", async () => {
    const { ctx, reorder } = await columnSetup();
    const other = await actAs(ctx.outsider).post("/api/boards", { name: "Other" });
    const otherCol = await actAs(ctx.outsider).post(
      `/api/boards/${other.body.data.id}/columns`,
      { title: "Foreign" }
    );
    const res = await reorder(ctx.users.OWNER, {
      columnId: otherCol.body.data.id,
      prevOrder: null,
      nextOrder: null,
    });
    expect(res.status).toBe(404);
  });

  it("400 for a missing columnId and for non-numeric orders", async () => {
    const { ctx, c, reorder } = await columnSetup();
    const missing = await reorder(ctx.users.OWNER, { prevOrder: 1, nextOrder: 2 });
    expect(missing.status).toBe(400);
    const bad = await reorder(ctx.users.OWNER, {
      columnId: c.id,
      prevOrder: "x",
      nextOrder: 2,
    });
    expect(bad.status).toBe(400);
  });
});

// ------------------------------------------------------------------ tasks
async function taskSetup() {
  const ctx = await createBoardFixture();
  const owner = actAs(ctx.users.OWNER);
  const base = `/api/boards/${ctx.board.id}/columns/${ctx.column.id}/tasks`;

  const mk = async (title: string): Promise<Item> =>
    (await owner.post(base, { title })).body.data;
  const t1 = await mk("T1");
  const t2 = await mk("T2");
  const t3 = await mk("T3");

  const list = async (): Promise<Item[]> => (await owner.get(base)).body.data;
  const mine = new Set([t1.id, t2.id, t3.id]);
  const mineIds = async () => (await list()).filter((x) => mine.has(x.id)).map((x) => x.id);
  const reorder = (user: typeof ctx.users.OWNER, body: object) =>
    actAs(user).post(`${base}/reorder`, body);

  return { ctx, owner, base, t1, t2, t3, list, mineIds, reorder };
}

describe("POST /tasks/reorder", () => {
  it("places the task between its neighbours", async () => {
    const { ctx, t1, t2, t3, mineIds, reorder } = await taskSetup();
    const res = await reorder(ctx.users.OWNER, {
      taskId: t3.id,
      prevOrder: t1.order,
      nextOrder: t2.order,
    });
    expect(res.status).toBe(200);
    expect(await mineIds()).toEqual([t1.id, t3.id, t2.id]);
  });

  it("moves a task to the end (nextOrder null)", async () => {
    const { ctx, t1, t2, t3, mineIds, reorder } = await taskSetup();
    const res = await reorder(ctx.users.OWNER, {
      taskId: t1.id,
      prevOrder: t3.order,
      nextOrder: null,
    });
    expect(res.status).toBe(200);
    expect(await mineIds()).toEqual([t2.id, t3.id, t1.id]);
  });

  it("collision triggers a rebalance with 1000-gap orders and task:reordered still fires", async () => {
    const { ctx, owner, base, t1, t2, t3, list, reorder } = await taskSetup();

    const squeeze = await owner.patch(`${base}/${t2.id}`, { order: t1.order + 1 });
    expect(squeeze.status).toBe(200);

    const s = await connectAs(ctx.users.OWNER);
    await joinBoard(s, ctx.board.id);
    const event = waitForEvent(s, "task:reordered");

    const res = await reorder(ctx.users.OWNER, {
      taskId: t3.id,
      prevOrder: t1.order,
      nextOrder: t1.order + 1,
    });
    expect(res.status).toBe(200);
    await event;

    const orders = (await list()).map((x) => x.order);
    expect(diffs(orders).every((d) => d === 1000)).toBe(true);
  });

  it("emits task:reordered on the normal path", async () => {
    const { ctx, t1, t2, t3, reorder } = await taskSetup();
    const s = await connectAs(ctx.users.OWNER);
    await joinBoard(s, ctx.board.id);
    const event = waitForEvent(s, "task:reordered");

    await reorder(ctx.users.OWNER, {
      taskId: t3.id,
      prevOrder: t1.order,
      nextOrder: t2.order,
    });
    const payload = await event;
    expect(payload.columnID).toBe(ctx.column.id);
    expect(payload.tasks.some((x) => x.id === t3.id)).toBe(true);
  });

  it("VIEWER gets 403", async () => {
    const { ctx, t1, t2, t3, reorder } = await taskSetup();
    const res = await reorder(ctx.users.VIEWER, {
      taskId: t3.id,
      prevOrder: t1.order,
      nextOrder: t2.order,
    });
    expect(res.status).toBe(403);
  });

  it("404 for an unknown task id", async () => {
    const { ctx, reorder } = await taskSetup();
    const res = await reorder(ctx.users.OWNER, {
      taskId: randomUUID(),
      prevOrder: null,
      nextOrder: null,
    });
    expect(res.status).toBe(404);
  });

  it("404 when the task lives in a DIFFERENT column of the same board", async () => {
    const { ctx, owner, reorder } = await taskSetup();
    const col2 = await owner.post(`/api/boards/${ctx.board.id}/columns`, {
      title: "Second",
    });
    const foreign = await owner.post(
      `/api/boards/${ctx.board.id}/columns/${col2.body.data.id}/tasks`,
      { title: "Elsewhere" }
    );
    const res = await reorder(ctx.users.OWNER, {
      taskId: foreign.body.data.id,
      prevOrder: null,
      nextOrder: null,
    });
    expect(res.status).toBe(404);
  });

  it("400 for a missing taskId", async () => {
    const { ctx, reorder } = await taskSetup();
    const res = await reorder(ctx.users.OWNER, { prevOrder: 1, nextOrder: 2 });
    expect(res.status).toBe(400);
  });
});
