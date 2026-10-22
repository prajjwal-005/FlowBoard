import { describe, it, expect } from "vitest";
import type { Test } from "supertest";
import { api } from "../helpers/http";
import { setupCleanDb } from "../setup";
import { authCookie } from "../helpers/users";
import { createBoardFixture, createSubtask, type Role } from "../helpers/boards";
import * as u from "../helpers/paths";

setupCleanDb();

type Ctx = Awaited<ReturnType<typeof createBoardFixture>>;
type Actor = Role | "OUTSIDER";
type Cookie = string[] | null;

const ACTORS: Actor[] = ["OWNER", "ADMIN", "MEMBER", "VIEWER", "OUTSIDER"];
const ALL_MEMBERS: Actor[] = ["OWNER", "ADMIN", "MEMBER", "VIEWER"];
const STAFF: Actor[] = ["OWNER", "ADMIN"];
const CONTRIBUTORS: Actor[] = ["OWNER", "ADMIN", "MEMBER"];

const auth = (req: Test, cookie: Cookie) => (cookie ? req.set("Cookie", cookie) : req);

interface Endpoint {
  name: string;
  allowed: Actor[]; // everyone else must get 403
  okStatus: number;
  call: (x: Ctx, c: Cookie) => PromiseLike<{ status: number }>;
}

const ENDPOINTS: Endpoint[] = [
  {
    name: "GET board",
    allowed: ALL_MEMBERS,
    okStatus: 200,
    call: (x, c) => auth(api.get(u.boardUrl(x.board.id)), c),
  },
  {
    name: "PATCH board",
    allowed: STAFF,
    okStatus: 200,
    call: (x, c) => auth(api.patch(u.boardUrl(x.board.id)), c).send({ name: "Renamed" }),
  },
  {
    name: "DELETE board",
    allowed: ["OWNER"],
    okStatus: 200,
    call: (x, c) => auth(api.delete(u.boardUrl(x.board.id)), c),
  },
  {
    name: "POST column",
    allowed: STAFF,
    okStatus: 201,
    call: (x, c) => auth(api.post(u.columnsUrl(x.board.id)), c).send({ title: "Doing" }),
  },
  {
    name: "PATCH column",
    allowed: STAFF,
    okStatus: 200,
    call: (x, c) =>
      auth(api.patch(u.columnUrl(x.board.id, x.column.id)), c).send({ title: "Renamed" }),
  },
  {
    name: "DELETE column",
    allowed: STAFF,
    okStatus: 200,
    call: (x, c) => auth(api.delete(u.columnUrl(x.board.id, x.column.id)), c),
  },
  {
    name: "POST task",
    allowed: CONTRIBUTORS,
    okStatus: 201,
    call: (x, c) =>
      auth(api.post(u.tasksUrl(x.board.id, x.column.id)), c).send({ title: "New task" }),
  },
  {
    name: "PATCH task created by OWNER (D6: MEMBER blocked)",
    allowed: STAFF,
    okStatus: 200,
    call: (x, c) =>
      auth(api.patch(u.taskUrl(x.board.id, x.column.id, x.ownerTask.id)), c).send({
        title: "Edited",
      }),
  },
  {
    name: "PATCH task created by MEMBER (D6: MEMBER allowed)",
    allowed: CONTRIBUTORS,
    okStatus: 200,
    call: (x, c) =>
      auth(api.patch(u.taskUrl(x.board.id, x.column.id, x.memberTask.id)), c).send({
        title: "Edited",
      }),
  },
  {
    name: "DELETE task (D3: MEMBER blocked)",
    allowed: STAFF,
    okStatus: 200,
    call: (x, c) =>
      auth(api.delete(u.taskUrl(x.board.id, x.column.id, x.ownerTask.id)), c),
  },
  {
    name: "POST assignee",
    allowed: STAFF,
    okStatus: 201,
    call: (x, c) =>
      auth(api.post(u.assigneesUrl(x.board.id, x.column.id, x.ownerTask.id)), c).send({
        userID: x.users.MEMBER.id,
      }),
  },
  {
    name: "POST subtask on OWNER's task (D7: MEMBER allowed)",
    allowed: CONTRIBUTORS,
    okStatus: 201,
    call: (x, c) =>
      auth(api.post(u.subtasksUrl(x.board.id, x.column.id, x.ownerTask.id)), c).send({
        title: "Sub",
      }),
  },
  {
    name: "PATCH subtask on OWNER's task (D7: MEMBER blocked)",
    allowed: STAFF,
    okStatus: 200,
    call: async (x, c) => {
      const s = await createSubtask(x.ownerTask, x.users.OWNER);
      return auth(
        api.patch(u.subtaskUrl(x.board.id, x.column.id, x.ownerTask.id, s.id)),
        c
      ).send({ isCompleted: true });
    },
  },
  {
    name: "DELETE subtask on OWNER's task (D7: MEMBER blocked)",
    allowed: STAFF,
    okStatus: 200,
    call: async (x, c) => {
      const s = await createSubtask(x.ownerTask, x.users.OWNER);
      return auth(
        api.delete(u.subtaskUrl(x.board.id, x.column.id, x.ownerTask.id, s.id)),
        c
      );
    },
  },
  {
    name: "POST comment",
    allowed: CONTRIBUTORS,
    okStatus: 201,
    call: (x, c) =>
      auth(api.post(u.commentsUrl(x.board.id, x.column.id, x.ownerTask.id)), c).send({
        content: "hello",
      }),
  },
];

describe("RBAC over HTTP: role x endpoint", () => {
  describe.each(ENDPOINTS)("$name", (ep) => {
    it.each(ACTORS)("%s", async (actor) => {
      const ctx = await createBoardFixture();
      const user = actor === "OUTSIDER" ? ctx.outsider : ctx.users[actor];
      const res = await ep.call(ctx, await authCookie(user));
      const expected = ep.allowed.includes(actor) ? ep.okStatus : 403;
      expect(res.status).toBe(expected);
    });
  });

  it("every endpoint returns 401 without a cookie", async () => {
    const ctx = await createBoardFixture(); // 401 never mutates, so one fixture is enough
    for (const ep of ENDPOINTS) {
      const res = await ep.call(ctx, null);
      expect(res.status, ep.name).toBe(401);
    }
  });
});
