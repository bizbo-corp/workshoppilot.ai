import Link from 'next/link';
import { Surface } from '@/components/ui/surface';
import { Heading, Text } from '@/components/ui/typography';

/**
 * Purchase cancel page — Server Component.
 *
 * Shown when a user clicks "Back" or closes the Stripe Checkout page
 * without completing payment. No auth check needed — Stripe may redirect
 * here regardless of session state.
 *
 * Neutral, non-error tone: cancelling is a valid user action.
 */

export default function PurchaseCancelPage() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-background px-4">
      <Surface className="w-full max-w-md p-8 text-center">
        {/* Neutral indicator — not an error */}
        <div className="mx-auto mb-6 flex h-16 w-16 items-center justify-center rounded-full bg-muted">
          <svg
            className="h-8 w-8 text-muted-foreground"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
            strokeWidth={2}
            aria-hidden="true"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M6 18L18 6M6 6l12 12"
            />
          </svg>
        </div>

        <Heading level={1} className="text-2xl mb-3">
          Purchase Cancelled
        </Heading>

        <Text variant="muted" className="mb-2 leading-relaxed">
          No worries — you can purchase credits anytime from your dashboard or
          when you&apos;re ready to unlock Steps 7–10.
        </Text>

        <Text variant="muted" className="mb-8">
          Your workshop progress is saved and waiting for you.
        </Text>

        <div className="flex flex-col gap-3">
          <Link
            href="/dashboard"
            className="inline-block w-full rounded-lg bg-primary-brand px-6 py-3 text-sm font-semibold text-primary-brand-foreground transition-colors hover:bg-primary-brand/90"
          >
            Return to Dashboard
          </Link>
        </div>
      </Surface>
    </div>
  );
}
