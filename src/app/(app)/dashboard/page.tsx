'use client';

import { useBoards } from '@/hooks/useBoards';
import { Button } from '@/components/ui/button';
import { Plus, SquareKanban } from 'lucide-react';
import { useUIStore } from '@/store/uiStore';
import { BoardCard } from '@/components/board/BoardCard'; 
import { SkeletonCard } from '@/components/shared/SkeletonCard';


export default function DashboardPage() {
  const { data: boards, isLoading, error } = useBoards();
  const { setActiveModal } = useUIStore();

  if (error) {
    return (
      <div className="h-full flex items-center justify-center text-error">
        Failed to load boards. Please refresh the page.
      </div>
    );
  }

    if (isLoading) {
    return (
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {Array.from({ length: 6 }).map((_, i) => (
          <SkeletonCard key={i} />
        ))}
      </div>
    );
  }

  return (
    <div className="max-w-6xl mx-auto space-y-8">
      {/* Dashboard Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-h1 font-semibold text-foreground tracking-tight">Boards</h1>
          <p className="text-body text-muted-foreground mt-1">
            Manage your projects and workflows
          </p>
        </div>
        <Button onClick={() => setActiveModal('createBoard')} className="gap-2">
          <Plus className="w-4 h-4" />
          Create Board
        </Button>
      </div>

      {/* Empty State */}
      {(!boards || boards.length === 0) && (
        <div className="border border-dashed border-border rounded-card bg-surface/50 p-12 flex flex-col items-center justify-center text-center space-y-4">
          <div className="h-12 w-12 rounded-full bg-primary/10 flex items-center justify-center mb-2">
            <SquareKanban className="w-6 h-6 text-primary" />
          </div>
          <h3 className="text-h3 font-medium text-foreground">No boards yet</h3>
          <p className="text-body text-muted-foreground max-w-sm">
            Create your first board to start tracking tasks and collaborating with your team.
          </p>
          <Button 
            onClick={() => setActiveModal('createBoard')} 
            variant="outline" 
            className="mt-2"
          >
            Create your first board
          </Button>
        </div>
      )}

      {/* Populated State */}
      {boards && boards.length > 0 && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {boards.map((board) => (
            <BoardCard key={board.id} board={board} />
          ))}
        </div>
      )}
    </div>
  );
}
