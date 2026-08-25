"use client";

import { useEffect, useState } from "react";

type Priority = "LOW" | "MEDIUM" | "HIGH";

const PRIORITY_BORDER: Record<Priority, string> = {
  LOW: "border-l-info",
  MEDIUM: "border-l-warning",
  HIGH: "border-l-error",
};

const STATIC = {
  Backlog: [
    { id: "1", title: "Design review", priority: "LOW" as Priority },
    { id: "2", title: "API cleanup", priority: "MEDIUM" as Priority },
  ],
  Done: [{ id: "4", title: "Auth flow", priority: "MEDIUM" as Priority }],
};

const MOVER = { id: "3", title: "Realtime sync", priority: "HIGH" as Priority };

const Card = ({ card }: { card: typeof MOVER }) => (
  <div
    className={`bg-surface-elevated rounded-md px-3 py-2 text-caption shadow-sm border border-border border-l-4 ${PRIORITY_BORDER[card.priority]}`}
  >
    {card.title}
  </div>
);

export function LiveBoardPreview() {
  const [inProgress, setInProgress] = useState(true);

  useEffect(() => {
    const id = setInterval(() => setInProgress((v) => !v), 4000);
    return () => clearInterval(id);
  }, []);

  return (
    <div className="relative grid grid-cols-1 sm:grid-cols-3 gap-4 max-w-2xl mx-auto text-left">
      {(["Backlog", "In progress", "Done"] as const).map((col) => (
        <div key={col} className="bg-surface rounded-card p-3 border border-border">
          <p className="text-caption font-medium text-muted-foreground mb-2">
            {col}
          </p>
          <div className="flex flex-col gap-2 min-h-[52px]">
            {col === "Backlog" &&
              STATIC.Backlog.map((c) => <Card key={c.id} card={c} />)}

            {col === "In progress" && inProgress && (
              <div key="mover-in" className="animate-in fade-in-0 slide-in-from-top-2 duration-500">
                <Card card={MOVER} />
              </div>
            )}

            {col === "Done" && (
              <>
                {STATIC.Done.map((c) => <Card key={c.id} card={c} />)}
                {!inProgress && (
                  <div key="mover-done" className="animate-in fade-in-0 slide-in-from-top-2 duration-500">
                    <Card card={MOVER} />
                  </div>
                )}
              </>
            )}
          </div>
        </div>
      ))}

      {/* Sync line — sits on the boundary between "In progress" and "Done" columns */}
    <svg
    className="hidden sm:block absolute top-1/2 left-2/3 -translate-y-1/2 -translate-x-1/2 w-16 h-4 pointer-events-none"
    viewBox="0 0 100 10"
    >
    <line
        x1="0" y1="5" x2="100" y2="5"
        stroke="var(--info)"
        strokeWidth="1.5"
        strokeDasharray="4 3"
        className={inProgress ? "opacity-0" : "opacity-60 transition-opacity duration-500"}
    />
    </svg>
    </div>
  );
}