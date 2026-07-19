'use client';

import Link from 'next/link';
import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardFooter,
} from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import type { Board } from '@/types/api';

interface BoardCardProps {
  board: Board;
}

export function BoardCard({ board }: BoardCardProps) {
  const role = board.role;

  return (
    <Link href={`/boards/${board.id}`} className="block group">
      <Card className="border-border bg-card shadow-sm hover:shadow-md hover:border-primary/30 transition-all duration-200 h-full">
        <CardHeader className="space-y-2">
          <div className="flex items-start justify-between gap-3">
            <CardTitle className="text-h3 font-medium text-foreground group-hover:text-primary transition-colors line-clamp-1">
              {board.name}
            </CardTitle>
            {role && (
              <Badge variant="secondary" className="shrink-0 text-[10px] font-medium uppercase tracking-wide">
                {role}
              </Badge>
            )}
          </div>
          <CardDescription className="text-caption text-muted-foreground line-clamp-2 min-h-[2.5rem]">
            {board.description || 'No description provided.'}
          </CardDescription>
        </CardHeader>

        <CardFooter className="pt-0">
          <p className="text-caption text-muted-foreground">
            Updated {new Date(board.updatedAt).toLocaleDateString('en-US', {
              month: 'short',
              day: 'numeric',
            })}
          </p>
        </CardFooter>
      </Card>
    </Link>
  );
}