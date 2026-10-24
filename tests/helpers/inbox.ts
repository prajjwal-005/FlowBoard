import { expect, vi } from "vitest";
import { actAs } from "./as";
import { authCookie } from "./users";

type U = Parameters<typeof authCookie>[0];

export type InboxItem = {
  id: string;
  type: string;
  isRead: boolean;
  boardID: string;
  entityID: string;
};

/** GET /api/notifications -> data.notifications (shape per Pass 12). */
export async function inbox(user: U): Promise<InboxItem[]> {
  const res = await actAs(user).get("/api/notifications");
  expect(res.status).toBe(200);
  return res.body.data.notifications;
}

/** Notifications are fire-and-forget in routes, so poll until one of `type` shows up. */
export function waitForNotification(user: U, type: string): Promise<InboxItem> {
  return vi.waitFor(
    async () => {
      const hit = (await inbox(user)).find((n) => n.type === type);
      expect(hit).toBeDefined();
      return hit!;
    },
    { timeout: 5000, interval: 200 }
  );
}
