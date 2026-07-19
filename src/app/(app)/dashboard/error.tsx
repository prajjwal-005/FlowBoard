'use client';

import { AlertTriangle } from 'lucide-react';
import { Button } from '@/components/ui/button';

export default function DashboardError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <div className="h-full flex flex-col items-center justify-center gap-3 text-center">
      <AlertTriangle className="w-8 h-8 text-error" />
      <p className="text-body text-foreground">Couldn&apos;t load your boards.</p>
      <p className="text-caption text-muted-foreground">{error.message}</p>
      <Button onClick={reset} variant="outline" size="sm">
        Try again
      </Button>
    </div>
  );
}