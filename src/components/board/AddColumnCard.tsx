'use client';

import { useState, useRef, useEffect } from 'react';
import { Plus, X } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import * as z from "zod";
import { api } from '@/lib/fetch';
import { boardKeys } from '@/lib/queryKeys';
import { toast } from 'sonner';

export const columnSchema = z.object({
  title: z.string().min(1).max(100).trim()
});

interface AddColumnCardProps {
  boardId: string;
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
}

export function AddColumnCard({ boardId, open, onOpenChange }: AddColumnCardProps) {
  const [internalOpen, setInternalOpen] = useState(false);
  const isControlled = open !== undefined;
  const isAdding = isControlled ? open : internalOpen;
  const setIsAdding = (value: boolean) => {
    if (isControlled) onOpenChange?.(value);
    else setInternalOpen(value);
  };

 

  const [title, setTitle] = useState('');
  const queryClient = useQueryClient();
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (isAdding) {
      containerRef.current?.scrollIntoView({ behavior: 'smooth', inline: 'end', block: 'nearest' });
    }
  }, [isAdding]);

  const mutation = useMutation({
    mutationFn: (data: z.infer<typeof columnSchema>) =>
      api.post(`/api/boards/${boardId}/columns`, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: boardKeys.detail(boardId) });
      setIsAdding(false);
      setTitle('');
      toast.success('Column created');
    },
    onError: () => toast.error('Failed to create column'),
  });

  const handleSubmit = () => {
    const parsed = columnSchema.safeParse({ title });
    if (!parsed.success) return;
    mutation.mutate(parsed.data);
  };

  const handleCancel = () => {
    setIsAdding(false);
    setTitle('');
  };
 if (isControlled && !isAdding) {
    return null; // header button is the only entry point when controlled
  }
  return (
    <div ref={containerRef} className="shrink-0">
      {!isAdding ? (
        <button onClick={() => setIsAdding(true)}
          className="w-72 shrink-0 h-12 flex items-center gap-2 px-3 rounded-card border border-dashed border-border text-muted-foreground hover:border-primary/40 hover:text-foreground transition-colors"
        >
          <Plus className="w-4 h-4" />
          <span className="text-body">Add column</span>
        </button>
      ) : (
        <div className="w-72 bg-surface border border-border rounded-card p-3 space-y-2 h-fit">
          <Input
            autoFocus
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="Column name"
            onKeyDown={(e) => {
              if (e.key === 'Enter') handleSubmit();
              if (e.key === 'Escape') handleCancel();
            }}
          />
          <div className="flex gap-2">
            <Button size="sm" className="flex-1" onClick={handleSubmit}>
              Add column
            </Button>
            <Button size="sm" variant="outline" onClick={handleCancel} aria-label="Cancel">
              <X className="w-4 h-4" />
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}