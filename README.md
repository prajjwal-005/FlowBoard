# FlowBoard

**FlowBoard** is a full-stack, real-time collaborative Kanban platform built to demonstrate production-grade patterns across authentication, role-based access control, real-time systems, and AI integration.

Live demo: _add link_
Video walkthrough: _add link_

---

## Overview

FlowBoard lets teams organize work on boards with columns and tasks, similar to Trello/Linear, with:

- Real-time sync across all connected clients (no refresh needed)
- Fine-grained role-based permissions (Owner / Admin / Member / Viewer)
- AI-assisted task creation (subtask breakdown, description expansion, board summaries)
- Live presence, notifications, and activity history
- Drag-and-drop task/column reordering with optimistic UI

Built as a portfolio project to go deep on things a typical CRUD app doesn't force you to learn — WebSocket architecture, race conditions, rate limiting, and RBAC enforcement at the data layer, not just the UI.

---

## Features

- **Auth** — Custom JWT (access + refresh token rotation), httpOnly cookies, single-session-per-user enforcement
- **RBAC** — 4-tier role system enforced at both the API route and record-ownership level (e.g. a Member can only edit tasks they created)
- **Real-time collaboration** — Socket.IO-powered live updates for tasks, columns, comments, subtasks, and assignees across all viewers of a board
- **Presence** — See who else is currently viewing a board
- **Notifications** — In-app notifications for assignments, mentions, and role changes, delivered live via sockets and persisted for later viewing
- **Drag & drop** — Reorder tasks within/across columns and reorder columns, with optimistic updates and server-side rebalancing
- **AI features** — OpenAI-powered subtask suggestions, task description expansion, and AI-generated board summaries
- **Activity log** — Full audit trail per board, denormalized so history survives entity/member deletion
- **Rate limiting** — Redis-backed atomic sliding-window rate limiter (Lua scripts) protecting auth and AI endpoints
- **Dark mode** — Full light/dark theming via a custom design token system

---

## Tech Stack

| Layer | Technology |
|---|---|
| Framework | Next.js (App Router) + TypeScript |
| Styling | Tailwind CSS v4, custom design token system (shadcn/ui) |
| Database | PostgreSQL, Prisma ORM |
| Real-time | Socket.IO on a custom Node server |
| Caching / Rate Limiting | Redis (ioredis) |
| Server State | TanStack Query |
| Client State | Zustand |
| Drag & Drop | dnd-kit |
| Auth | Custom JWT (`jose`), bcrypt, httpOnly cookies |
| AI | OpenAI API |
| Media | Cloudinary |
| Infra | Docker (multi-stage build), GitHub Actions CI |

---

## Architecture

**Request flow:** `Route Handler → Zod validation → Prisma → Activity Log → Socket.IO Emitter → Connected Clients`

All mutations go through standard REST API routes. Socket.IO never writes to the database directly — it only broadcasts *after* a mutation succeeds. This keeps the real-time layer additive rather than a second source of truth.

**Key architectural decisions:**
- Single nested TanStack Query cache per board (`boardKeys.detail(id)`) instead of granular per-entity keys, since the board GET endpoint returns the full nested tree in one request
- Idempotent client-side cache merges for all real-time events, since Socket.IO broadcasts to the sender's own connection too (no `socket.to()` equivalent from an HTTP route context)
- Gap-based integer ordering (steps of 1000) for columns/tasks, with automatic rebalancing on collision
- Denormalized activity log and notifications (no FK constraints) so history remains readable after the referenced entity or user is gone

---

## Folder Structure

```
.
 └── src
 |   ├── app
 |   │   ├── (app)
 |   │   │   ├── boards
 |   │   │   │   └── [boardId]
 |   │   │   ├── dashboard
 |   │   │   │   ├── error.tsx
 |   │   │   │   ├── loading.tsx
 |   │   │   │   └── page.tsx
 |   │   │   ├── profile
 |   │   │   │   └── page.tsx
 |   │   │   └── layout.tsx
 |   │   ├── (auth)
 |   │   │   ├── login
 |   │   │   │   └── page.tsx
 |   │   │   ├── register
 |   │   │   │   └── page.tsx
 |   │   │   └── layout.tsx
 |   │   ├── api
 |   │   │   ├── auth
 |   │   │   │   └── refresh
 |   │   │   │       └── route.ts
 |   │   │   ├── boards
 |   │   │   │   └── [boardId]
 |   │   │   │       └── route.ts
 |   │   │   ├── login
 |   │   │   │   └── route.ts
 |   │   │   ├── logout
 |   │   │   │   └── route.ts
 |   │   │   ├── notifications
 |   │   │   │   └── [notificationId]
 |   │   │   │       └── route.ts
 |   │   │   ├── profile
 |   │   │   │   ├── avatar-signature
 |   │   │   │   │   └── route.ts
 |   │   │   │   └── route.ts
 |   │   │   └── register
 |   │   │       └── route.ts
 |   │   ├── favicon.ico
 |   │   ├── global.css
 |   │   ├── globals.css
 |   │   ├── layout.tsx
 |   │   └── page.tsx
 |   ├── components
 |   │   ├── activity
 |   │   │   └── ActivityFeed.tsx
 |   │   ├── ai
 |   │   │   └── BoardSummaryButton.tsx
 |   │   ├── board
 |   │   │   ├── AddColumnCard.tsx
 |   │   │   ├── AssigneeSelector.tsx
 |   │   │   ├── BoardCard.tsx
 |   │   │   ├── ColumnHeaderMenu.tsx
 |   │   │   ├── CreateBoardModal.tsx
 |   │   │   ├── CreateTaskModal.tsx
 |   │   │   ├── PresenceStack.tsx
 |   │   │   ├── ProfileForm.tsx
 |   │   │   ├── TaskCard.tsx
 |   │   │   └── TaskDetailModal.tsx
 |   │   ├── notifications
 |   │   │   └── NotificationBell.tsx
 |   │   ├── shared
 |   │   │   ├── CommandPalette.tsx
 |   │   │   ├── ErrorBoundary.tsx
 |   │   │   ├── Navbar.tsx
 |   │   │   ├── Sidebar.tsx
 |   │   │   ├── SkeletonCard.tsx
 |   │   │   └── UserAvatar.tsx
 |   │   ├── ui
 |   │   │   ├── alert-dialog.tsx
 |   │   │   ├── avatar.tsx
 |   │   │   ├── badge.tsx
 |   │   │   ├── button.tsx
 |   │   │   ├── card.tsx
 |   │   │   ├── command.tsx
 |   │   │   ├── dialog.tsx
 |   │   │   ├── dropdown-menu.tsx
 |   │   │   ├── field.tsx
 |   │   │   ├── input-group.tsx
 |   │   │   ├── input.tsx
 |   │   │   ├── label.tsx
 |   │   │   ├── popover.tsx
 |   │   │   ├── select.tsx
 |   │   │   ├── separator.tsx
 |   │   │   ├── sheet.tsx
 |   │   │   ├── sidebar.tsx
 |   │   │   ├── skeleton.tsx
 |   │   │   ├── sonner.tsx
 |   │   │   ├── textarea.tsx
 |   │   │   └── tooltip.tsx
 |   │   ├── providers.tsx
 |   │   └── RealtimeProvider.tsx
 |   ├── generated
 |   │   └── prisma
 |   │       ├── internal
 |   │       │   ├── class.ts
 |   │       │   ├── prismaNamespace.ts
 |   │       │   └── prismaNamespaceBrowser.ts
 |   │       ├── models
 |   │       │   ├── ActivityLog.ts
 |   │       │   ├── Board.ts
 |   │       │   ├── BoardMember.ts
 |   │       │   ├── Column.ts
 |   │       │   ├── Comment.ts
 |   │       │   ├── Notification.ts
 |   │       │   ├── RefreshToken.ts
 |   │       │   ├── Subtask.ts
 |   │       │   ├── Task.ts
 |   │       │   ├── TaskAssignee.ts
 |   │       │   └── User.ts
 |   │       ├── browser.ts
 |   │       ├── client.ts
 |   │       ├── commonInputTypes.ts
 |   │       ├── enums.ts
 |   │       └── models.ts
 |   ├── hooks
 |   │   ├── realtime
 |   │   │   ├── useAssigneeEvents.ts
 |   │   │   ├── useBoardEvents.ts
 |   │   │   ├── useBoardRoom.ts
 |   │   │   ├── useColumnEvents.ts
 |   │   │   ├── useCommentEvents.ts
 |   │   │   ├── useMemberEvents.ts
 |   │   │   ├── usePresence.ts
 |   │   │   ├── useSubtaskEvents.ts
 |   │   │   └── useTaskEvents.ts
 |   │   ├── use-mobile.ts
 |   │   ├── useActivity.ts
 |   │   ├── useAI.ts
 |   │   ├── useAssignees.ts
 |   │   ├── useAvatarUpload.tsx
 |   │   ├── useBoard.ts
 |   │   ├── useBoardDnd.ts
 |   │   ├── useBoards.ts
 |   │   ├── useColumns.ts
 |   │   ├── useCommandPaletteShortcut.ts
 |   │   ├── useComments.ts
 |   │   ├── useCurrentUser.ts
 |   │   ├── useMemberMutations.ts
 |   │   ├── useMembers.ts
 |   │   ├── useNotifications.ts
 |   │   ├── useSubtasks.ts
 |   │   ├── useTask.ts
 |   │   ├── useTasks.ts
 |   │   └── useUpdateProfile.ts
 |   ├── lib
 |   │   ├── socket
 |   │   │   └── serialise.ts
 |   │   ├── activity.ts
 |   │   ├── ai-prompts.ts
 |   │   ├── ai.ts
 |   │   ├── api.ts
 |   │   ├── cloudinary.ts
 |   │   ├── fetch.ts
 |   │   ├── notifications.ts
 |   │   ├── prisma.ts
 |   │   ├── queryKeys.ts
 |   │   ├── ratelimit.ts
 |   │   ├── rbac-client.ts
 |   │   ├── rbac.ts
 |   │   ├── redis.ts
 |   │   ├── session.ts
 |   │   ├── token.ts
 |   │   └── utils.ts
 |   ├── schemas
 |   │   ├── boardSchema.ts
 |   │   ├── loginSchema.ts
 |   │   ├── profileSchema.ts
 |   │   ├── registerSchema.ts
 |   │   └── taskSchema.ts
 |   ├── socket
 |   │   ├── events
 |   │   │   ├── connection.ts
 |   │   │   └── presence.ts
 |   │   ├── auth.ts
 |   │   ├── constants.ts
 |   │   ├── emitters.ts
 |   │   ├── index.ts
 |   │   ├── rooms.ts
 |   │   └── types.ts
 |   ├── store
 |   │   └── uiStore.tsx
 |   ├── types
 |   │   ├── api.ts
 |   │   ├── index.ts
 |   │   └── socket.ts
 |   └── proxy.ts
 ├── .dockerignore
 ├── .gitignore
 ├── components.json
 ├── docker-compose.yml
 ├── Dockerfile
 ├── eslint.config.mjs
 ├── next-env.d.ts
 ├── next.config.ts
 ├── package-lock.json
 ├── package.json
 ├── postcss.config.mjs
 ├── prisma.config.ts
 ├── README.md
 ├── server.ts
 └── tsconfig.json
```

---

## Permissions Model

| Action | Owner | Admin | Member | Viewer |
|---|:---:|:---:|:---:|:---:|
| View board | ✓ | ✓ | ✓ | ✓ |
| Create task | ✓ | ✓ | ✓ | |
| Edit task | ✓ | ✓ | own tasks only | |
| Delete task | ✓ | ✓ | | |
| Manage columns | ✓ | ✓ | | |
| Manage members | ✓ | ✓ | | |
| Delete board | ✓ | | | |
| Change roles | ✓ | | | |

---

## License

MIT
