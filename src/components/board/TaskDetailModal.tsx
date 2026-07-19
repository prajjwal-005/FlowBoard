"use client";

import { useState, useRef, useEffect } from "react";
import { X, Plus, Trash2, Check, Sparkles, Loader2 } from "lucide-react";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
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
import { Textarea } from "@/components/ui/textarea";
import type { Priority, Member, Assignee, Subtask, Comment } from "@/types/api";
import { AssigneeSelector } from "./AssigneeSelector";

interface TaskDetailModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  columnTitle: string;
  task: {
    id: string;
    title: string;
    description: string | null;
    priority: Priority | null;
    dueDate: string | null;
    createdBy: { username: string };
  };
  assignees: Assignee[];
  subtasks: Subtask[];
  comments: Comment[];
  members: Member[];
  currentUserID: string;
  canDeleteComment: (comment: Comment) => boolean;
  canDeleteTask: boolean;
  canEditFields: boolean;
  canCreateSubtaskOnTask: boolean;
  canCreateComment: boolean;
  canAssignMembers: boolean;
  onUpdateField: (
    field: "title" | "description" | "priority" | "dueDate",
    value: string | null
  ) => void;
  onDeleteTask: () => void;
  onAddSubtask: (title: string) => void;
  onToggleSubtask: (id: string, isCompleted: boolean) => void;
  onDeleteSubtask: (id: string) => void;
  onAddComment: (content: string) => void;
  onDeleteComment: (id: string) => void;
  onAddAssignee: (userID: string) => void;
  onRemoveAssignee: (userID: string) => void;
  aiSuggestions?: string[];
  aiSuggestionsLoading: boolean;
  aiSuggestionsError: boolean;
  onGenerateSuggestions: () => void;
  onAddSuggestions: (titles: string[]) => void;
  descriptionSuggestion?: string;
  descriptionSuggestionLoading: boolean;
  descriptionSuggestionError: boolean;
  onGenerateDescription: () => void;
  onAcceptDescription: (text: string) => void;
  onDiscardDescription: () => void;
}

const PRIORITIES: Priority[] = ["LOW", "MEDIUM", "HIGH"];

export function TaskDetailModal({
  open,
  onOpenChange,
  columnTitle,
  task,
  assignees,
  subtasks,
  comments,
  members,
  canDeleteComment,
  canDeleteTask,
  canEditFields,
  canCreateSubtaskOnTask,
  canCreateComment,
  canAssignMembers,
  onUpdateField,
  onDeleteTask,
  onAddSubtask,
  onToggleSubtask,
  onDeleteSubtask,
  onAddComment,
  onDeleteComment,
  onAddAssignee,
  onRemoveAssignee,
  aiSuggestions,
  aiSuggestionsLoading,
  aiSuggestionsError,
  onGenerateSuggestions,
  onAddSuggestions,
  descriptionSuggestion,
  descriptionSuggestionLoading,
  descriptionSuggestionError,
  onGenerateDescription,
  onAcceptDescription,
  onDiscardDescription,
}: TaskDetailModalProps) {
  const [editingTitle, setEditingTitle] = useState(false);
  const [subtaskDraft, setSubtaskDraft] = useState("");
  const [commentDraft, setCommentDraft] = useState("");
  const [assigneePopoverOpen, setAssigneePopoverOpen] = useState(false);
  const [confirmDeleteTaskOpen, setConfirmDeleteTaskOpen] = useState(false);
  const [confirmDeleteSubtaskId, setConfirmDeleteSubtaskId] = useState<string | null>(null);
  const titleRef = useRef<HTMLInputElement>(null);

  const [titleDraft, setTitleDraft] = useState(task.title);
  const [descDraft, setDescDraft] = useState(task.description ?? "");
  const [prevTaskId, setPrevTaskId] = useState(task.id);
  const [selectedSuggestions, setSelectedSuggestions] = useState<Set<string>>(new Set());

  if (prevTaskId !== task.id) {
    setPrevTaskId(task.id);
    setTitleDraft(task.title);
    setDescDraft(task.description ?? "");
    setSelectedSuggestions(new Set());
  }

  useEffect(() => {
    if (editingTitle) {
      titleRef.current?.focus();
      titleRef.current?.select();
    }
  }, [editingTitle]);

  function commitTitle() {
    const trimmed = titleDraft.trim();
    if (trimmed && trimmed !== task.title) onUpdateField("title", trimmed);
    else setTitleDraft(task.title);
    setEditingTitle(false);
  }

  function commitDescription() {
    const trimmed = descDraft.trim();
    if (trimmed !== (task.description ?? "")) {
      onUpdateField("description", trimmed || null);
    }
  }

  function submitSubtask(e: React.FormEvent) {
    e.preventDefault();
    const trimmed = subtaskDraft.trim();
    if (!trimmed) return;
    onAddSubtask(trimmed);
    setSubtaskDraft("");
  }

  function submitComment(e: React.FormEvent) {
    e.preventDefault();
    const trimmed = commentDraft.trim();
    if (!trimmed) return;
    onAddComment(trimmed);
    setCommentDraft("");
  }

  function toggleSuggestion(title: string) {
    setSelectedSuggestions((prev) => {
      const next = new Set(prev);
      next.has(title) ? next.delete(title) : next.add(title);
      return next;
    });
  }

  function handleGenerate() {
    setSelectedSuggestions(new Set());
    onGenerateSuggestions();
  }

  function handleAddSelected() {
    onAddSuggestions(Array.from(selectedSuggestions));
    setSelectedSuggestions(new Set());
  }

  const completedCount = subtasks.filter((s) => s.isCompleted).length;
  const subtaskPendingDelete = subtasks.find((s) => s.id === confirmDeleteSubtaskId);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        showCloseButton={false}
        className="flex max-h-[85vh] flex-col gap-0 p-0 sm:max-w-2xl"
      >
        <div className="flex items-start justify-between gap-3 border-b border-[var(--border)] px-6 py-4">
          <div className="min-w-0 flex-1">
            <p className="text-caption text-muted-foreground">
              {columnTitle} · Created by {task.createdBy?.username}
            </p>
            {editingTitle && canEditFields ? (
              <input
                ref={titleRef}
                value={titleDraft}
                onChange={(e) => setTitleDraft(e.target.value)}
                onBlur={commitTitle}
                onKeyDown={(e) => {
                  if (e.key === "Enter") commitTitle();
                  if (e.key === "Escape") {
                    setTitleDraft(task.title);
                    setEditingTitle(false);
                  }
                }}
                maxLength={200}
                className="mt-0.5 w-full rounded-[var(--radius-input)] border border-[var(--border)] bg-[var(--surface-elevated)] px-2 py-1 text-h2 font-semibold text-foreground outline-none focus-visible:shadow-[var(--focus-ring)]"
              />
            ) : canEditFields ? (
              <button
                type="button"
                onClick={() => setEditingTitle(true)}
                className="mt-0.5 truncate rounded-[var(--radius-sm)] px-1 -mx-1 text-left text-h2 font-semibold text-foreground hover:bg-[var(--hover)]"
              >
                {task.title}
              </button>
            ) : (
              <p className="mt-0.5 truncate text-h2 font-semibold text-foreground">{task.title}</p>
            )}
          </div>
          <button
            type="button"
            aria-label="Close task"
            onClick={() => onOpenChange(false)}
            className="shrink-0 rounded-[var(--radius-sm)] p-1.5 text-muted-foreground hover:bg-[var(--hover)] hover:text-foreground focus-visible:shadow-[var(--focus-ring)] outline-none"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto px-6 py-5">
          <div className="flex flex-wrap items-center gap-x-6 gap-y-3 pb-5">
            <div className="flex items-center gap-2">
              <span className="text-caption text-muted-foreground">Priority</span>
              <Select
                value={task.priority ?? "NONE"}
                onValueChange={(v) => onUpdateField("priority", v === "NONE" ? null : v)}
                disabled={!canEditFields}
              >
                <SelectTrigger className="h-7 w-28 text-caption">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="NONE">None</SelectItem>
                  {PRIORITIES.map((p) => (
                    <SelectItem key={p} value={p}>{p.charAt(0) + p.slice(1).toLowerCase()}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="flex items-center gap-2">
              <span className="text-caption text-muted-foreground">Due date</span>
              <input
                type="date"
                value={task.dueDate ? task.dueDate.slice(0, 10) : ""}
                onChange={(e) => onUpdateField("dueDate", e.target.value || null)}
                disabled={!canEditFields}
                className="rounded-[var(--radius-input)] border border-[var(--border)] bg-[var(--surface-elevated)] px-2 py-1 text-caption text-foreground outline-none focus-visible:shadow-[var(--focus-ring)] disabled:opacity-60"
              />
            </div>

            <div className="flex items-center gap-2">
              <span className="text-caption text-muted-foreground">Assignees</span>
              <div className="flex items-center -space-x-1.5">
                {(assignees ?? []).map((a) => (
                  <button
                    key={a.userID}
                    type="button"
                    disabled={!canAssignMembers}
                    title={canAssignMembers ? `Remove ${a.user.username}` : a.user.username}
                    onClick={() => canAssignMembers && onRemoveAssignee(a.userID)}
                    className="h-6 w-6 rounded-full border-2 border-[var(--surface-elevated)] bg-[var(--surface)] bg-cover bg-center text-[10px] font-medium text-foreground hover:opacity-70 disabled:hover:opacity-100"
                    style={a.user.avatarUrl ? { backgroundImage: `url(${a.user.avatarUrl})` } : undefined}
                  >
                    {!a.user.avatarUrl && a.user.username.slice(0, 1).toUpperCase()}
                  </button>
                ))}
                {canAssignMembers && (
                  <AssigneeSelector
                    open={assigneePopoverOpen}
                    onOpenChange={setAssigneePopoverOpen}
                    members={members}
                    assignedUserIDs={(assignees ?? []).map((a) => a.userID)}
                    onSelect={onAddAssignee}
                  />
                )}
              </div>
            </div>

            {canDeleteTask && (
              <button
                type="button"
                onClick={() => setConfirmDeleteTaskOpen(true)}
                className="ml-auto flex items-center gap-1.5 text-caption text-[var(--error-text)] hover:underline"
              >
                <Trash2 className="h-3.5 w-3.5" />
                Delete task
              </button>
            )}
          </div>

          <section className="pb-6">
            <h3 className="pb-1.5 text-label font-medium text-muted-foreground">Description</h3>
            <Textarea
              value={descDraft}
              onChange={(e) => setDescDraft(e.target.value)}
              onBlur={commitDescription}
              rows={4}
              maxLength={2000}
              placeholder="Add a description…"
              disabled={!canEditFields}
            />
            {canEditFields && (
              <div className="mt-2">
                {!descriptionSuggestion && !descriptionSuggestionLoading && (
                  <button
                    type="button"
                    onClick={onGenerateDescription}
                    className="flex items-center gap-1.5 text-caption text-primary hover:underline"
                  >
                    <Sparkles className="h-3.5 w-3.5" />
                    Expand with AI
                  </button>
                )}

                {descriptionSuggestionLoading && (
                  <div className="flex items-center gap-1.5 text-caption text-muted-foreground">
                    <Loader2 className="h-3.5 w-3.5 animate-spin" />
                    Generating description…
                  </div>
                )}

                {descriptionSuggestionError && !descriptionSuggestionLoading && (
                  <p className="text-caption text-[var(--error-text)]">Failed to generate description.</p>
                )}

                {descriptionSuggestion && !descriptionSuggestionLoading && (
                  <div className="mt-1 flex flex-col gap-2 rounded-[var(--radius-md)] border border-[var(--border)] bg-[var(--surface)] p-3">
                    <p className="whitespace-pre-wrap text-body text-foreground">{descriptionSuggestion}</p>
                    <div className="flex items-center gap-3">
                      <button
                        type="button"
                        onClick={() => {
                          setDescDraft(descriptionSuggestion);
                          onAcceptDescription(descriptionSuggestion);
                        }}
                        className="rounded-[var(--radius-button)] bg-[var(--primary)] px-2.5 py-1 text-caption font-medium text-[var(--primary-foreground)]"
                      >
                        Accept
                      </button>
                      <button type="button" onClick={onDiscardDescription} className="text-caption text-muted-foreground hover:text-foreground">
                        Discard
                      </button>
                      <button type="button" onClick={onGenerateDescription} className="text-caption text-muted-foreground hover:text-foreground">
                        Regenerate
                      </button>
                    </div>
                  </div>
                )}
              </div>
            )}
          </section>

          <section className="pb-6">
            <h3 className="pb-1.5 text-label font-medium text-muted-foreground">
              Subtasks{" "}
              {subtasks.length > 0 && (
                <span className="text-muted-foreground/70">{completedCount}/{subtasks.length}</span>
              )}
            </h3>
            <ul className="flex flex-col gap-1">
              {subtasks.map((s) => (
                <li key={s.id} className="group flex items-center gap-2 rounded-[var(--radius-sm)] px-1.5 py-1 hover:bg-[var(--hover)]">
                  <button
                    type="button"
                    role="checkbox"
                    aria-checked={s.isCompleted}
                    disabled={!canEditFields}
                    onClick={() => onToggleSubtask(s.id, !s.isCompleted)}
                    className={`flex h-4 w-4 shrink-0 items-center justify-center rounded border disabled:opacity-60 ${
                      s.isCompleted ? "border-[var(--primary)] bg-[var(--primary)]" : "border-[var(--border)]"
                    }`}
                  >
                    {s.isCompleted && <Check className="h-3 w-3 text-[var(--primary-foreground)]" />}
                  </button>
                  <span className={`flex-1 text-body ${s.isCompleted ? "text-muted-foreground line-through" : "text-foreground"}`}>
                    {s.title}
                  </span>
                  {canEditFields && (
                    <button
                      type="button"
                      aria-label="Delete subtask"
                      onClick={() => setConfirmDeleteSubtaskId(s.id)}
                      className="shrink-0 rounded p-0.5 text-muted-foreground opacity-0 hover:text-[var(--error-text)] group-hover:opacity-100"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  )}
                </li>
              ))}
            </ul>

            {canCreateSubtaskOnTask && (
              <>
                <div className="mt-2 px-1.5">
                  {!aiSuggestions && !aiSuggestionsLoading && (
                    <button
                      type="button"
                      onClick={handleGenerate}
                      className="flex items-center gap-1.5 text-caption text-primary hover:underline"
                    >
                      <Sparkles className="h-3.5 w-3.5" />
                      Suggest subtasks
                    </button>
                  )}

                  {aiSuggestionsLoading && (
                    <div className="flex items-center gap-1.5 text-caption text-muted-foreground">
                      <Loader2 className="h-3.5 w-3.5 animate-spin" />
                      Generating suggestions…
                    </div>
                  )}

                  {aiSuggestionsError && !aiSuggestionsLoading && (
                    <p className="text-caption text-[var(--error-text)]">Failed to generate suggestions.</p>
                  )}

                  {aiSuggestions && !aiSuggestionsLoading && (
                    <div className="mt-1 flex flex-col gap-1.5 rounded-[var(--radius-md)] border border-[var(--border)] bg-[var(--surface)] p-2">
                      {aiSuggestions.length === 0 ? (
                        <p className="text-caption text-muted-foreground">No suggestions — task looks well covered.</p>
                      ) : (
                        aiSuggestions.map((title) => (
                          <label key={title} className="flex items-center gap-2 text-body text-foreground">
                            <input
                              type="checkbox"
                              checked={selectedSuggestions.has(title)}
                              onChange={() => toggleSuggestion(title)}
                              className="h-4 w-4 rounded border-[var(--border)]"
                            />
                            {title}
                          </label>
                        ))
                      )}
                      <div className="mt-1 flex items-center gap-3">
                        <button
                          type="button"
                          onClick={handleAddSelected}
                          disabled={selectedSuggestions.size === 0}
                          className="rounded-[var(--radius-button)] bg-[var(--primary)] px-2.5 py-1 text-caption font-medium text-[var(--primary-foreground)] disabled:opacity-40"
                        >
                          Add selected ({selectedSuggestions.size})
                        </button>
                        <button
                          type="button"
                          onClick={handleGenerate}
                          className="text-caption text-muted-foreground hover:text-foreground"
                        >
                          Regenerate
                        </button>
                      </div>
                    </div>
                  )}
                </div>
                <form onSubmit={submitSubtask} className="mt-1.5 flex items-center gap-1.5 px-1.5">
                  <Plus className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
                  <input
                    value={subtaskDraft}
                    onChange={(e) => setSubtaskDraft(e.target.value)}
                    placeholder="Add subtask"
                    maxLength={200}
                    className="flex-1 bg-transparent py-1 text-body text-foreground outline-none placeholder:text-muted-foreground"
                  />
                </form>
              </>
            )}
          </section>

          <section>
            <h3 className="pb-1.5 text-label font-medium text-muted-foreground">Comments</h3>
            <ul className="flex flex-col gap-3">
              {comments.map((c) => (
                <li key={c.id} className="group flex gap-2">
                  <div className="mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-[var(--surface)] text-[10px] font-medium text-foreground">
                    {c.user.username.slice(0, 1).toUpperCase()}
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-baseline gap-2">
                      <span className="text-caption font-medium text-foreground">{c.user.username}</span>
                      <span className="text-caption text-muted-foreground">{new Date(c.createdAt).toLocaleString()}</span>
                    </div>
                    <p className="text-body text-foreground">{c.content}</p>
                  </div>
                  {canDeleteComment(c) && (
                    <button
                      type="button"
                      aria-label="Delete comment"
                      onClick={() => onDeleteComment(c.id)}
                      className="shrink-0 self-start rounded p-0.5 text-muted-foreground opacity-0 hover:text-[var(--error-text)] group-hover:opacity-100"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  )}
                </li>
              ))}
            </ul>
            {canCreateComment && (
              <form onSubmit={submitComment} className="mt-3 flex gap-2">
                <input
                  value={commentDraft}
                  onChange={(e) => setCommentDraft(e.target.value)}
                  placeholder="Write a comment…"
                  maxLength={2000}
                  className="flex-1 rounded-[var(--radius-input)] border border-[var(--border)] bg-[var(--surface-elevated)] px-3 py-2 text-body text-foreground outline-none focus-visible:shadow-[var(--focus-ring)]"
                />
                <button
                  type="submit"
                  disabled={!commentDraft.trim()}
                  className="rounded-[var(--radius-button)] bg-[var(--primary)] px-3 py-2 text-caption font-medium text-[var(--primary-foreground)] disabled:opacity-40"
                >
                  Send
                </button>
              </form>
            )}
          </section>
        </div>
      </DialogContent>

      <AlertDialog open={confirmDeleteTaskOpen} onOpenChange={setConfirmDeleteTaskOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete &ldquo;{task.title}&rdquo;?</AlertDialogTitle>
            <AlertDialogDescription>
              This deletes the task along with its subtasks and comments. This can&apos;t be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => {
                setConfirmDeleteTaskOpen(false);
                onDeleteTask();
              }}
              className="bg-[var(--error)] text-[var(--error-foreground)] hover:bg-[var(--error)]/90"
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog open={!!confirmDeleteSubtaskId} onOpenChange={(o) => !o && setConfirmDeleteSubtaskId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete &ldquo;{subtaskPendingDelete?.title}&rdquo;?</AlertDialogTitle>
            <AlertDialogDescription>This can&apos;t be undone.</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => {
                if (confirmDeleteSubtaskId) onDeleteSubtask(confirmDeleteSubtaskId);
                setConfirmDeleteSubtaskId(null);
              }}
              className="bg-[var(--error)] text-[var(--error-foreground)] hover:bg-[var(--error)]/90"
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </Dialog>
  );
}