import { io, type Socket } from "socket.io-client";
import type {
  ServerToClientEvents,
  ClientToServerEvents,
} from "../../src/types/socket";
import { authCookie } from "./users";

export const SOCKET_URL = "http://127.0.0.1:3000";

export type TestSocket = Socket<ServerToClientEvents, ClientToServerEvents>;
export type PresenceList = { userID: string; username: string }[];
type Payload<E extends keyof ServerToClientEvents> = Parameters<
  ServerToClientEvents[E]
>[0];

// Loosely-typed view used only for generic on/off plumbing.
type RawEmitter<P> = {
  on(event: string, handler: (payload: P) => void): void;
  off(event: string, handler: (payload: P) => void): void;
};

const opened: TestSocket[] = [];

function makeSocket(cookie?: string): TestSocket {
  const s: TestSocket = io(SOCKET_URL, {
    transports: ["websocket"],
    reconnection: false,
    autoConnect: false,
    extraHeaders: cookie ? { cookie } : undefined,
  });
  opened.push(s);
  return s;
}

/** Connect expecting the handshake to be rejected; resolves with the error. */
export function connectError(cookie?: string): Promise<Error> {
  const s = makeSocket(cookie);
  return new Promise((resolve, reject) => {
    s.once("connect", () => reject(new Error("connected, expected rejection")));
    s.once("connect_error", resolve);
    s.connect();
  });
}

/** Connect with a valid access-token cookie for `user`. */
export async function connectAs(user: Parameters<typeof authCookie>[0]): Promise<TestSocket> {
  const cookie = (await authCookie(user)).join("; ");
  const s = makeSocket(cookie);
  return new Promise((resolve, reject) => {
    s.once("connect", () => resolve(s));
    s.once("connect_error", reject);
    s.connect();
  });
}

/** Emit joinBoard and resolve with the ack'd presence list. */
export function joinBoard(s: TestSocket, boardID: string): Promise<PresenceList> {
  return new Promise((resolve) => s.emit("joinBoard", boardID, resolve));
}

/** Resolve with the first matching payload. Register BEFORE triggering the action. */
export function waitForEvent<E extends keyof ServerToClientEvents>(
  s: TestSocket,
  event: E,
  predicate: (p: Payload<E>) => boolean = () => true,
  timeoutMs = 3000
): Promise<Payload<E>> {
  const sock = s as unknown as RawEmitter<Payload<E>>;
  return new Promise((resolve, reject) => {
    const handler = (p: Payload<E>) => {
      if (!predicate(p)) return;
      clearTimeout(timer);
      sock.off(event, handler);
      resolve(p);
    };
    const timer = setTimeout(() => {
      sock.off(event, handler);
      reject(new Error(`timed out waiting for "${event}"`));
    }, timeoutMs);
    sock.on(event, handler);
  });
}

/** Record every payload of `event` into the returned array (for "did NOT receive" checks). */
export function collect<E extends keyof ServerToClientEvents>(
  s: TestSocket,
  event: E
): Payload<E>[] {
  const got: Payload<E>[] = [];
  (s as unknown as RawEmitter<Payload<E>>).on(event, (p) => got.push(p));
  return got;
}

export const sleep = (ms: number) =>
  new Promise<void>((resolve) => setTimeout(resolve, ms));

/** Call in afterEach. Presence lives in the server process, so always disconnect. */
export function closeAllSockets() {
  for (const s of opened) s.disconnect();
  opened.length = 0;
}
