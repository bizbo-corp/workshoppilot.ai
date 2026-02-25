/**
 * Static skeleton placeholders for the workshop card grid on the dashboard.
 * No shimmer or pulse animation — static gray blocks only (per user decision).
 * Grid layout matches the active WorkshopGrid: gap-6 sm:grid-cols-2 lg:grid-cols-3.
 */
export function WorkshopGridSkeleton() {
  return (
    <div className="mb-6">
      {/* Header row — mirrors WorkshopGrid header */}
      <div className="mb-4 flex items-center gap-3">
        <div className="h-7 w-36 rounded-md bg-accent animate-none" />
      </div>

      {/* Card grid */}
      <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
        {Array.from({ length: 3 }).map((_, i) => (
          <WorkshopCardSkeleton key={i} />
        ))}
      </div>
    </div>
  );
}

function WorkshopCardSkeleton() {
  return (
    <div className="overflow-hidden rounded-lg border border-border">
      {/* Colored header band — circle + title line */}
      <div className="px-6 pt-5 pb-4 bg-accent/30">
        <div className="flex items-start gap-2.5">
          {/* Emoji circle */}
          <div className="size-10 shrink-0 rounded-full bg-accent animate-none" />
          {/* Title lines */}
          <div className="flex-1 min-w-0 space-y-2 pt-1">
            <div className="h-5 w-[70%] rounded-md bg-accent animate-none" />
            <div className="h-4 w-[45%] rounded-md bg-accent animate-none" />
          </div>
        </div>
      </div>

      {/* Card body — step info and timestamp */}
      <div className="px-6 py-4 space-y-3">
        <div className="h-4 w-[55%] rounded-md bg-accent animate-none" />
        <div className="h-4 w-[40%] rounded-md bg-accent animate-none" />
      </div>

      {/* Card footer — continue button shape */}
      <div className="px-6 pb-5">
        <div className="h-9 w-28 rounded-md bg-accent animate-none" />
      </div>
    </div>
  );
}
