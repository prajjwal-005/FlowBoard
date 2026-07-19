import { Skeleton } from '@/components/ui/skeleton';

export function SkeletonCard() {
  return (
    <div className="rounded-card border border-border bg-card p-4 space-y-3">
      <Skeleton className="h-5 w-2/3" />
      <Skeleton className="h-4 w-full" />
      <Skeleton className="h-4 w-1/2" />
      <div className="flex items-center gap-2 pt-2">
        <Skeleton className="h-6 w-6 rounded-full" />
        <Skeleton className="h-3 w-16" />
      </div>
    </div>
  );
}