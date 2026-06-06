'use client';

import { Eye, LocateFixed, X } from 'lucide-react';
import { cn } from '@/lib/utils';

interface PresenterFollowBannerProps {
  /** Display name of the facilitator currently presenting. */
  presenterName: string;
  /** following → locked to presenter · brokeOut → user moved away, offer return. */
  mode: 'following' | 'brokeOut';
  /** Stop following (user wants to explore on their own). */
  onExit: () => void;
  /** Re-lock to the presenter's view after breaking out. */
  onReturn: () => void;
}

/**
 * PresenterFollowBanner — the participant-facing indicator for "Follow me"
 * presenter mode. Renders a small pill at the top-centre of the canvas:
 *
 *  - following: "Following [name]" with an Exit affordance — unobtrusive so it
 *    doesn't fight the canvas content while the user is being guided.
 *  - brokeOut:  "You left [name]'s view" with a prominent Return button — the
 *    user broke out by panning/zooming and can rejoin in one tap.
 *
 * Soft-follow UX (matches Miro): the user is never trapped; any pan/zoom
 * breaks them out, and this banner is the way back.
 */
export function PresenterFollowBanner({
  presenterName,
  mode,
  onExit,
  onReturn,
}: PresenterFollowBannerProps) {
  const isFollowing = mode === 'following';

  return (
    <div
      className={cn(
        'pointer-events-none absolute left-1/2 top-3 z-40 -translate-x-1/2',
        'animate-in fade-in slide-in-from-top-2 duration-200 motion-reduce:animate-none',
      )}
    >
      <div
        className={cn(
          'pointer-events-auto flex items-center gap-2 rounded-full border py-1.5 pl-3 pr-1.5 shadow-lg backdrop-blur-sm',
          'max-w-[90vw] text-sm font-medium',
          isFollowing
            ? 'border-border bg-card/95 text-foreground'
            : 'border-primary/30 bg-primary/10 text-foreground',
        )}
        role="status"
        aria-live="polite"
      >
        {isFollowing ? (
          <>
            <span className="flex items-center gap-1.5">
              <Eye className="h-4 w-4 shrink-0 text-primary" />
              <span className="truncate">
                Following <span className="font-semibold">{presenterName}</span>
              </span>
            </span>
            <button
              type="button"
              onClick={onExit}
              className="ml-1 flex items-center gap-1 rounded-full px-2.5 py-1 text-xs font-medium text-muted-foreground transition-colors hover:bg-accent hover:text-accent-foreground"
              title="Stop following and explore on your own"
            >
              <X className="h-3.5 w-3.5" />
              Exit
            </button>
          </>
        ) : (
          <>
            <span className="truncate">
              You left <span className="font-semibold">{presenterName}</span>&apos;s view
            </span>
            <button
              type="button"
              onClick={onReturn}
              className="ml-1 flex items-center gap-1 rounded-full bg-primary px-2.5 py-1 text-xs font-semibold text-primary-foreground transition-colors hover:bg-primary/90"
              title="Return to the presenter's view"
            >
              <LocateFixed className="h-3.5 w-3.5" />
              Return
            </button>
          </>
        )}
      </div>
    </div>
  );
}
