import Link from 'next/link';

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
      <div className="w-full max-w-md rounded-xl border border-border bg-card p-8 shadow-sm text-center">
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

        <h1 className="text-2xl font-bold text-foreground mb-3">
          Purchase Cancelled
        </h1>

        <p className="text-muted-foreground mb-2 leading-relaxed">
          No worries — you can purchase credits anytime from your dashboard or
          when you&apos;re ready to unlock Steps 7–10.
        </p>

        <p className="text-sm text-muted-foreground mb-8">
          Your workshop progress is saved and waiting for you.
        </p>

        <div className="flex flex-col gap-3">
          <Link
            href="/dashboard"
            className="inline-block w-full rounded-lg bg-olive-700 hover:bg-olive-800 dark:bg-olive-600 dark:hover:bg-olive-500 px-6 py-3 text-sm font-semibold text-white transition-colors"
          >
            Return to Dashboard
          </Link>
        </div>
      </div>
    </div>
  );
}
