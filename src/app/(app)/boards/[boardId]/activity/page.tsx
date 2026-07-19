'use client';

import { useParams } from 'next/navigation';
import Link from 'next/link';
import { ArrowLeft } from 'lucide-react';
import { ActivityFeed } from '@/components/activity/ActivityFeed';
import { useBoard } from '@/hooks/useBoard';

export default function BoardActivityPage() {
  const { boardId } = useParams<{ boardId: string }>();
  const { data: board } = useBoard(boardId);

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <div>
        <Link
          href={`/boards/${boardId}`}
          className="inline-flex items-center gap-1.5 text-caption text-muted-foreground hover:text-foreground"
        >
          <ArrowLeft className="w-3.5 h-3.5" />
          Back to board
        </Link>
        <h1 className="text-h1 font-semibold text-foreground mt-2">
          Activity {board?.name ? `— ${board.name}` : ''}
        </h1>
      </div>
      <ActivityFeed boardId={boardId} />
    </div>
  );
}