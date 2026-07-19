"use client";

import { useState, useRef, useEffect } from "react";
import { MoreHorizontal, Pencil, Trash2 } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";


interface ColumnHeaderMenuProps {
  title: string;
  taskCount: number;
  canEdit: boolean;
  onRename: (newTitle: string) => void;
  onDelete: () => void;
  isRenaming?: boolean;
  isDeleting?: boolean;
}

export function ColumnHeaderMenu({
  title,
  taskCount,
  canEdit,
  onRename,
  onDelete,
  isRenaming = false,
  isDeleting = false,
}: ColumnHeaderMenuProps) {    
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(title);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

 useEffect(() => {
  if (editing) {
    inputRef.current?.focus();
    inputRef.current?.select();
  }
}, [editing]);

function commitRename() {
  const trimmed = draft.trim();
  if (!trimmed || trimmed === title) {
    setEditing(false);
    setDraft(title);
    return;
  }
  onRename(trimmed);
  setEditing(false);
}

  function cancelRename() {
    setDraft(title);
    setEditing(false);
  }

  return (
    <div className="flex items-center justify-between gap-2 px-3 py-2.5">
      <div className="flex min-w-0 items-center gap-1.5">
        {/* GripVertical removed — ColumnShell already renders the real, functional drag handle */}

        {editing && canEdit ? (
          <input
            ref={inputRef}
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            onBlur={commitRename}
            onKeyDown={(e) => {
              if (e.key === "Enter") commitRename();
              if (e.key === "Escape") cancelRename();
            }}
            maxLength={100}
            disabled={isRenaming}
            className="min-w-0 flex-1 rounded-[var(--radius-input)] border border-[var(--border)] bg-[var(--surface-elevated)] px-2 py-1 text-h3 font-medium text-foreground outline-none focus-visible:shadow-[var(--focus-ring)] disabled:opacity-60"
          />
        ) : canEdit ? (
          <button
            type="button"
            onClick={() => setEditing(true)}
            className="truncate rounded-[var(--radius-sm)] px-1 -mx-1 text-left text-h3 font-medium text-foreground hover:bg-[var(--hover)]"
          >
            {title}
          </button>
        ): (
          <span className="truncate px-1 -mx-1 text-h3 font-medium text-foreground">
            {title}
          </span>
        )}
        <span className="shrink-0 text-caption text-muted-foreground">
          {taskCount}
        </span>
      </div>
    { canEdit && (
        <DropdownMenu>
            <DropdownMenuTrigger asChild>
            <button
                type="button"
                aria-label={`${title} column options`}
                className="shrink-0 rounded-[var(--radius-sm)] p-1 text-muted-foreground hover:bg-[var(--hover)] hover:text-foreground focus-visible:shadow-[var(--focus-ring)] outline-none"
            >
                <MoreHorizontal className="h-4 w-4" />
            </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-40">
            <DropdownMenuItem onSelect={() => setEditing(true)}>
                <Pencil className="h-3.5 w-3.5" />
                Rename
            </DropdownMenuItem>
            <DropdownMenuItem
                variant="destructive"
                onSelect={() => setConfirmOpen(true)}
            >
                <Trash2 className="h-3.5 w-3.5" />
                Delete column
            </DropdownMenuItem>
            </DropdownMenuContent>
        </DropdownMenu>
    )}
    {canEdit && (
        <AlertDialog open={confirmOpen} onOpenChange={setConfirmOpen}>
            <AlertDialogContent>
            <AlertDialogHeader>
                <AlertDialogTitle>Delete &ldquo;{title}&rdquo;?</AlertDialogTitle>
                <AlertDialogDescription>
                {taskCount > 0
                    ? `This deletes ${taskCount} ${taskCount === 1 ? "task" : "tasks"} in this column, along with their subtasks and comments. This can't be undone.`
                    : "This can't be undone."}
                </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
                <AlertDialogCancel disabled={isDeleting}>Cancel</AlertDialogCancel>
                <AlertDialogAction
                onClick={onDelete}
                disabled={isDeleting}
                className="bg-[var(--error)] text-[var(--error-foreground)] hover:bg-[var(--error)]/90"
                >
                {isDeleting ? "Deleting…" : "Delete"}
                </AlertDialogAction>
            </AlertDialogFooter>
            </AlertDialogContent>
        </AlertDialog>
    )}
    </div>
  );
}