import Link from "next/link";
import { cookies } from "next/headers";
import { verifyAccessToken } from "@/lib/token";
import { Button } from "@/components/ui/button";

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

          {/* Minimal board mock */}
          <div className="mt-16 grid grid-cols-3 gap-4 max-w-2xl mx-auto text-left">
            {[
              { title: "Backlog", cards: ["Design review", "API cleanup"] },
              { title: "In progress", cards: ["Realtime sync"] },
              { title: "Done", cards: ["Auth flow", "Board CRUD"] },
            ].map((col) => (
              <div
                key={col.title}
                className="bg-surface rounded-card p-3 border border-border"
              >
                <p className="text-caption font-medium text-muted-foreground mb-2">
                  {col.title}
                </p>
                <div className="flex flex-col gap-2">
                  {col.cards.map((card) => (
                    <div
                      key={card}
                      className="bg-surface-elevated rounded-md px-3 py-2 text-caption shadow-sm border border-border"
                    >
                      {card}
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* Feature row */}
        <section className="border-t border-border">
          <div className="mx-auto max-w-5xl px-6 py-12 grid grid-cols-1 sm:grid-cols-3 gap-8">
            <div>
              <p className="text-h3 font-medium">Real-time sync</p>
              <p className="text-caption text-muted-foreground mt-1">
                Every move, comment, and update appears live for the whole team.
              </p>
            </div>
            <div>
              <p className="text-h3 font-medium">Role-based access</p>
              <p className="text-caption text-muted-foreground mt-1">
                Owners, admins, members, and viewers each see the right controls.
              </p>
            </div>
            <div>
              <p className="text-h3 font-medium">AI-assisted planning</p>
              <p className="text-caption text-muted-foreground mt-1">
                Get subtask suggestions so boards stay organized with less setup.
              </p>
            </div>
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