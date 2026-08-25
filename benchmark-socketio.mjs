#!/usr/bin/env node
// Opens N authenticated socket connections, joins a board room on all of them,
// triggers one real task PATCH over HTTP, and times how long each socket takes
// to receive the resulting task:updated broadcast.
//
// Requires: npm i socket.io-client (in whatever dir you run this from)
//
// Usage:
//   EMAIL=you@example.com PASSWORD=yourpassword \
//   BOARD_ID=... COLUMN_ID=... TASK_ID=... N=100 \
//   node benchmark-socketio.mjs

import { io } from "socket.io-client";

const API = process.env.API_BASE ?? "http://localhost:3000";
const EMAIL = process.env.EMAIL;
const PASSWORD = process.env.PASSWORD;
const BOARD_ID = process.env.BOARD_ID;
const COLUMN_ID = process.env.COLUMN_ID;
const TASK_ID = process.env.TASK_ID;
const N = Number(process.env.N ?? 50);

if (!EMAIL || !PASSWORD || !BOARD_ID || !COLUMN_ID || !TASK_ID) {
  console.error("Set EMAIL, PASSWORD, BOARD_ID, COLUMN_ID, TASK_ID env vars.");
  process.exit(1);
}

function extractCookieHeader(res) {
  const raw = res.headers.getSetCookie
    ? res.headers.getSetCookie()
    : [res.headers.get("set-cookie")].filter(Boolean);
  return raw.map((c) => c.split(";")[0]).join("; ");
}

// 1. Log in once, reuse the cookie for every simulated connection.
const loginRes = await fetch(`${API}/api/login`, {
  method: "POST",
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify({ identifier: EMAIL, password: PASSWORD }),
});
const cookie = extractCookieHeader(loginRes);
if (!cookie) throw new Error("Login failed — no Set-Cookie header returned.");

// 2. Open N socket connections (simulates N tabs/clients on the same account).
const sockets = [];
let connected = 0;
let dropped = 0;

for (let i = 0; i < N; i++) {
  const socket = io(API, { autoConnect: false, extraHeaders: { cookie } });
  socket.on("connect", () => {
    connected++;
    if (i === 0) console.log("Socket 0 id:", socket.id);
  });
  socket.on("connect_error", (err) => {
    dropped++;
    if (i === 0) console.log("Socket 0 connect_error:", err.message);
  });
  if (i === 0) {
    socket.onAny((event, ...args) => console.log("Socket 0 received event:", event, JSON.stringify(args)));
  }
  sockets.push(socket);
}

sockets.forEach((s) => s.connect());
await new Promise((r) => setTimeout(r, 2000)); // let connections settle

console.log(`Connected: ${connected}/${N}, dropped: ${dropped}`);

// 3. All join the board room via ack (matches the app's ack-based join pattern).
const joinAcks = await Promise.all(
  sockets.map(
    (s, i) =>
      new Promise((resolve) => {
        if (!s.connected) return resolve(null);
        s.emit("joinBoard", BOARD_ID, (ack) => resolve(ack));
      })
  )
);
console.log("Sample join ack (socket 0):", JSON.stringify(joinAcks[0]));

// 4. Each socket times its own receipt of task:updated.
const receiveTimes = [];
let start;
sockets.forEach((s) => {
  s.on("task:updated", () => {
    if (start) receiveTimes.push(performance.now() - start);
  });
});

// 5. Trigger one real mutation over HTTP — this is what fires the server-side emit.
start = performance.now();
const patchRes = await fetch(`${API}/api/boards/${BOARD_ID}/columns/${COLUMN_ID}/tasks/${TASK_ID}`, {
  method: "PATCH",
  headers: { "Content-Type": "application/json", cookie },
  body: JSON.stringify({ title: `bench-${Date.now()}` }),
});
console.log("PATCH status:", patchRes.status);
console.log("PATCH body:", await patchRes.clone().text());

await new Promise((r) => setTimeout(r, 3000)); // let broadcasts land

receiveTimes.sort((a, b) => a - b);
const median = receiveTimes[Math.floor(receiveTimes.length / 2)] ?? null;
const max = receiveTimes.at(-1) ?? null;

console.log(`Received by: ${receiveTimes.length}/${connected} sockets`);
console.log(`Median broadcast latency: ${median?.toFixed(1)}ms`);
console.log(`Max broadcast latency: ${max?.toFixed(1)}ms`);

sockets.forEach((s) => s.disconnect());
