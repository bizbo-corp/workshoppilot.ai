'use client';

import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';

interface SessionEndedOverlayProps {
  workshopId: string;
}

/**
 * SessionEndedOverlay — full-screen overlay shown to participants when
 * the facilitator ends the session via SESSION_ENDED broadcast event.
 *
 * Covers the entire viewport. Participants can only click "Return to Dashboard".
 * The facilitator never sees this — they redirect to the workshop detail page.
 */
export function SessionEndedOverlay({ workshopId }: SessionEndedOverlayProps) {
  const router = useRouter();

  return (
    <div className="fixed inset-0 z-[100] flex flex-col items-center justify-center bg-background/95 backdrop-blur-sm">
      <div className="flex flex-col items-center gap-6 text-center max-w-md px-6">
        <div className="w-16 h-16 rounded-full bg-muted flex items-center justify-center">
          <svg
            xmlns="http://www.w3.org/2000/svg"
            width="32"
            height="32"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
            className="text-muted-foreground"
          >
            <path d="M18 6 6 18" />
            <path d="m6 6 12 12" />
          </svg>
        </div>
        <h1 className="text-2xl font-semibold text-foreground">
          Session has ended
        </h1>
        <p className="text-muted-foreground">
          The facilitator has ended this workshop session. Thank you for participating!
        </p>
        <Button
          size="lg"
          onClick={() => router.push(`/dashboard/workshops/${workshopId}`)}
        >
          Return to Dashboard
        </Button>
      </div>
    </div>
  );
}
