import { describe, it, expect, afterEach } from "vitest";
import { api } from "../helpers/http";
import { authCookie } from "../helpers/users";
import { createBoardFixture } from "../helpers/boards";
import { setupCleanDb } from "../setup";
import {
  closeAllSockets,
  collect,
  connectAs,
  connectError,
  joinBoard,
  sleep,
  waitForEvent,
} from "../helpers/socket";

setupCleanDb();
afterEach(closeAllSockets);

type U = Parameters<typeof authCookie>[0];

// Direct REST calls (no helper signatures needed). Assumes users expose .id/.username.

const post = async (path: string, user: U, body: object) =>
  api.post(path).set("Cookie", await authCookie(user)).send(body);
const ids = (list: { userID: string }[]) => list.map((u) => u.userID).sort();

describe("socket auth", () => {
  it("rejects a connection with no cookie", async () => {
    const err = await connectError();
    expect(err.message).toBe("Unauthorized");
  });

  it("rejects a connection with an invalid token", async () => {
    const err = await connectError("accessToken=not.a.jwt");
    expect(err.message).toBe("Unauthorized");
  });

  it("rejects a connection whose cookie has no accessToken", async () => {
    const err = await connectError("other=value");
    expect(err.message).toBe("Unauthorized");
  });

  it("accepts a connection with a valid token", async () => {
    const f = await createBoardFixture();
    const s = await connectAs(f.users.OWNER);
    expect(s.connected).toBe(true);
  });
});

describe("presence", () => {
  it("joinBoard ack returns the current presence list", async () => {
    const f = await createBoardFixture();
    const { OWNER, MEMBER } = f.users;
    const a = await connectAs(OWNER);
    const b = await connectAs(MEMBER);

    const ack1 = await joinBoard(a, f.board.id);
    expect(ack1).toEqual([{ userID: OWNER.id, username: OWNER.username }]);

    const ack2 = await joinBoard(b, f.board.id);
    expect(ids(ack2)).toEqual([OWNER.id, MEMBER.id].sort());
  });

  it("broadcasts presence:update to users already in the room", async () => {
    const f = await createBoardFixture();
    const { OWNER, MEMBER } = f.users;
    const a = await connectAs(OWNER);
    const b = await connectAs(MEMBER);
    await joinBoard(a, f.board.id);

    const update = waitForEvent(
      a,
      "presence:update",
      (p) => p.onlineUsers.length === 2
    );
    await joinBoard(b, f.board.id);

    const payload = await update;
    expect(payload.boardID).toBe(f.board.id);
    expect(ids(payload.onlineUsers)).toEqual([OWNER.id, MEMBER.id].sort());
  });

  it("disconnect removes the user from presence", async () => {
    const f = await createBoardFixture();
    const { OWNER, MEMBER, ADMIN } = f.users;
    const owner = await connectAs(OWNER);
    const member = await connectAs(MEMBER);
    await joinBoard(owner, f.board.id);
    await joinBoard(member, f.board.id);

    const gone = waitForEvent(
      owner,
      "presence:update",
      (p) => !p.onlineUsers.some((u) => u.userID === MEMBER.id)
    );
    member.disconnect();
    const update = await gone;
    expect(ids(update.onlineUsers)).toEqual([OWNER.id]);

    // a late joiner's ack must not include the disconnected user
    const admin = await connectAs(ADMIN);
    const ack = await joinBoard(admin, f.board.id);
    expect(ids(ack)).toEqual([OWNER.id, ADMIN.id].sort());
  });

  it("[BUG] closing one tab drops the user from presence while another tab is still connected", async () => {
    const f = await createBoardFixture();
    const { OWNER, MEMBER } = f.users;
    const observer = await connectAs(OWNER);
    const tab1 = await connectAs(MEMBER);
    const tab2 = await connectAs(MEMBER);
    await joinBoard(observer, f.board.id);
    await joinBoard(tab1, f.board.id);
    await joinBoard(tab2, f.board.id);

    const gone = waitForEvent(
      observer,
      "presence:update",
      (p) => !p.onlineUsers.some((u) => u.userID === MEMBER.id)
    );
    tab1.disconnect();
    await gone; // current behaviour: user vanishes from presence...

    expect(tab2.connected).toBe(true); // ...though tab2 is still connected
    // After the fix (per-user socket count), the wait above should time out instead.
  });
});

describe("room events", () => {
  it("delivers REST-triggered events to the board room only", async () => {
    const f = await createBoardFixture();
    const { OWNER } = f.users;

    // second board owned by the outsider
    const otherRes = await post("/api/boards", f.outsider, { name: "Other board" });
    expect(otherRes.status).toBeLessThan(300);
    const otherBoardId: string = otherRes.body.data.id;

    const x = await connectAs(OWNER); // in board A
    const y = await connectAs(f.outsider); // in board B
    await joinBoard(x, f.board.id);
    await joinBoard(y, otherBoardId);

    const yColumns = collect(y, "column:created");
    const yTasks = collect(y, "task:created");

    // column:created
    const colEvent = waitForEvent(x, "column:created");
    const colRes = await post(`/api/boards/${f.board.id}/columns`, OWNER, {
      title: "Realtime column",
    });
    expect(colRes.status).toBeLessThan(300);
    const colPayload = await colEvent;
    expect(colPayload.boardID).toBe(f.board.id);
    expect(colPayload.column.title).toBe("Realtime column");

    // task:created
    const taskEvent = waitForEvent(x, "task:created");
    const taskRes = await post(
      `/api/boards/${f.board.id}/columns/${f.column.id}/tasks`,
      OWNER,
      { title: "Realtime task" }
    );
    expect(taskRes.status).toBeLessThan(300);
    const taskPayload = await taskEvent;
    expect(taskPayload.boardID).toBe(f.board.id);
    expect(taskPayload.columnID).toBe(f.column.id);
    expect(taskPayload.task.title).toBe("Realtime task");

    // X got both, so the emits already happened; give Y a moment, then assert silence
    await sleep(300);
    expect(yColumns).toHaveLength(0);
    expect(yTasks).toHaveLength(0);
  });

  it("[BUG] a non-member can join a board room, see its presence and receive its events", async () => {
    const f = await createBoardFixture();
    const { OWNER } = f.users;
    const owner = await connectAs(OWNER);
    const intruder = await connectAs(f.outsider);
    await joinBoard(owner, f.board.id);

    // joinBoard has no membership check: intruder gets the presence list...
    const ack = await joinBoard(intruder, f.board.id);
    expect(ack.map((u) => u.userID)).toContain(OWNER.id);

    // ...and live events
    const leaked = waitForEvent(intruder, "task:created");
    const res = await post(
      `/api/boards/${f.board.id}/columns/${f.column.id}/tasks`,
      OWNER,
      { title: "Secret task" }
    );
    expect(res.status).toBeLessThan(300);
    const payload = await leaked;
    expect(payload.task.title).toBe("Secret task");
    // After the fix: ack is empty/rejected and this wait should time out.
  });
});

describe("notifications", () => {
  it("assignee receives notification:new in their user room; the actor does not", async () => {
    const f = await createBoardFixture();
    const { OWNER, MEMBER } = f.users;

    // Neither socket joins a board: delivery is via the user room alone.
    const member = await connectAs(MEMBER);
    const owner = await connectAs(OWNER);
    const ownerNotifs = collect(owner, "notification:new");

    const incoming = waitForEvent(
      member,
      "notification:new",
      (p) => p.notification.type === "TASK_ASSIGNED",
      5000
    );
    const res = await post(
      `/api/boards/${f.board.id}/columns/${f.column.id}/tasks/${f.ownerTask.id}/assignees`,
      OWNER,
      { userID: MEMBER.id }
    );
    expect(res.status).toBeLessThan(300);

    const { notification } = await incoming;
    expect(notification.type).toBe("TASK_ASSIGNED");
    expect(notification.entityID).toBe(f.ownerTask.id);

    await sleep(300);
    expect(ownerNotifs).toHaveLength(0);
  });
});
