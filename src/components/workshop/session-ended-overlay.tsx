'use client';

import { useRouter } from 'next/navigation';
import { useAuth } from '@clerk/nextjs';
import { Button } from '@/components/ui/button';

/**
 * SessionEndedOverlay — full-screen overlay shown to participants when
 * the facilitator ends the session via SESSION_ENDED broadcast event.
 *
 * Covers the entire viewport.
 * - Signed-in users: "Return to Dashboard" → /dashboard
 * - Guests (no Clerk account): "View Workshop Outputs" → /workshop/:sessionId/outputs
 */
export function SessionEndedOverlay({ sessionId }: { sessionId: string }) {
  const router = useRouter();
  const { isLoaded, isSignedIn } = useAuth();

  const isGuest = isLoaded && !isSignedIn;

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
        {isGuest ? (
          <Button
            size="lg"
            onClick={() => router.push(`/workshop/${sessionId}/outputs`)}
          >
            View Workshop Outputs
          </Button>
        ) : (
          <Button
            size="lg"
            onClick={() => router.push('/dashboard')}
          >
            Return to Dashboard
          </Button>
        )}
      </div>
    </div>
  );
}
