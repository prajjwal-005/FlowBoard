// import Link from "next/link";
// import { cookies } from "next/headers";
// import { verifyAccessToken } from "@/lib/token";
// import { Button } from "@/components/ui/button";

// export default async function RootPage() {
//   const cookieStore = await cookies();
//   const token = cookieStore.get("accessToken")?.value;
//   const payload = token ? await verifyAccessToken(token) : null;
//   const isAuthed = !!payload;

//   return (
//     <div className="min-h-screen flex flex-col bg-background text-foreground">
//       {/* Nav */}
//       <header className="border-b border-border">
//         <div className="mx-auto max-w-5xl px-6 h-16 flex items-center justify-between">
//           <span className="text-h3 font-semibold tracking-tight">FlowBoard</span>
//           <nav className="flex items-center gap-3">
//             {isAuthed ? (
//               <Button asChild size="sm">
//                 <Link href="/dashboard">Go to dashboard</Link>
//               </Button>
//             ) : (
//               <>
//                 <Button asChild variant="ghost" size="sm">
//                   <Link href="/login">Log in</Link>
//                 </Button>
//                 <Button asChild size="sm">
//                   <Link href="/register">Get started</Link>
//                 </Button>
//               </>
//             )}
//           </nav>
//         </div>
//       </header>

//       {/* Hero */}
//       <main className="flex-1">
//         <section className="mx-auto max-w-5xl px-6 pt-20 pb-16 text-center">
//           <h1 className="text-display font-semibold tracking-tight max-w-2xl mx-auto">
//             Plan and track work together, in real time.
//           </h1>
//           <p className="text-body text-muted-foreground max-w-md mx-auto mt-4">
//             FlowBoard is a collaborative kanban board with live updates, role-based
//             permissions, and AI-assisted planning.
//           </p>
//           <div className="flex items-center justify-center gap-3 mt-8">
//             {isAuthed ? (
//               <Button asChild size="lg">
//                 <Link href="/dashboard">Go to dashboard</Link>
//               </Button>
//             ) : (
//               <>
//                 <Button asChild size="lg">
//                   <Link href="/register">Get started</Link>
//                 </Button>
//                 <Button asChild variant="outline" size="lg">
//                   <Link href="/login">Log in</Link>
//                 </Button>
//               </>
//             )}
//           </div>

//           {/* Minimal board mock */}
//           <div className="mt-16 grid grid-cols-3 gap-4 max-w-2xl mx-auto text-left">
//             {[
//               { title: "Backlog", cards: ["Design review", "API cleanup"] },
//               { title: "In progress", cards: ["Realtime sync"] },
//               { title: "Done", cards: ["Auth flow", "Board CRUD"] },
//             ].map((col) => (
//               <div
//                 key={col.title}
//                 className="bg-surface rounded-card p-3 border border-border"
//               >
//                 <p className="text-caption font-medium text-muted-foreground mb-2">
//                   {col.title}
//                 </p>
//                 <div className="flex flex-col gap-2">
//                   {col.cards.map((card) => (
//                     <div
//                       key={card}
//                       className="bg-surface-elevated rounded-md px-3 py-2 text-caption shadow-sm border border-border"
//                     >
//                       {card}
//                     </div>
//                   ))}
//                 </div>
//               </div>
//             ))}
//           </div>
//         </section>

//         {/* Feature row */}
//         <section className="border-t border-border">
//           <div className="mx-auto max-w-5xl px-6 py-12 grid grid-cols-1 sm:grid-cols-3 gap-8">
//             <div>
//               <p className="text-h3 font-medium">Real-time sync</p>
//               <p className="text-caption text-muted-foreground mt-1">
//                 Every move, comment, and update appears live for the whole team.
//               </p>
//             </div>
//             <div>
//               <p className="text-h3 font-medium">Role-based access</p>
//               <p className="text-caption text-muted-foreground mt-1">
//                 Owners, admins, members, and viewers each see the right controls.
//               </p>
//             </div>
//             <div>
//               <p className="text-h3 font-medium">AI-assisted planning</p>
//               <p className="text-caption text-muted-foreground mt-1">
//                 Get subtask suggestions so boards stay organized with less setup.
//               </p>
//             </div>
//           </div>
//         </section>
//       </main>

//       <footer className="border-t border-border">
//         <div className="mx-auto max-w-5xl px-6 h-14 flex items-center justify-between text-caption text-muted-foreground">
//           <span>FlowBoard</span>
//         </div>
//       </footer>
//     </div>
//   );
// }

import Link from "next/link";
import { cookies } from "next/headers";
import { verifyAccessToken } from "@/lib/token";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  ArrowRight,
  Check,
  Circle,
  MessageSquare,
  ShieldCheck,
  Sparkles,
  Users,
  Zap,
} from "lucide-react";

export default async function RootPage() {
  const cookieStore = await cookies();
  const token = cookieStore.get("accessToken")?.value;
  const payload = token ? await verifyAccessToken(token) : null;
  const isAuthed = !!payload;

  return (
    <div className="min-h-screen bg-background text-foreground">
      {/* Navbar */}
      <header className="sticky top-0 z-50 border-b border-border bg-background/90 backdrop-blur">
        <div className="mx-auto flex h-16 max-w-6xl items-center justify-between px-6">
          <Link
            href="/"
            className="text-h3 font-semibold tracking-tight"
            aria-label="FlowBoard home"
          >
            FlowBoard
          </Link>

          <nav className="hidden items-center gap-7 text-sm text-muted-foreground md:flex">
            <a
              href="#features"
              className="transition-colors hover:text-foreground"
            >
              Features
            </a>
            <a
              href="#collaboration"
              className="transition-colors hover:text-foreground"
            >
              Collaboration
            </a>
            <a
              href="#ai"
              className="transition-colors hover:text-foreground"
            >
              AI
            </a>
          </nav>

          <div className="flex items-center gap-2">
            {isAuthed ? (
              <Button asChild size="sm">
                <Link href="/dashboard">
                  Open dashboard
                  <ArrowRight className="size-4" />
                </Link>
              </Button>
            ) : (
              <>
                <Button asChild variant="ghost" size="sm">
                  <Link href="/login">Log in</Link>
                </Button>

                <Button asChild size="sm">
                  <Link href="/register">Get started</Link>
                </Button>
              </>
            )}
          </div>
        </div>
      </header>

      <main>
        {/* Hero */}
        <section className="relative overflow-hidden">
          <div className="mx-auto max-w-6xl px-6 pb-20 pt-20 sm:pt-24 lg:pb-28 lg:pt-28">
            <div className="mx-auto max-w-3xl text-center">
              <Badge variant="secondary" className="mb-5">
                Collaborative project management
              </Badge>

              <h1 className="text-4xl font-semibold tracking-[-0.035em] sm:text-5xl lg:text-6xl">
                Organize work without losing the conversation.
              </h1>

              <p className="mx-auto mt-6 max-w-2xl text-base leading-7 text-muted-foreground sm:text-lg">
                Plan tasks, collaborate in real time, and keep everyone working
                from the same context — without turning project management into
                another project.
              </p>

              <div className="mt-8 flex flex-col items-center justify-center gap-3 sm:flex-row">
                {isAuthed ? (
                  <Button asChild size="lg">
                    <Link href="/dashboard">
                      Open dashboard
                      <ArrowRight className="size-4" />
                    </Link>
                  </Button>
                ) : (
                  <>
                    <Button asChild size="lg">
                      <Link href="/register">
                        Get started
                        <ArrowRight className="size-4" />
                      </Link>
                    </Button>

                    <Button asChild variant="outline" size="lg">
                      <Link href="/login">Log in</Link>
                    </Button>
                  </>
                )}
              </div>
            </div>

            {/* Main product mock */}
            <div className="relative mx-auto mt-16 max-w-5xl">
              <div className="absolute inset-x-16 -top-6 h-24 rounded-full bg-primary/10 blur-3xl" />

              <div className="relative overflow-hidden rounded-xl border border-border bg-surface-elevated shadow-xl">
                {/* Mock app navbar */}
                <div className="flex h-14 items-center justify-between border-b border-border px-4 sm:px-5">
                  <div className="flex items-center gap-3">
                    <div className="flex size-8 items-center justify-center rounded-md bg-primary text-xs font-semibold text-primary-foreground">
                      F
                    </div>
                    <span className="text-sm font-medium">Product launch</span>
                  </div>

                  <div className="flex items-center gap-2">
                    <div className="hidden items-center -space-x-2 sm:flex">
                      {["AP", "SK", "JM"].map((initials) => (
                        <div
                          key={initials}
                          className="flex size-8 items-center justify-center rounded-full border-2 border-surface-elevated bg-surface text-[10px] font-medium"
                        >
                          {initials}
                        </div>
                      ))}
                    </div>

                    <Badge variant="secondary">3 online</Badge>
                  </div>
                </div>

                {/* Board */}
                <div className="overflow-x-auto bg-surface p-4 sm:p-5">
                  <div className="grid min-w-[760px] grid-cols-3 gap-4">
                    <MockColumn
                      title="Backlog"
                      count={3}
                      cards={[
                        {
                          title: "Research onboarding flow",
                          priority: "MEDIUM",
                        },
                        {
                          title: "Analytics dashboard",
                          priority: "LOW",
                        },
                        {
                          title: "Write launch checklist",
                        },
                      ]}
                    />

                    <MockColumn
                      title="In progress"
                      count={2}
                      cards={[
                        {
                          title: "Build landing page",
                          priority: "HIGH",
                          meta: "2 / 4 subtasks",
                        },
                        {
                          title: "Realtime board sync",
                          priority: "MEDIUM",
                          meta: "Sam · Alex",
                        },
                      ]}
                    />

                    <MockColumn
                      title="Done"
                      count={2}
                      cards={[
                        {
                          title: "Authentication flow",
                          completed: true,
                        },
                        {
                          title: "Board permissions",
                          completed: true,
                        },
                      ]}
                    />
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Value row */}
        <section id="features" className="border-y border-border bg-surface">
          <div className="mx-auto grid max-w-6xl grid-cols-1 divide-y divide-border px-6 md:grid-cols-3 md:divide-x md:divide-y-0">
            <ValueItem
              icon={<Zap className="size-4" />}
              title="Plan visually"
              text="Move work through flexible boards and keep priorities visible."
            />

            <ValueItem
              icon={<Users className="size-4" />}
              title="Work together"
              text="See updates and teammates as they happen across the board."
            />

            <ValueItem
              icon={<ShieldCheck className="size-4" />}
              title="Stay in control"
              text="Give owners, admins, members, and viewers the right level of access."
            />
          </div>
        </section>

        {/* Task detail */}
        <section className="mx-auto grid max-w-6xl gap-12 px-6 py-20 lg:grid-cols-2 lg:items-center lg:py-28">
          <div>
            <p className="text-sm font-medium text-primary">Task management</p>

            <h2 className="mt-3 max-w-lg text-3xl font-semibold tracking-tight sm:text-4xl">
              More than a card on a board.
            </h2>

            <p className="mt-5 max-w-lg leading-7 text-muted-foreground">
              Keep the work and its context together. Tasks can carry
              descriptions, priorities, due dates, subtasks, conversations,
              assignees, and ownership without taking you away from the board.
            </p>

            <div className="mt-7 grid gap-3 sm:grid-cols-2">
              {[
                "Subtasks",
                "Comments",
                "Assignees",
                "Priorities",
                "Due dates",
                "Task ownership",
              ].map((feature) => (
                <div
                  key={feature}
                  className="flex items-center gap-2 text-sm"
                >
                  <div className="flex size-5 items-center justify-center rounded-full bg-success-subtle text-success-text">
                    <Check className="size-3" />
                  </div>
                  {feature}
                </div>
              ))}
            </div>
          </div>

          {/* Mock task detail */}
          <div className="rounded-xl border border-border bg-surface-elevated p-5 shadow-lg sm:p-6">
            <div className="flex items-start justify-between gap-4">
              <div>
                <Badge variant="secondary">In progress</Badge>
                <h3 className="mt-3 text-xl font-semibold">
                  Build collaborative board
                </h3>
                <p className="mt-1 text-xs text-muted-foreground">
                  Created by alex
                </p>
              </div>

              <Badge>High</Badge>
            </div>

            <div className="mt-6">
              <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                Description
              </p>
              <p className="mt-2 text-sm leading-6 text-muted-foreground">
                Implement the primary board experience including task movement,
                task details, role-aware controls and live synchronization.
              </p>
            </div>

            <div className="mt-6 border-t border-border pt-5">
              <div className="flex items-center justify-between">
                <p className="text-sm font-medium">Subtasks</p>
                <span className="text-xs text-muted-foreground">2 of 3</span>
              </div>

              <div className="mt-3 space-y-2">
                <MockSubtask label="Build column layout" checked />
                <MockSubtask label="Wire drag and drop" checked />
                <MockSubtask label="Test permissions" />
              </div>
            </div>

            <div className="mt-6 flex items-center gap-3 border-t border-border pt-5">
              <MessageSquare className="size-4 text-muted-foreground" />
              <div className="min-w-0">
                <p className="text-sm">
                  <span className="font-medium">Sam</span>{" "}
                  <span className="text-muted-foreground">
                    moved the realtime work into review.
                  </span>
                </p>
              </div>
            </div>
          </div>
        </section>

        {/* Realtime */}
        <section id="collaboration" className="border-y border-border bg-surface">
          <div className="mx-auto grid max-w-6xl gap-12 px-6 py-20 lg:grid-cols-2 lg:items-center lg:py-28">
            <div className="order-2 lg:order-1">
              <div className="rounded-xl border border-border bg-surface-elevated p-6 shadow-md">
                <div className="flex items-center justify-between border-b border-border pb-4">
                  <div>
                    <p className="font-medium">Design board</p>
                    <p className="text-xs text-muted-foreground">
                      Live activity
                    </p>
                  </div>

                  <div className="flex items-center gap-2 text-xs text-success-text">
                    <Circle className="size-2 fill-current" />
                    Connected
                  </div>
                </div>

                <div className="mt-5 space-y-5">
                  <ActivityLine
                    initials="AP"
                    title="Alex moved"
                    detail={'"Homepage design" to In progress'}
                  />

                  <ActivityLine
                    initials="SK"
                    title="Sam commented on"
                    detail={'"Realtime events"'}
                  />

                  <ActivityLine
                    initials="JM"
                    title="Jordan completed"
                    detail={'"Authentication flow"'}
                  />
                </div>
              </div>
            </div>

            <div className="order-1 lg:order-2">
              <p className="text-sm font-medium text-primary">
                Real-time collaboration
              </p>

              <h2 className="mt-3 text-3xl font-semibold tracking-tight sm:text-4xl">
                See changes while they happen.
              </h2>

              <p className="mt-5 max-w-lg leading-7 text-muted-foreground">
                Board changes appear live across connected sessions. Presence
                shows who is working with you, while notifications and activity
                history keep important changes from disappearing into the
                background.
              </p>
            </div>
          </div>
        </section>

        {/* AI */}
        <section
          id="ai"
          className="mx-auto max-w-6xl px-6 py-20 text-center lg:py-28"
        >
          <p className="text-sm font-medium text-primary">AI assistance</p>

          <h2 className="mt-3 text-3xl font-semibold tracking-tight sm:text-4xl">
            AI when it is useful. Not everywhere.
          </h2>

          <p className="mx-auto mt-5 max-w-2xl leading-7 text-muted-foreground">
            Use AI to accelerate planning without handing control of the board
            over to it. Generate suggestions, review them, then decide what
            actually belongs in your work.
          </p>

          <div className="mt-12 grid gap-4 text-left md:grid-cols-3">
            <AICard
              title="Break down a task"
              input="Build authentication"
              output={[
                "Create login form",
                "Handle sessions",
                "Protect application routes",
              ]}
            />

            <AICard
              title="Expand a description"
              input="Build analytics dashboard"
              output={[
                "Define dashboard requirements",
                "Structure metrics and filters",
                "Document expected behavior",
              ]}
            />

            <AICard
              title="Summarize a board"
              input="14 tasks · 4 active · 7 complete"
              output={[
                "Authentication is complete",
                "Realtime work is progressing",
                "Analytics remains in backlog",
              ]}
            />
          </div>
        </section>

        {/* Roles */}
        <section className="border-y border-border bg-surface">
          <div className="mx-auto grid max-w-6xl gap-12 px-6 py-20 lg:grid-cols-[0.8fr_1.2fr] lg:items-center lg:py-28">
            <div>
              <p className="text-sm font-medium text-primary">
                Role-based access
              </p>

              <h2 className="mt-3 text-3xl font-semibold tracking-tight sm:text-4xl">
                Collaboration without giving everyone the keys.
              </h2>

              <p className="mt-5 max-w-lg leading-7 text-muted-foreground">
                Owners, admins, members, and viewers get different capabilities
                so the interface matches what each person is actually allowed
                to do.
              </p>
            </div>

            <div className="overflow-hidden rounded-xl border border-border bg-surface-elevated">
              <div className="grid grid-cols-5 border-b border-border bg-surface px-4 py-3 text-xs font-medium text-muted-foreground">
                <span>Action</span>
                <span className="text-center">Owner</span>
                <span className="text-center">Admin</span>
                <span className="text-center">Member</span>
                <span className="text-center">Viewer</span>
              </div>

              <PermissionRow label="View board" values={[true, true, true, true]} />
              <PermissionRow
                label="Create tasks"
                values={[true, true, true, false]}
              />
              <PermissionRow
                label="Manage columns"
                values={[true, true, false, false]}
              />
              <PermissionRow
                label="Manage members"
                values={[true, true, false, false]}
              />
              <PermissionRow
                label="Delete board"
                values={[true, false, false, false]}
                last
              />
            </div>
          </div>
        </section>

        {/* Final CTA */}
        <section className="mx-auto max-w-6xl px-6 py-20 lg:py-28">
          <div className="overflow-hidden rounded-xl border border-border bg-primary px-6 py-14 text-center text-primary-foreground sm:px-12">
            <h2 className="text-3xl font-semibold tracking-tight sm:text-4xl">
              Turn the next project into a board.
            </h2>

            <p className="mx-auto mt-4 max-w-xl text-sm leading-6 text-primary-foreground/80 sm:text-base">
              Create a workspace, organize the work, and keep everyone aligned
              as it moves forward.
            </p>

            <div className="mt-7">
              <Button
                asChild
                size="lg"
                variant="secondary"
                className="text-foreground"
              >
                <Link href={isAuthed ? "/dashboard" : "/register"}>
                  {isAuthed ? "Open dashboard" : "Create your account"}
                  <ArrowRight className="size-4" />
                </Link>
              </Button>
            </div>
          </div>
        </section>
      </main>

      {/* Footer */}
      <footer className="border-t border-border">
        <div className="mx-auto flex max-w-6xl flex-col gap-3 px-6 py-8 text-sm text-muted-foreground sm:flex-row sm:items-center sm:justify-between">
          <span className="font-medium text-foreground">FlowBoard</span>

          <span>
            Built with Next.js, PostgreSQL, Socket.IO and Redis.
          </span>
        </div>
      </footer>
    </div>
  );
}

function MockColumn({
  title,
  count,
  cards,
}: {
  title: string;
  count: number;
  cards: {
    title: string;
    priority?: "LOW" | "MEDIUM" | "HIGH";
    meta?: string;
    completed?: boolean;
  }[];
}) {
  return (
    <div className="rounded-lg border border-border bg-background p-3">
      <div className="mb-3 flex items-center justify-between px-1">
        <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
          {title}
        </p>
        <span className="text-xs text-muted-foreground">{count}</span>
      </div>

      <div className="space-y-2">
        {cards.map((card) => (
          <div
            key={card.title}
            className="rounded-md border border-border bg-surface-elevated p-3 shadow-sm"
          >
            <div className="flex items-start justify-between gap-2">
              <p
                className={
                  card.completed
                    ? "text-sm text-muted-foreground line-through"
                    : "text-sm font-medium"
                }
              >
                {card.title}
              </p>

              {card.completed && (
                <div className="flex size-5 shrink-0 items-center justify-center rounded-full bg-success-subtle text-success-text">
                  <Check className="size-3" />
                </div>
              )}
            </div>

            {(card.priority || card.meta) && (
              <div className="mt-3 flex items-center justify-between gap-2">
                {card.priority ? (
                  <span className="text-[10px] font-medium text-muted-foreground">
                    {card.priority}
                  </span>
                ) : (
                  <span />
                )}

                {card.meta && (
                  <span className="text-[10px] text-muted-foreground">
                    {card.meta}
                  </span>
                )}
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}

function ValueItem({
  icon,
  title,
  text,
}: {
  icon: React.ReactNode;
  title: string;
  text: string;
}) {
  return (
    <div className="py-8 md:px-8 md:py-10 first:md:pl-0 last:md:pr-0">
      <div className="flex size-9 items-center justify-center rounded-md bg-primary/10 text-primary">
        {icon}
      </div>
      <h3 className="mt-4 font-medium">{title}</h3>
      <p className="mt-2 max-w-xs text-sm leading-6 text-muted-foreground">
        {text}
      </p>
    </div>
  );
}

function MockSubtask({
  label,
  checked = false,
}: {
  label: string;
  checked?: boolean;
}) {
  return (
    <div className="flex items-center gap-3 rounded-md bg-surface px-3 py-2">
      <div
        className={
          checked
            ? "flex size-5 items-center justify-center rounded border border-primary bg-primary text-primary-foreground"
            : "size-5 rounded border border-border bg-background"
        }
      >
        {checked && <Check className="size-3" />}
      </div>

      <span
        className={
          checked
            ? "text-sm text-muted-foreground line-through"
            : "text-sm"
        }
      >
        {label}
      </span>
    </div>
  );
}

function ActivityLine({
  initials,
  title,
  detail,
}: {
  initials: string;
  title: string;
  detail: string;
}) {
  return (
    <div className="flex gap-3">
      <div className="flex size-9 shrink-0 items-center justify-center rounded-full bg-surface text-xs font-medium">
        {initials}
      </div>

      <div className="min-w-0">
        <p className="text-sm font-medium">{title}</p>
        <p className="mt-0.5 text-sm text-muted-foreground">{detail}</p>
      </div>
    </div>
  );
}

function AICard({
  title,
  input,
  output,
}: {
  title: string;
  input: string;
  output: string[];
}) {
  return (
    <div className="rounded-xl border border-border bg-surface-elevated p-5">
      <div className="flex size-9 items-center justify-center rounded-md bg-primary/10 text-primary">
        <Sparkles className="size-4" />
      </div>

      <h3 className="mt-4 font-medium">{title}</h3>

      <div className="mt-4 rounded-md bg-surface px-3 py-2 text-sm">
        {input}
      </div>

      <div className="mt-4 space-y-2">
        {output.map((line) => (
          <div
            key={line}
            className="flex items-start gap-2 text-sm text-muted-foreground"
          >
            <Check className="mt-0.5 size-4 shrink-0 text-primary" />
            <span>{line}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

function PermissionRow({
  label,
  values,
  last = false,
}: {
  label: string;
  values: boolean[];
  last?: boolean;
}) {
  return (
    <div
      className={`grid grid-cols-5 px-4 py-3 text-sm ${
        last ? "" : "border-b border-border"
      }`}
    >
      <span>{label}</span>

      {values.map((allowed, index) => (
        <div key={index} className="flex justify-center">
          {allowed ? (
            <Check className="size-4 text-success-text" />
          ) : (
            <span className="text-muted-foreground">—</span>
          )}
        </div>
      ))}
    </div>
  );
}