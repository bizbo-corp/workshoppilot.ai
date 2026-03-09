/**
 * Static skeleton placeholders for the workshop grid on the dashboard.
 * Supports both list and grid view modes.
 * No shimmer or pulse animation — static gray blocks only (per user decision).
 */

interface WorkshopGridSkeletonProps {
  viewMode?: 'grid' | 'list';
}

export function WorkshopGridSkeleton({ viewMode = 'list' }: WorkshopGridSkeletonProps) {
  return (
    <div className="mb-6">
      {/* Header row — mirrors WorkshopGrid header */}
      <div className="mb-4 flex items-center justify-between">
        <div className="h-7 w-36 rounded-md bg-accent animate-none" />
        <div className="flex items-center gap-2">
          <div className="h-8 w-16 rounded-md bg-accent animate-none" />
          <div className="h-8 w-20 rounded-lg bg-accent animate-none" />
        </div>
      </div>

      {/* Content */}
      {viewMode === 'list' ? (
        <div className="space-y-2">
          {Array.from({ length: 4 }).map((_, i) => (
            <WorkshopListItemSkeleton key={i} />
          ))}
        </div>
      ) : (
        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {Array.from({ length: 3 }).map((_, i) => (
            <WorkshopCardSkeleton key={i} />
          ))}
        </div>
      )}
    </div>
  );
}

function WorkshopListItemSkeleton() {
  return (
    <div className="flex items-center overflow-hidden rounded-lg border border-border">
      {/* Color strip */}
      <div className="w-1 self-stretch bg-accent animate-none" />
      {/* Emoji circle */}
      <div className="ml-3 size-8 shrink-0 rounded-full bg-accent animate-none" />
      {/* Title + step */}
      <div className="flex-1 min-w-0 px-3 py-3 space-y-1.5">
        <div className="h-4 w-[60%] rounded-md bg-accent animate-none" />
        <div className="h-3 w-[35%] rounded-md bg-accent animate-none" />
      </div>
      {/* Progress dots placeholder */}
      <div className="hidden sm:flex shrink-0 px-2 gap-1">
        {Array.from({ length: 10 }).map((_, i) => (
          <div key={i} className="size-1.5 rounded-full bg-accent animate-none" />
        ))}
      </div>
      {/* Button placeholder */}
      <div className="shrink-0 pr-3">
        <div className="h-8 w-20 rounded-md bg-accent animate-none" />
      </div>
    </div>
  );
}

function WorkshopCardSkeleton() {
  return (
    <div className="overflow-hidden rounded-lg border border-border" style={{ borderLeft: '4px solid var(--accent)' }}>
      {/* Colored header band — circle + title line */}
      <div className="px-6 pt-5 pb-4 bg-accent/30">
        <div className="flex items-start gap-2.5">
          {/* Emoji circle */}
          <div className="size-10 shrink-0 rounded-full bg-accent animate-none" />
          {/* Title lines */}
          <div className="flex-1 min-w-0 space-y-2 pt-1">
            <div className="h-5 w-[70%] rounded-md bg-accent animate-none" />
          </div>
        </div>
      </div>

      {/* Card body — step info, dots, timestamp */}
      <div className="px-6 py-4 space-y-3">
        <div className="h-4 w-[55%] rounded-md bg-accent animate-none" />
        {/* Progress dots */}
        <div className="flex gap-1.5">
          {Array.from({ length: 10 }).map((_, i) => (
            <div key={i} className="size-2 rounded-full bg-accent animate-none" />
          ))}
        </div>
        <div className="h-4 w-[40%] rounded-md bg-accent animate-none" />
      </div>

      {/* Card footer — continue button shape */}
      <div className="border-t px-4 py-4">
        <div className="h-9 w-full rounded-md bg-accent animate-none" />
      </div>
    </div>
  );
}
