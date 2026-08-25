import Link from "next/link";
import { cookies } from "next/headers";
import { verifyAccessToken } from "@/lib/token";
import { Button } from "@/components/ui/button";
import { LayoutGrid, ListChecks, UserPlus, Radio } from "lucide-react";
import { LiveBoardPreview } from "@/components/LiveBoardPreview";

export default async function RootPage() {
  const cookieStore = await cookies();
  const token = cookieStore.get("accessToken")?.value;
  const payload = token ? await verifyAccessToken(token) : null;
  const isAuthed = !!payload;

  return (
    <div className="min-h-screen flex flex-col bg-background text-foreground">
      {/* Nav */}
      <header className="border-b border-border">
        <div className="mx-auto max-w-5xl px-6 h-16 flex items-center justify-between">
          <span className="text-h3 font-semibold tracking-tight">FlowBoard</span>
          <nav className="flex items-center gap-3">
            {isAuthed ? (
              <Button asChild size="sm">
                <Link href="/dashboard">Go to dashboard</Link>
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
          </nav>
        </div>
      </header>

      {/* Hero */}
      <main className="flex-1">
        <section className="mx-auto max-w-5xl px-6 pt-20 pb-16 text-center">
          <h1 className="text-display font-semibold tracking-tight max-w-2xl mx-auto">
            Plan and track work together, in real time.
          </h1>
          <p className="text-body text-muted-foreground max-w-md mx-auto mt-4">
            FlowBoard is a collaborative kanban board with live updates, role-based
            permissions, and AI-assisted planning.
          </p>
          <div className="flex items-center justify-center gap-3 mt-8">
            {isAuthed ? (
              <Button asChild size="lg">
                <Link href="/dashboard">Go to dashboard</Link>
              </Button>
            ) : (
              <>
                <Button asChild size="lg">
                  <Link href="/register">Get started</Link>
                </Button>
                <Button asChild variant="outline" size="lg">
                  <Link href="/login">Log in</Link>
                </Button>
              </>
            )}
          </div>

          {/* Live board preview */}
          <div className="mt-16">
            <LiveBoardPreview />
          </div>
        </section>

        {/* How it works */}
        <section className="border-t border-border">
          <div className="mx-auto max-w-5xl px-6 py-16">
            <p className="text-caption font-medium text-muted-foreground text-center mb-10">
              How it works
            </p>
            <div className="grid grid-cols-1 sm:grid-cols-4 gap-8">
              {[
                {
                  n: "01",
                  icon: LayoutGrid,
                  title: "Create a board",
                  copy: "Start one per project or team. You're the owner by default.",
                },
                {
                  n: "02",
                  icon: ListChecks,
                  title: "Add columns & tasks",
                  copy: "Shape your workflow into stages, then break work into tasks and subtasks.",
                },
                {
                  n: "03",
                  icon: UserPlus,
                  title: "Bring in your team",
                  copy: "Invite members and assign roles — owner, admin, member, or viewer.",
                },
                {
                  n: "04",
                  icon: Radio,
                  title: "Watch it update live",
                  copy: "Every move, comment, and assignment syncs instantly for everyone on the board.",
                },
              ].map(({ n, icon: Icon, title, copy }) => (
                <div key={n} className="relative">
                  <span className="text-caption font-mono text-muted-foreground">
                    {n}
                  </span>
                  <div className="mt-3 w-9 h-9 rounded-md bg-surface border border-border flex items-center justify-center">
                    <Icon className="w-4 h-4 text-primary" strokeWidth={2} />
                  </div>
                  <p className="text-h3 font-medium mt-4">{title}</p>
                  <p className="text-caption text-muted-foreground mt-1">{copy}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* Feature row */}
        <section className="border-t border-border">
          <div className="mx-auto max-w-5xl px-6 py-12 grid grid-cols-1 sm:grid-cols-3 gap-8">
            {[
              {
                icon: Radio,
                title: "Real-time sync",
                copy: "Every move, comment, and update appears live for the whole team.",
                tint: "bg-info-subtle text-info",
              },
              {
                icon: UserPlus,
                title: "Role-based access",
                copy: "Owners, admins, members, and viewers each see the right controls.",
                tint: "bg-warning-subtle text-warning",
              },
              {
                icon: ListChecks,
                title: "AI-assisted planning",
                copy: "Get subtask suggestions so boards stay organized with less setup.",
                tint: "bg-success-subtle text-success",
              },
            ].map(({ icon: Icon, title, copy, tint }) => (
              <div key={title}>
                <div
                  className={`w-9 h-9 rounded-md flex items-center justify-center ${tint}`}
                >
                  <Icon className="w-4 h-4" strokeWidth={2} />
                </div>
                <p className="text-h3 font-medium mt-3">{title}</p>
                <p className="text-caption text-muted-foreground mt-1">{copy}</p>
              </div>
            ))}
          </div>
        </section>
      </main>

      <footer className="border-t border-border">
        <div className="mx-auto max-w-5xl px-6 h-14 flex items-center justify-between text-caption text-muted-foreground">
          <span>FlowBoard</span>
        </div>
      </footer>
    </div>
  );
}