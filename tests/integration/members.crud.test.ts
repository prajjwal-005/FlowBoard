import { describe, it, expect } from "vitest";
import { createBoardFixture } from "../helpers/boards";
import { actAs } from "../helpers/as";
import { inbox, waitForNotification } from "../helpers/inbox";
import { setupCleanDb } from "../setup";

setupCleanDb();

const membersPath = (boardId: string) => `/api/boards/${boardId}/members`;
const boardPath = (boardId: string) => `/api/boards/${boardId}`;

describe("GET /members", () => {
  it("any member (VIEWER) lists every member with role and user info", async () => {
    const ctx = await createBoardFixture();
    const res = await actAs(ctx.users.VIEWER).get(membersPath(ctx.board.id));
    expect(res.status).toBe(200);

    const list = res.body.data;
    expect(list.map((m: { role: string }) => m.role).sort()).toEqual(
      ["ADMIN", "MEMBER", "OWNER", "VIEWER"]
    );
    for (const m of list) {
      expect(m.userID).toBeTruthy();
      expect(typeof m.user.username).toBe("string");
      expect("avatarUrl" in m.user).toBe(true);
    }
  });

  it("a non-member is rejected", async () => {
    const ctx = await createBoardFixture();
    const res = await actAs(ctx.outsider).get(membersPath(ctx.board.id));
    expect([403, 404]).toContain(res.status); // tighten once you see the actual code
  });
});

describe("POST /members", () => {
  it("OWNER adds a user by username as MEMBER and they gain board access", async () => {
    const ctx = await createBoardFixture();
    const res = await actAs(ctx.users.OWNER).post(membersPath(ctx.board.id), {
      identifier: ctx.outsider.username,
    });
    expect(res.status).toBeLessThan(300);
    expect(res.body.data.role).toBe("MEMBER");
    expect(res.body.data.userID).toBe(ctx.outsider.id);

    const view = await actAs(ctx.outsider).get(boardPath(ctx.board.id));
    expect(view.status).toBe(200);
  });

  it("ADMIN can add a member by email", async () => {
    const ctx = await createBoardFixture();
    const res = await actAs(ctx.users.ADMIN).post(membersPath(ctx.board.id), {
      identifier: ctx.outsider.email,
    });
    expect(res.status).toBeLessThan(300);
    expect(res.body.data.role).toBe("MEMBER");
  });

  it.each(["MEMBER", "VIEWER"] as const)("%s gets 403", async (role) => {
    const ctx = await createBoardFixture();
    const res = await actAs(ctx.users[role]).post(membersPath(ctx.board.id), {
      identifier: ctx.outsider.username,
    });
    expect(res.status).toBe(403);
  });

  it("404 for an identifier that matches no user", async () => {
    const ctx = await createBoardFixture();
    const res = await actAs(ctx.users.OWNER).post(membersPath(ctx.board.id), {
      identifier: "nosuchuser",
    });
    expect(res.status).toBe(404);
  });

  it("400 for a malformed identifier", async () => {
    const ctx = await createBoardFixture();
    const res = await actAs(ctx.users.OWNER).post(membersPath(ctx.board.id), {
      identifier: "!!",
    });
    expect(res.status).toBe(400);
  });

  it("rejects adding someone who is already a member", async () => {
    const ctx = await createBoardFixture();
    const res = await actAs(ctx.users.OWNER).post(membersPath(ctx.board.id), {
      identifier: ctx.users.MEMBER.username,
    });
    expect([400, 409]).toContain(res.status);
  });

  it("notifies only the new member (MEMBER_ADDED)", async () => {
    const ctx = await createBoardFixture();
    await actAs(ctx.users.OWNER).post(membersPath(ctx.board.id), {
      identifier: ctx.outsider.username,
    });
    await waitForNotification(ctx.outsider, "MEMBER_ADDED");
    const ownerTypes = (await inbox(ctx.users.OWNER)).map((n) => n.type);
    expect(ownerTypes).not.toContain("MEMBER_ADDED");
  });
});

describe("PATCH /members (change role)", () => {
  it("OWNER promotes MEMBER to ADMIN; the new role applies immediately", async () => {
    const ctx = await createBoardFixture();
    const cols = `/api/boards/${ctx.board.id}/columns`;

    const before = await actAs(ctx.users.MEMBER).post(cols, { title: "x" });
    expect(before.status).toBe(403);

    const res = await actAs(ctx.users.OWNER).patch(membersPath(ctx.board.id), {
      identifier: ctx.users.MEMBER.username,
      role: "ADMIN",
    });
    expect(res.status).toBe(200);
    expect(res.body.data.role).toBe("ADMIN");

    const after = await actAs(ctx.users.MEMBER).post(cols, { title: "x" });
    expect(after.status).toBeLessThan(300);
  });

  it("notifies the affected member (ROLE_CHANGED)", async () => {
    const ctx = await createBoardFixture();
    await actAs(ctx.users.OWNER).patch(membersPath(ctx.board.id), {
      identifier: ctx.users.MEMBER.username,
      role: "VIEWER",
    });
    await waitForNotification(ctx.users.MEMBER, "ROLE_CHANGED");
  });

  it.each(["ADMIN", "MEMBER", "VIEWER"] as const)(
    "%s cannot change roles (OWNER only) -> 403",
    async (role) => {
      const ctx = await createBoardFixture();
      const res = await actAs(ctx.users[role]).patch(membersPath(ctx.board.id), {
        identifier: ctx.users.VIEWER.username,
        role: "MEMBER",
      });
      expect(res.status).toBe(403);
    }
  );

  it("cannot grant OWNER", async () => {
    const ctx = await createBoardFixture();
    const res = await actAs(ctx.users.OWNER).patch(membersPath(ctx.board.id), {
      identifier: ctx.users.MEMBER.username,
      role: "OWNER",
    });
    expect(res.status).toBe(400);
  });

  it("cannot change the OWNER's own role", async () => {
    const ctx = await createBoardFixture();
    const res = await actAs(ctx.users.OWNER).patch(membersPath(ctx.board.id), {
      identifier: ctx.users.OWNER.username,
      role: "ADMIN",
    });
    expect([400, 403]).toContain(res.status);
  });

  it("404 for an identifier that is not a board member", async () => {
    const ctx = await createBoardFixture();
    const res = await actAs(ctx.users.OWNER).patch(membersPath(ctx.board.id), {
      identifier: ctx.outsider.username,
      role: "ADMIN",
    });
    expect(res.status).toBe(404);
  });
});

describe("DELETE /members", () => {
  it("OWNER removes a MEMBER: they lose access, vanish from the list, get MEMBER_REMOVED", async () => {
    const ctx = await createBoardFixture();
    const res = await actAs(ctx.users.OWNER).delete(membersPath(ctx.board.id), {
      identifier: ctx.users.MEMBER.username,
    });
    expect(res.status).toBe(200);

    const list = await actAs(ctx.users.OWNER).get(membersPath(ctx.board.id));
    expect(list.body.data.map((m: { userID: string }) => m.userID)).not.toContain(
      ctx.users.MEMBER.id
    );

    const view = await actAs(ctx.users.MEMBER).get(boardPath(ctx.board.id));
    expect([403, 404]).toContain(view.status);

    await waitForNotification(ctx.users.MEMBER, "MEMBER_REMOVED");
  });

  it("ADMIN can remove a MEMBER", async () => {
    const ctx = await createBoardFixture();
    const res = await actAs(ctx.users.ADMIN).delete(membersPath(ctx.board.id), {
      identifier: ctx.users.MEMBER.username,
    });
    expect(res.status).toBe(200);
  });

  it.each(["MEMBER", "VIEWER"] as const)("%s gets 403", async (role) => {
    const ctx = await createBoardFixture();
    const res = await actAs(ctx.users[role]).delete(membersPath(ctx.board.id), {
      identifier: ctx.users.VIEWER.username,
    });
    expect(res.status).toBe(403);
  });

  it("cannot remove yourself", async () => {
    const ctx = await createBoardFixture();
    const res = await actAs(ctx.users.ADMIN).delete(membersPath(ctx.board.id), {
      identifier: ctx.users.ADMIN.username,
    });
    expect([400, 403, 409]).toContain(res.status);
  });

  it("cannot remove the OWNER", async () => {
    const ctx = await createBoardFixture();
    const res = await actAs(ctx.users.ADMIN).delete(membersPath(ctx.board.id), {
      identifier: ctx.users.OWNER.username,
    });
    expect([400, 403, 409]).toContain(res.status);
  });

  it("404 when the target is not a member", async () => {
    const ctx = await createBoardFixture();
    const res = await actAs(ctx.users.OWNER).delete(membersPath(ctx.board.id), {
      identifier: ctx.outsider.username,
    });
    expect([400, 404]).toContain(res.status);
  });
});
