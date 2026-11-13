function Skeleton({ className = "" }: { className?: string }) {
  return <div className={`animate-pulse rounded-control bg-slate-200/70 dark:bg-slate-800/70 ${className}`} />;
}

export default function DashboardLoading() {
  return (
    <div aria-label="Loading dashboard" className="space-y-6">
      <div className="flex items-start justify-between gap-4">
        <div className="space-y-3">
          <Skeleton className="h-8 w-48" />
          <Skeleton className="h-4 w-80 max-w-[70vw]" />
        </div>
        <Skeleton className="h-10 w-32" />
      </div>
      <div className="grid gap-3 sm:grid-cols-3">
        <Skeleton className="h-28" />
        <Skeleton className="h-28" />
        <Skeleton className="h-28" />
      </div>
      <Skeleton className="h-96 w-full" />
    </div>
  );
}
