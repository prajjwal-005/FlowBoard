'use client';

import { useState, useEffect } from 'react';
import { useParams } from 'next/navigation';
import { Loader2, Trash2, UserPlus, Save } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Field, FieldLabel, FieldError } from '@/components/ui/field';
import { Textarea } from '@/components/ui/textarea';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { useMembers } from '@/hooks/useMembers';
import { useCurrentUser } from '@/hooks/useCurrentUser';
import { useAddMember, useRemoveMember, useChangeRole } from '@/hooks/useMemberMutations';
import { useBoard, useDeleteBoard, useUpdateBoard } from '@/hooks/useBoard';
import { canChangeRole, canRemoveMember, canAddMember, canDeleteBoard, canUpdateBoard } from '@/lib/rbac-client';
import type { Role } from '@/types/api';
import { toast } from 'sonner';
import { useMemberEvents } from '@/hooks/realtime/useMemberEvents';
import { useBoardEvents } from '@/hooks/realtime/useBoardEvents';

export default function BoardSettingsPage() {
  
  const { boardId } = useParams<{ boardId: string }>();
  const { data: board } = useBoard(boardId);
  
  const { data: currentUser } = useCurrentUser();
  const { data: members, isLoading } = useMembers(boardId);
  const addMember = useAddMember(boardId);
  const removeMember = useRemoveMember(boardId);
  const changeRole = useChangeRole(boardId);
  const deleteBoard = useDeleteBoard(boardId);
  const updateBoard = useUpdateBoard(boardId);

  const [identifier, setIdentifier] = useState('');
  const [confirmDeleteOpen, setConfirmDeleteOpen] = useState(false);
  const [nameDraft, setNameDraft] = useState('');
  const [descDraft, setDescDraft] = useState('');
  const [prevBoardId, setPrevBoardId] = useState<string | undefined>(undefined);
  useMemberEvents(boardId)
  useBoardEvents(boardId) 
  if (board && prevBoardId !== board.id) {
        setPrevBoardId(board.id);
        setNameDraft(board.name);
        setDescDraft(board.description ?? '');
  }

  const myRole = members?.find((m) => m.userID === currentUser?.id)?.role as Role | undefined;

  if (isLoading || !myRole || !board) {
    return (
      <div className="h-full flex items-center justify-center">
        <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  const isUnchanged = nameDraft === board.name && descDraft === (board.description ?? '');

  const handleSaveBoard = () => {
    updateBoard.mutate(
      { name: nameDraft, description: descDraft || undefined },
      {
        onSuccess: () => toast.success('Board updated'),
        onError: (err) => toast.error(err instanceof Error ? err.message : 'Failed to update board'),
      }
    );
  };

  const handleAdd = () => {
    if (!identifier.trim()) return;
    addMember.mutate(identifier.trim(), {
      onSuccess: () => { toast.success('Member added'); setIdentifier(''); },
      onError: (err) => toast.error(err instanceof Error ? err.message : 'Failed to add member'),
    });
  };

  const handleRemove = (username: string) => {
    removeMember.mutate(username, {
      onSuccess: () => toast.success('Member removed'),
      onError: (err) => toast.error(err instanceof Error ? err.message : 'Failed to remove member'),
    });
  };

  const handleRoleChange = (username: string, role: string) => {
    changeRole.mutate({ identifier: username, role }, {
      onSuccess: () => toast.success('Role updated'),
      onError: (err) => toast.error(err instanceof Error ? err.message : 'Failed to update role'),
    });
  };

  const handleDeleteBoard = () => {
    deleteBoard.mutate(undefined, {
      onSuccess: () => { window.location.href = '/dashboard'; },
      onError: (err) => toast.error(err instanceof Error ? err.message : 'Failed to delete board'),
    });
  };

  return (
    <div className="max-w-2xl mx-auto space-y-8">
      <h1 className="text-h1 font-semibold text-foreground">Board Settings</h1>

      {canUpdateBoard(myRole) ? (
        <div className="space-y-3">
          <h2 className="text-h2 font-medium text-foreground">Board details</h2>
          <Field>
            <FieldLabel htmlFor="board-name">Name</FieldLabel>
            <input
              id="board-name"
              value={nameDraft}
              onChange={(e) => setNameDraft(e.target.value)}
              maxLength={100}
              className="w-full rounded-input border border-border bg-surface-elevated px-3 py-2 text-body text-foreground outline-none focus-visible:shadow-[var(--focus-ring)]"
            />
          </Field>
          <Field>
            <FieldLabel htmlFor="board-description">Description</FieldLabel>
            <Textarea
              id="board-description"
              value={descDraft}
              onChange={(e) => setDescDraft(e.target.value)}
              maxLength={1000}
              rows={3}
              placeholder="What's this board for?"
            />
          </Field>
          <Button onClick={handleSaveBoard} disabled={isUnchanged || updateBoard.isPending} className="gap-1.5">
            <Save className="w-4 h-4" />
            {updateBoard.isPending ? 'Saving…' : 'Save changes'}
          </Button>
        </div>
      ) : (
        <div className="space-y-1">
          <h2 className="text-h2 font-medium text-foreground">{board.name}</h2>
          {board.description && <p className="text-body text-muted-foreground">{board.description}</p>}
        </div>
      )}

      {canAddMember(myRole) && (
        <Field>
          <FieldLabel htmlFor="add-member">Add member (email or username)</FieldLabel>
          <div className="flex gap-2">
            <input
              id="add-member"
              value={identifier}
              onChange={(e) => setIdentifier(e.target.value)}
              placeholder="jane_doe or jane@example.com"
              className="flex-1 rounded-input border border-border bg-surface-elevated px-3 py-2 text-body text-foreground outline-none focus-visible:shadow-[var(--focus-ring)]"
            />
            <Button onClick={handleAdd} disabled={addMember.isPending} className="gap-1.5">
              <UserPlus className="w-4 h-4" />
              {addMember.isPending ? 'Adding…' : 'Add'}
            </Button>
          </div>
        </Field>
      )}

      <div className="space-y-3">
        <h2 className="text-h2 font-medium text-foreground">Members</h2>
        <div className="rounded-card border border-border divide-y divide-border">
          {members?.map((m) => (
            <div key={m.userID} className="flex items-center justify-between px-4 py-3">
              <div className="flex items-center gap-3 min-w-0">
                <Avatar className="h-8 w-8">
                  <AvatarImage src={m.user.avatarUrl ?? undefined} />
                  <AvatarFallback className="bg-primary/10 text-primary text-xs">
                    {m.user.username.substring(0, 2).toUpperCase()}
                  </AvatarFallback>
                </Avatar>
                <span className="text-body text-foreground truncate">{m.user.username}</span>
              </div>

              <div className="flex items-center gap-3 shrink-0">
                {canChangeRole(myRole) && m.role !== 'OWNER' ? (
                  <Select value={m.role} onValueChange={(role) => handleRoleChange(m.user.username, role)}>
                    <SelectTrigger className="h-8 w-28 text-caption">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="VIEWER">Viewer</SelectItem>
                      <SelectItem value="MEMBER">Member</SelectItem>
                      <SelectItem value="ADMIN">Admin</SelectItem>
                    </SelectContent>
                  </Select>
                ) : (
                  <span className="text-caption text-muted-foreground w-28 text-right">{m.role}</span>
                )}

                {canRemoveMember(myRole) && m.role !== 'OWNER' && m.userID !== currentUser?.id && (
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8 text-error hover:text-error"
                    aria-label={`Remove ${m.user.username}`}
                    onClick={() => handleRemove(m.user.username)}
                  >
                    <Trash2 className="w-4 h-4" />
                  </Button>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>

      {canDeleteBoard(myRole) && (
        <div className="pt-6 border-t border-error/30 space-y-3">
          <h2 className="text-h2 font-medium text-error">Danger Zone</h2>
          <p className="text-caption text-muted-foreground">
            Deleting this board permanently removes all columns, tasks, and activity. This cannot be undone.
          </p>
          <Button variant="destructive" onClick={() => setConfirmDeleteOpen(true)}>
            Delete Board
          </Button>
        </div>
      )}

      <AlertDialog open={confirmDeleteOpen} onOpenChange={setConfirmDeleteOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete this board?</AlertDialogTitle>
            <AlertDialogDescription>
              This permanently deletes all columns, tasks, subtasks, comments, and activity history. This can&apos;t be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={deleteBoard.isPending}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDeleteBoard}
              disabled={deleteBoard.isPending}
              className="bg-error text-error-foreground hover:bg-error/90"
            >
              {deleteBoard.isPending ? 'Deleting…' : 'Delete'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}