'use client';

import { Sparkles, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';

interface BoardSummaryButtonProps {
  summary: string | null;
  summaryGeneratedAt: string | null;
  isPending: boolean;
  onGenerate: () => void;
}

export function BoardSummaryButton({
  summary,
  summaryGeneratedAt,
  isPending,
  onGenerate,
}: BoardSummaryButtonProps) {
  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button variant="outline" size="sm" className="gap-1.5">
          <Sparkles className="w-3.5 h-3.5" />
          Board summary
        </Button>
      </PopoverTrigger>
      <PopoverContent align="end" className="w-80 flex flex-col gap-3">
        {summary ? (
          <p className="text-body text-foreground">{summary}</p>
        ) : (
          <p className="text-body text-muted-foreground">No summary generated yet.</p>
        )}

        <div className="flex items-center justify-between gap-2">
          <span className="text-caption text-muted-foreground/70">
            {summaryGeneratedAt
              ? `Last summarized ${new Date(summaryGeneratedAt).toLocaleString()}`
              : 'Never summarized'}
          </span>
          <Button size="sm" className="h-7 gap-1.5 shrink-0" onClick={onGenerate} disabled={isPending}>
            {isPending ? (
              <Loader2 className="w-3.5 h-3.5 animate-spin" />
            ) : (
              <Sparkles className="w-3.5 h-3.5" />
            )}
            {summary ? 'Regenerate' : 'Summarize'}
          </Button>
        </div>
      </PopoverContent>
    </Popover>
  );
}