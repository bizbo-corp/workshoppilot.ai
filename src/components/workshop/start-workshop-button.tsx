'use client';

import { useTransition } from 'react';
import { Button } from '@/components/ui/button';
import { createWorkshopSession } from '@/actions/workshop-actions';
import { toast } from 'sonner';

/**
 * Primary CTA button for starting a new workshop
 * Shows loading state during session creation
 * Works for both anonymous and authenticated users
 */
export function StartWorkshopButton() {
  const [isPending, startTransition] = useTransition();

  const handleClick = () => {
    startTransition(async () => {
      try {
        await createWorkshopSession();
      } catch (error) {
        // NEXT_REDIRECT errors are expected — they indicate successful navigation
        const digest = (error as Record<string, unknown>)?.digest;
        if (typeof digest === 'string' && digest.startsWith('NEXT_REDIRECT')) {
          throw error;
        }
        toast.error('Failed to create workshop', { duration: 4000 });
      }
    });
  };

  return (
    <Button
      onClick={handleClick}
      disabled={isPending}
      size="lg"
      className="min-w-[200px] text-base"
    >
      {isPending ? (
        <>
          <svg
            className="mr-2 h-4 w-4 animate-spin"
            xmlns="http://www.w3.org/2000/svg"
            fill="none"
            viewBox="0 0 24 24"
          >
            <circle
              className="opacity-25"
              cx="12"
              cy="12"
              r="10"
              stroke="currentColor"
              strokeWidth="4"
            />
            <path
              className="opacity-75"
              fill="currentColor"
              d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
            />
          </svg>
          Setting up your workshop...
        </>
      ) : (
        'Start Workshop'
      )}
    </Button>
  );
}
