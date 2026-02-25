'use client';

/**
 * Static gray skeleton placeholders for the chat message history.
 * No shimmer or pulse animation — static gray blocks only (per user decision).
 * Uses bg-accent with animate-none to override shadcn Skeleton default pulse.
 */
export function ChatSkeleton() {
  return (
    <div className="flex h-full flex-col p-4 space-y-6">
      {/* AI avatar at top — mirrors actual chat layout */}
      <div className="flex justify-center mb-2">
        <div className="size-10 shrink-0 rounded-full bg-accent animate-none" />
      </div>

      {/* AI message 1 — wide left-aligned */}
      <div className="flex items-start gap-3">
        <div className="size-8 shrink-0 rounded-full bg-accent animate-none" />
        <div className="flex-1 space-y-2 max-w-[70%]">
          <div className="h-4 w-full rounded-md bg-accent animate-none" />
          <div className="h-4 w-[88%] rounded-md bg-accent animate-none" />
          <div className="h-4 w-[72%] rounded-md bg-accent animate-none" />
        </div>
      </div>

      {/* User message 1 — narrow right-aligned */}
      <div className="flex items-start justify-end gap-3">
        <div className="flex-1 space-y-2 max-w-[42%] items-end flex flex-col">
          <div className="h-4 w-full rounded-md bg-accent animate-none" />
          <div className="h-4 w-[80%] rounded-md bg-accent animate-none" />
        </div>
        <div className="size-8 shrink-0 rounded-full bg-accent animate-none" />
      </div>

      {/* AI message 2 — wide left-aligned */}
      <div className="flex items-start gap-3">
        <div className="size-8 shrink-0 rounded-full bg-accent animate-none" />
        <div className="flex-1 space-y-2 max-w-[70%]">
          <div className="h-4 w-[95%] rounded-md bg-accent animate-none" />
          <div className="h-4 w-[80%] rounded-md bg-accent animate-none" />
          <div className="h-4 w-[60%] rounded-md bg-accent animate-none" />
          <div className="h-4 w-[75%] rounded-md bg-accent animate-none" />
        </div>
      </div>

      {/* User message 2 — narrow right-aligned */}
      <div className="flex items-start justify-end gap-3">
        <div className="flex-1 space-y-2 max-w-[38%] items-end flex flex-col">
          <div className="h-4 w-full rounded-md bg-accent animate-none" />
        </div>
        <div className="size-8 shrink-0 rounded-full bg-accent animate-none" />
      </div>

      {/* AI message 3 — wide left-aligned */}
      <div className="flex items-start gap-3">
        <div className="size-8 shrink-0 rounded-full bg-accent animate-none" />
        <div className="flex-1 space-y-2 max-w-[65%]">
          <div className="h-4 w-full rounded-md bg-accent animate-none" />
          <div className="h-4 w-[85%] rounded-md bg-accent animate-none" />
        </div>
      </div>
    </div>
  );
}
