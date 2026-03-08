'use client';

/**
 * CreativeStepsPreview
 *
 * Visual preview component used in paywall dialogs to show users
 * what the creative/visual steps look like (Crazy 8s sketching,
 * mind maps, concept cards). Entices users by showing the fun,
 * visual nature of the upcoming steps.
 */

export function CreativeStepsPreview() {
  return (
    <div className="relative w-full overflow-hidden rounded-lg border bg-gradient-to-br from-amber-50/80 via-orange-50/50 to-yellow-50/80 dark:from-amber-950/30 dark:via-orange-950/20 dark:to-yellow-950/30 p-4">
      {/* Header label */}
      <div className="mb-3 flex items-center gap-2">
        <span className="text-[10px] font-semibold uppercase tracking-wider text-amber-700/70 dark:text-amber-400/70">
          Preview: What&apos;s next
        </span>
        <div className="h-px flex-1 bg-amber-200/50 dark:bg-amber-800/50" />
      </div>

      <div className="flex gap-3">
        {/* Left: Mini Crazy 8s grid */}
        <div className="flex-1">
          <p className="mb-1.5 text-[9px] font-medium text-amber-800/60 dark:text-amber-300/60">Crazy 8s Sketching</p>
          <div className="grid grid-cols-4 gap-1">
            {[...Array(8)].map((_, i) => (
              <div
                key={i}
                className="aspect-[3/4] rounded border border-amber-300/60 dark:border-amber-700/40 bg-white/80 dark:bg-white/10 overflow-hidden"
              >
                {/* Sketch-like scribble lines */}
                <svg viewBox="0 0 30 40" className="h-full w-full opacity-40">
                  {i === 0 && (
                    <>
                      <rect x="4" y="4" width="22" height="6" rx="1" fill="currentColor" className="text-amber-600 dark:text-amber-400" opacity="0.3" />
                      <line x1="4" y1="14" x2="20" y2="14" stroke="currentColor" className="text-amber-600 dark:text-amber-400" strokeWidth="0.8" />
                      <line x1="4" y1="17" x2="26" y2="17" stroke="currentColor" className="text-amber-600 dark:text-amber-400" strokeWidth="0.8" />
                      <rect x="4" y="22" width="22" height="12" rx="1" fill="currentColor" className="text-amber-600 dark:text-amber-400" opacity="0.15" />
                    </>
                  )}
                  {i === 1 && (
                    <>
                      <circle cx="15" cy="12" r="6" fill="currentColor" className="text-amber-600 dark:text-amber-400" opacity="0.2" />
                      <line x1="4" y1="24" x2="26" y2="24" stroke="currentColor" className="text-amber-600 dark:text-amber-400" strokeWidth="0.8" />
                      <line x1="4" y1="27" x2="18" y2="27" stroke="currentColor" className="text-amber-600 dark:text-amber-400" strokeWidth="0.8" />
                      <line x1="4" y1="30" x2="22" y2="30" stroke="currentColor" className="text-amber-600 dark:text-amber-400" strokeWidth="0.8" />
                    </>
                  )}
                  {i === 2 && (
                    <>
                      <rect x="3" y="4" width="24" height="16" rx="2" fill="currentColor" className="text-amber-600 dark:text-amber-400" opacity="0.15" />
                      <line x1="8" y1="10" x2="22" y2="10" stroke="currentColor" className="text-amber-600 dark:text-amber-400" strokeWidth="0.8" />
                      <line x1="8" y1="14" x2="18" y2="14" stroke="currentColor" className="text-amber-600 dark:text-amber-400" strokeWidth="0.8" />
                      <circle cx="8" cy="30" r="4" fill="currentColor" className="text-amber-600 dark:text-amber-400" opacity="0.2" />
                      <circle cx="22" cy="30" r="4" fill="currentColor" className="text-amber-600 dark:text-amber-400" opacity="0.2" />
                    </>
                  )}
                  {i === 3 && (
                    <>
                      <rect x="6" y="6" width="18" height="10" rx="1" fill="currentColor" className="text-amber-600 dark:text-amber-400" opacity="0.2" />
                      <line x1="4" y1="22" x2="26" y2="22" stroke="currentColor" className="text-amber-600 dark:text-amber-400" strokeWidth="0.8" />
                      <line x1="4" y1="25" x2="20" y2="25" stroke="currentColor" className="text-amber-600 dark:text-amber-400" strokeWidth="0.8" />
                      <line x1="4" y1="28" x2="24" y2="28" stroke="currentColor" className="text-amber-600 dark:text-amber-400" strokeWidth="0.8" />
                      <line x1="4" y1="31" x2="16" y2="31" stroke="currentColor" className="text-amber-600 dark:text-amber-400" strokeWidth="0.8" />
                    </>
                  )}
                  {i >= 4 && (
                    <>
                      <line x1={4 + i} y1="8" x2={20 - i} y2="8" stroke="currentColor" className="text-amber-600 dark:text-amber-400" strokeWidth="0.8" />
                      <rect x="4" y="14" width={18 - i} height={8 + i} rx="1" fill="currentColor" className="text-amber-600 dark:text-amber-400" opacity="0.12" />
                      <line x1="4" y1={28 + (i % 3)} x2={22 - i} y2={28 + (i % 3)} stroke="currentColor" className="text-amber-600 dark:text-amber-400" strokeWidth="0.8" />
                    </>
                  )}
                </svg>
              </div>
            ))}
          </div>
        </div>

        {/* Right: Mini mind map + concept card */}
        <div className="flex flex-1 flex-col gap-2">
          <div>
            <p className="mb-1.5 text-[9px] font-medium text-amber-800/60 dark:text-amber-300/60">Mind Mapping</p>
            <div className="rounded border border-amber-300/60 dark:border-amber-700/40 bg-white/80 dark:bg-white/10 p-2">
              <svg viewBox="0 0 120 60" className="w-full opacity-50">
                {/* Central node */}
                <circle cx="60" cy="30" r="10" fill="currentColor" className="text-amber-500 dark:text-amber-400" opacity="0.3" />
                <text x="60" y="33" textAnchor="middle" fontSize="5" fill="currentColor" className="text-amber-700 dark:text-amber-300" opacity="0.6">HMW</text>
                {/* Branches */}
                <line x1="70" y1="30" x2="100" y2="14" stroke="currentColor" className="text-amber-500 dark:text-amber-400" strokeWidth="1" opacity="0.4" />
                <line x1="70" y1="30" x2="105" y2="35" stroke="currentColor" className="text-amber-500 dark:text-amber-400" strokeWidth="1" opacity="0.4" />
                <line x1="70" y1="30" x2="95" y2="50" stroke="currentColor" className="text-amber-500 dark:text-amber-400" strokeWidth="1" opacity="0.4" />
                <line x1="50" y1="30" x2="20" y2="14" stroke="currentColor" className="text-amber-500 dark:text-amber-400" strokeWidth="1" opacity="0.4" />
                <line x1="50" y1="30" x2="15" y2="35" stroke="currentColor" className="text-amber-500 dark:text-amber-400" strokeWidth="1" opacity="0.4" />
                <line x1="50" y1="30" x2="25" y2="50" stroke="currentColor" className="text-amber-500 dark:text-amber-400" strokeWidth="1" opacity="0.4" />
                {/* Leaf nodes */}
                <circle cx="100" cy="14" r="5" fill="currentColor" className="text-amber-400 dark:text-amber-500" opacity="0.2" />
                <circle cx="105" cy="35" r="5" fill="currentColor" className="text-amber-400 dark:text-amber-500" opacity="0.2" />
                <circle cx="95" cy="50" r="5" fill="currentColor" className="text-amber-400 dark:text-amber-500" opacity="0.2" />
                <circle cx="20" cy="14" r="5" fill="currentColor" className="text-amber-400 dark:text-amber-500" opacity="0.2" />
                <circle cx="15" cy="35" r="5" fill="currentColor" className="text-amber-400 dark:text-amber-500" opacity="0.2" />
                <circle cx="25" cy="50" r="5" fill="currentColor" className="text-amber-400 dark:text-amber-500" opacity="0.2" />
              </svg>
            </div>
          </div>

          <div>
            <p className="mb-1.5 text-[9px] font-medium text-amber-800/60 dark:text-amber-300/60">Concept Cards</p>
            <div className="rounded border border-amber-300/60 dark:border-amber-700/40 bg-white/80 dark:bg-white/10 p-2 space-y-1">
              <div className="h-2 w-3/4 rounded-full bg-amber-400/20" />
              <div className="h-1.5 w-full rounded-full bg-amber-400/10" />
              <div className="h-1.5 w-5/6 rounded-full bg-amber-400/10" />
              <div className="mt-1 grid grid-cols-2 gap-1">
                <div className="h-5 rounded bg-green-400/15 border border-green-400/20" />
                <div className="h-5 rounded bg-red-400/15 border border-red-400/20" />
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
