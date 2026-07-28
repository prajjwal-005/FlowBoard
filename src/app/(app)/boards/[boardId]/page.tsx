'use client';

import { useState } from 'react';
import { useParams } from 'next/navigation';
import { Skeleton } from '@/components/ui/skeleton';
import { Plus, GripVertical, History, Settings} from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  DndContext,
  DragOverlay,
} from '@dnd-kit/core';
import {
  SortableContext,
  horizontalListSortingStrategy,
  verticalListSortingStrategy,
  useSortable,
} from '@dnd-kit/sortable';
import { useUpdateComment } from '@/hooks/useComments';
import { CSS } from '@dnd-kit/utilities';
import { useBoard } from '@/hooks/useBoard';
import { useTask } from '@/hooks/useTasks';
import { useCreateTask, useUpdateTask, useDeleteTask } from '@/hooks/useTask';
import { useMembers } from '@/hooks/useMembers';
import { useRenameColumn, useDeleteColumn } from '@/hooks/useColumns';
import { useCreateSubtask, useUpdateSubtask, useDeleteSubtask } from '@/hooks/useSubtasks';
import { useCreateComment, useDeleteComment } from '@/hooks/useComments';
import { useAddAssignee, useRemoveAssignee } from '@/hooks/useAssignees';
import { useBoardDnd } from '@/hooks/useBoardDnd';
import { TaskCard } from '@/components/board/TaskCard';
import { AddColumnCard } from '@/components/board/AddColumnCard';
import { ColumnHeaderMenu } from '@/components/board/ColumnHeaderMenu';
import { CreateTaskModal } from '@/components/board/CreateTaskModal';
import { TaskDetailModal } from '@/components/board/TaskDetailModal';
import { useUIStore } from '@/store/uiStore';
import { canDeleteTask, canDeleteComment, canCreateColumn, canUpdateColumn, canCreateTask, canDragTask , canEditTaskFields, canCreateSubtaskOnTask, canCreateComment, canAssignMembers } from '@/lib/rbac-client';
import { useCurrentUser } from '@/hooks/useCurrentUser';
import Link from 'next/link';
import type { Column ,Role} from '@/types/api';
import { ErrorBoundary } from '@/components/shared/ErrorBoundary';
import { useSubtaskSuggestions, useDescriptionExpansion, useGenerateBoardSummary   } from '@/hooks/useAI';
import { suggestionsKey, descriptionExpansionKey } from '@/lib/queryKeys';
import { toast } from 'sonner';
import { BoardSummaryButton } from '@/components/ai/BoardSummaryButton';
import { useQueryClient } from '@tanstack/react-query';
import { useBoardRoom } from '@/hooks/realtime/useBoardRoom';
import { useTaskEvents } from '@/hooks/realtime/useTaskEvents';
import { useColumnEvents } from '@/hooks/realtime/useColumnEvents';
import { useBoardEvents } from '@/hooks/realtime/useBoardEvents';
import { useSubtaskEvents } from '@/hooks/realtime/useSubtaskEvents'
import { useCommentEvents } from '@/hooks/realtime/useCommentEvents'
import { useAssigneeEvents } from '@/hooks/realtime/useAssigneeEvents'
import { useMemberEvents } from '@/hooks/realtime/useMemberEvents'
import { PresenceStack } from '@/components/board/PresenceStack';
export default function BoardDetailPage() {
  const params = useParams<{ boardId: string }>();
  const { data: board, isLoading, error } = useBoard(params.boardId);
  useBoardRoom(params.boardId)
  useTaskEvents(params.boardId)
  useColumnEvents(params.boardId)
  useBoardEvents(params.boardId)
  useSubtaskEvents(params.boardId)    // add
  useCommentEvents(params.boardId)    // add
  useAssigneeEvents(params.boardId)   // add
  useMemberEvents(params.boardId)     // ad
  const { data: currentUser } = useCurrentUser();

  const createTaskColumnId = useUIStore((s) => s.createTaskColumnId);
  const setCreateTaskColumnId = useUIStore((s) => s.setCreateTaskColumnId);
  const selectedTaskId = useUIStore((s) => s.selectedTaskId);
  const setSelectedTaskId = useUIStore((s) => s.setSelectedTaskId);
  const closeModal = useUIStore((s) => s.closeModal);
  const generateSummary = useGenerateBoardSummary(params.boardId);

  const activeColumnId = board?.columns.find((c) =>
    c.tasks.some((t) => t.id === selectedTaskId)
  )?.id;
  const queryClient = useQueryClient();
  const {
    data: aiSuggestions,
    isFetching: aiSuggestionsLoading,
    isError: aiSuggestionsError,
    refetch: generateSuggestions,
    } = useSubtaskSuggestions(params.boardId, activeColumnId ?? "", selectedTaskId ?? "");
  const {
    data: descriptionSuggestion,
    isFetching: descriptionSuggestionLoading,
    isError: descriptionSuggestionError,
    refetch: generateDescription,
    } = useDescriptionExpansion(params.boardId, activeColumnId ?? "", selectedTaskId ?? "");
  const { mutate: createTask, isPending: isCreating } = useCreateTask(
    params.boardId,
    createTaskColumnId ?? ""
  );
  const [addColumnOpen, setAddColumnOpen] = useState(false);
  const { data: members } = useMembers(params.boardId);
  const { data: task } = useTask(params.boardId, activeColumnId ?? "", selectedTaskId ?? "");
  const { mutate: updateTask } = useUpdateTask(params.boardId, activeColumnId ?? "", selectedTaskId ?? "");
  const { mutate: deleteTask } = useDeleteTask(params.boardId, activeColumnId ?? "");
  const { mutate: addSubtask } = useCreateSubtask(params.boardId, activeColumnId ?? "", selectedTaskId ?? "");
  const { mutate: toggleSubtask } = useUpdateSubtask(params.boardId, activeColumnId ?? "", selectedTaskId ?? "");
  const { mutate: deleteSubtask } = useDeleteSubtask(params.boardId, activeColumnId ?? "", selectedTaskId ?? "");
  const { mutate: addComment } = useCreateComment(params.boardId, activeColumnId ?? "", selectedTaskId ?? "");
  const { mutate: deleteComment } = useDeleteComment(params.boardId, activeColumnId ?? "", selectedTaskId ?? "");
  const { mutate: addAssignee } = useAddAssignee(params.boardId, activeColumnId ?? "", selectedTaskId ?? "");
  const { mutate: removeAssignee } = useRemoveAssignee(params.boardId, activeColumnId ?? "", selectedTaskId ?? "");
  const { mutate: updateComment } = useUpdateComment(params.boardId, activeColumnId ?? "", selectedTaskId ?? "");

  const {
    sensors,
    collisionDetection,
    activeId,
    activeType,
    handleDragStart,
    handleDragOver,
    handleDragEnd,
  } = useBoardDnd(params.boardId);
  function handleAddSuggestions(titles: string[]) {
    titles.forEach((title) => addSubtask({ title }));
    // remove added titles from cached suggestions so they don't linger in the checklist
    queryClient.setQueryData(
        suggestionsKey(params.boardId, selectedTaskId ?? ""),
        (old: string[] | undefined) => old?.filter((t) => !titles.includes(t))
    );
  }  
  function handleAcceptDescription(text: string) {
    updateTask({ description: text });
    queryClient.removeQueries({ queryKey: descriptionExpansionKey(params.boardId, selectedTaskId ?? "") });
  }

  function handleDiscardDescription() {
    queryClient.removeQueries({ queryKey: descriptionExpansionKey(params.boardId, selectedTaskId ?? "") });
  }
  const myRole = board?.role;
  const currentUserID = currentUser?.id ?? "";
  
  if (isLoading) {
return (
    <div className="h-full flex flex-col">
      <div className="mb-6 space-y-2">
        <Skeleton className="h-7 w-48" />
        <Skeleton className="h-4 w-72" />
      </div>
      <div className="flex gap-4 flex-1">
        {Array.from({ length: 3 }).map((_, i) => (
          <div key={i} className="w-72 shrink-0 space-y-3">
            <Skeleton className="h-8 w-full" />
            <Skeleton className="h-20 w-full" />
            <Skeleton className="h-20 w-full" />
          </div>
        ))}
      </div>
    </div>
  );
  }

  if (error) {
    return (
      <div className="h-full flex items-center justify-center text-error">
        Failed to load board. Please refresh the page.
      </div>
    );
  }

  const activeColumn = activeType === 'column' ? board?.columns.find((c) => c.id === activeId) : undefined;
  const activeTask =
    activeType === 'task' ? board?.columns.flatMap((c) => c.tasks).find((t) => t.id === activeId) : undefined;

  return (
    <div className="h-full flex flex-col">
     <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
        {/* Left side: title + description */}
        <div className="min-w-0 flex-1">
            <h1 className="text-3xl font-bold tracking-tight break-words">
            {board?.name}
            </h1>
            {board?.description && (
            <p className="mt-2 max-w-2xl text-sm sm:text-base text-muted-foreground break-words">
                {board.description}
            </p>
            )}
        </div>


  {/* Right side: presence + actions */}
  <div className="flex flex-col gap-3 lg:items-end shrink-0">
    <div className="flex justify-start lg:justify-end">
      <PresenceStack boardId={params.boardId} />
    </div>

    <div className="flex flex-wrap items-center gap-2 justify-start lg:justify-end">
      <Link href={`/boards/${params.boardId}/settings`}>
        <Button variant="outline" size="sm" className="gap-1.5 whitespace-nowrap">
          <Settings className="w-3.5 h-3.5" />
          <span className="hidden sm:inline">Settings</span>
        </Button>
      </Link>

      <Link href={`/boards/${params.boardId}/activity`}>
        <Button variant="outline" size="sm" className="gap-1.5 whitespace-nowrap">
          <History className="w-3.5 h-3.5" />
          <span className="hidden sm:inline">Activity</span>
        </Button>
      </Link>

      <BoardSummaryButton
        summary={board?.summary ?? null}
        summaryGeneratedAt={board?.summaryGeneratedAt ?? null}
        isPending={generateSummary.isPending}
        onGenerate={() =>
          generateSummary.mutate(undefined, {
            onError: () => toast.error("Failed to generate board summary"),
          })
        }
      />

      {myRole && canCreateColumn(myRole) && (
        <Button className="gap-2 whitespace-nowrap" onClick={() => setAddColumnOpen(true)}>
          <Plus className="w-4 h-4" />
          <span>Add Column</span>
        </Button>
      )}

      {myRole && (
        <span className="text-caption font-medium text-muted-foreground bg-surface border border-border rounded-full px-2 py-0.5 whitespace-nowrap">
          {myRole}
        </span>
      )}
    </div>
  </div>
</div>
 
<div className="mt-6 flex-1 min-h-0">

    <ErrorBoundary fallback={<div className="p-6 text-center text-muted-foreground">Board view crashed. Try refreshing.</div>}>
        <DndContext
            sensors={sensors}
            collisionDetection={collisionDetection}
            onDragStart={handleDragStart}
            onDragOver={handleDragOver}
            onDragEnd={handleDragEnd}
        >
            <div className="flex-1 overflow-x-auto overflow-y-hidden">
            <SortableContext
                items={board?.columns.map((c) => c.id) ?? []}
                strategy={horizontalListSortingStrategy}
            >
                <div className="flex gap-4 h-full pb-4 min-w-max">
                {board?.columns.map((column) => (
                    <ColumnShell key={column.id} column={column} boardId={params.boardId} myRole={myRole} currentUserID={currentUserID} />
                ))}

                {myRole && canCreateColumn(myRole) && (
                <AddColumnCard boardId={params.boardId} open={addColumnOpen} onOpenChange={setAddColumnOpen} />
                )}                
                </div>
            </SortableContext>
            </div>

            <DragOverlay>
            {activeColumn && (
                <div className="w-72 bg-surface border border-border rounded-card shadow-drag p-3 opacity-90">
                {activeColumn.title}
                </div>
            )}
            {activeTask && (
                <div className="bg-card border border-border rounded-card p-3 shadow-drag opacity-90">
                {activeTask.title}
                </div>
            )}
            </DragOverlay>
        </DndContext>
    </ErrorBoundary>
    </div>
      {createTaskColumnId && (
        <CreateTaskModal
          open={!!createTaskColumnId}
          onOpenChange={(open) => !open && closeModal()}
          onSubmit={(data) => createTask(data, { onSuccess: () => setCreateTaskColumnId(null) })}
          isSubmitting={isCreating}
          columnTitle={board?.columns.find((c) => c.id === createTaskColumnId)?.title ?? ""}
        />
      )}

      {selectedTaskId && activeColumnId && task && myRole && (
        <TaskDetailModal
        
          open={!!selectedTaskId}
          onOpenChange={(open) => !open && closeModal()}
          columnTitle={board?.columns.find((c) => c.id === activeColumnId)?.title ?? ""}
          task={{
            ...task,
            dueDate: task.dueDate ? new Date(task.dueDate).toISOString() : null,
          }}
          members={members ?? []}
          assignees={task.assignees}
          subtasks={task.subtasks}
          comments={task.comments}
          currentUserID={currentUserID}
          canDeleteTask={canDeleteTask(myRole)}
          canDeleteComment={(c) => canDeleteComment(myRole, c, currentUserID)}
          canEditComment={(c) => c.userID === currentUserID}
          onRenameSubtask={(id, title) => toggleSubtask({ subtaskId: id, title })}
          onUpdateComment={(id, content) => updateComment({ commentId: id, content })}
          onUpdateField={(field, value) => updateTask({ [field]: value })}
          onDeleteTask={() => deleteTask(selectedTaskId, { onSuccess: () => setSelectedTaskId(null) })}
          onAddSubtask={(title) => addSubtask({ title })}
          onToggleSubtask={(id, isCompleted) => toggleSubtask({ subtaskId: id, isCompleted })}
          onDeleteSubtask={deleteSubtask}
          onAddComment={(content) => addComment({ content })}
          onDeleteComment={deleteComment}
          onAddAssignee={(userID) => addAssignee(userID)}
          onRemoveAssignee={removeAssignee}
          aiSuggestions={aiSuggestions}
          aiSuggestionsLoading={aiSuggestionsLoading}
          aiSuggestionsError={aiSuggestionsError}
          onGenerateSuggestions={() => generateSuggestions()}
          onAddSuggestions={handleAddSuggestions}
          descriptionSuggestion={descriptionSuggestion}
          descriptionSuggestionLoading={descriptionSuggestionLoading}
          descriptionSuggestionError={descriptionSuggestionError}
          onGenerateDescription={() => generateDescription()}
          onAcceptDescription={handleAcceptDescription}
          onDiscardDescription={handleDiscardDescription}
          canEditFields={myRole ? canEditTaskFields(myRole, task, currentUserID) : false}
          canCreateSubtaskOnTask={myRole ? canCreateSubtaskOnTask(myRole) : false}
          canCreateComment={myRole ? canCreateComment(myRole) : false}
          canAssignMembers={myRole ? canAssignMembers(myRole) : false}
        />
      )}
    </div>
  );
}

function ColumnShell({ column, boardId, myRole, currentUserID }: { column: Column; boardId: string; myRole?: Role; currentUserID: string }) {
  const { mutate: renameColumn, isPending: isRenaming } = useRenameColumn(boardId);
  const { mutate: deleteColumn, isPending: isDeleting } = useDeleteColumn(boardId);
  const setCreateTaskColumnId = useUIStore((s) => s.setCreateTaskColumnId);
  const setSelectedTaskId = useUIStore((s) => s.setSelectedTaskId);
  const canDrag = myRole ? canUpdateColumn(myRole) : false;
  

  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: column.id,
    data: { type: 'column' },
    disabled: !canDrag, // blocks drag entirely for MEMBER/VIEWER, not just the handle's visibility
  });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  };

  return (
    <div ref={setNodeRef} style={style} className="w-72 shrink-0 flex flex-col bg-surface border border-border rounded-card h-full">
      <div className="shrink-0 flex items-center border-b border-border/60 group">
        {canDrag && (
          <button
            {...attributes}
            {...listeners}
            className="cursor-grab active:cursor-grabbing px-1 text-muted-foreground hover:text-foreground hidden md:block"
            aria-label="Drag column"
          >
            <GripVertical className="w-4 h-4" />
          </button>
        )}

        <div className="flex-1 min-w-0">
          <ColumnHeaderMenu
            title={column.title}
            taskCount={column.tasks.length}
            canEdit={canDrag}
            onRename={(newTitle) => renameColumn({ columnId: column.id, title: newTitle })}
            onDelete={() => deleteColumn(column.id)}
            isRenaming={isRenaming}
            isDeleting={isDeleting}
          />
        </div>

        {myRole && canCreateTask(myRole) && (
          <Button
            variant="ghost"
            size="icon"
            className="h-6 w-6 mr-2 shrink-0"
            aria-label="Add task"
            onClick={() => {
              setSelectedTaskId(null);
              setCreateTaskColumnId(column.id);
            }}
          >
            <Plus className="w-3.5 h-3.5" />
          </Button>
        )}
      </div>

      <SortableContext items={column.tasks.map((t) => t.id)} strategy={verticalListSortingStrategy}>
            <div className="flex-1 overflow-y-auto px-2 py-2 space-y-2">
                {column.tasks.length === 0 ? (
                <div className="text-caption text-muted-foreground text-center py-8">No tasks</div>
                ) : (
                column.tasks.map((t) => (
                    <TaskCard
                    key={t.id}
                    task={t}
                    canDrag={myRole ? canDragTask(myRole, t, currentUserID) : false}
                    onClick={() => {
                        setCreateTaskColumnId(null);
                        setSelectedTaskId(t.id);
                    }}
                    />
                ))
                )}
            </div>
        </SortableContext>
    </div>
  );
}