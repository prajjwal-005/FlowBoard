import { Skeleton } from '@/components/ui/skeleton';

export default function BoardLoading() {
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