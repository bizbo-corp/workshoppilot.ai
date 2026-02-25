import { auth } from '@clerk/nextjs/server';
import { redirect } from 'next/navigation';
import { fulfillCreditPurchase } from '@/lib/billing/fulfill-credit-purchase';
import { db } from '@/db/client';
import { users } from '@/db/schema';
import { eq } from 'drizzle-orm';
import Link from 'next/link';

/**
 * Purchase success page — Server Component.
 *
 * Loaded when Stripe redirects the user after a successful checkout
 * with ?session_id=cs_... in the URL. Implements the dual-trigger pattern:
 * the success page calls fulfillCreditPurchase() immediately on load, and
 * the webhook does the same. The stripeSessionId UNIQUE constraint ensures
 * exactly one fulfillment occurs regardless of which fires first.
 */

interface PurchaseSuccessPageProps {
  searchParams: Promise<{ session_id?: string }>;
}

export default async function PurchaseSuccessPage({
  searchParams,
}: PurchaseSuccessPageProps) {
  // Auth check — redirect unauthenticated users to landing page
  const { userId } = await auth();
  if (!userId) redirect('/');

  // Extract session_id from URL — redirect to dashboard if missing
  const { session_id } = await searchParams;
  if (!session_id) redirect('/dashboard');

  // Call fulfillCreditPurchase — dual-trigger pattern
  // This is idempotent: if the webhook already fulfilled, returns already_fulfilled
  const result = await fulfillCreditPurchase(session_id);

  // Determine credit info to display based on fulfillment result
  let displayBalance: number | null = null;
  let creditsAdded: number | null = null;
  let isAlreadyFulfilled = false;

  if (result.status === 'fulfilled') {
    displayBalance = result.newBalance;
    creditsAdded = result.creditQty;
  } else if (result.status === 'already_fulfilled') {
    // Webhook already processed this — fetch current balance from DB
    isAlreadyFulfilled = true;
    const user = await db.query.users.findFirst({
      where: eq(users.clerkUserId, userId),
      columns: { creditBalance: true },
    });
    displayBalance = user?.creditBalance ?? 0;
  }

  // payment_not_paid path: payment is still processing (rare — deferred methods)
  if (result.status === 'payment_not_paid') {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background px-4">
        <div className="w-full max-w-md rounded-xl border border-border bg-card p-8 shadow-sm text-center">
          {/* Processing indicator */}
          <div className="mx-auto mb-6 flex h-16 w-16 items-center justify-center rounded-full bg-amber-50 dark:bg-amber-900/20">
            <svg
              className="h-8 w-8 text-amber-600 dark:text-amber-400"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              strokeWidth={2}
              aria-hidden="true"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M12 6v6l4 2m6-2a10 10 0 11-20 0 10 10 0 0120 0z"
              />
            </svg>
          </div>

          <h1 className="text-2xl font-bold text-foreground mb-3">
            Payment Processing
          </h1>
          <p className="text-muted-foreground mb-8 leading-relaxed">
            Your payment is being processed. Credits will be added to your
            account shortly. This typically takes a few minutes.
          </p>

          <Link
            href="/dashboard"
            className="inline-block w-full rounded-lg bg-olive-700 hover:bg-olive-800 dark:bg-olive-600 dark:hover:bg-olive-500 px-6 py-3 text-sm font-semibold text-white transition-colors"
          >
            Go to Dashboard
          </Link>
        </div>
      </div>
    );
  }

  // user_not_found path: should not happen in practice
  if (result.status === 'user_not_found') {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background px-4">
        <div className="w-full max-w-md rounded-xl border border-border bg-card p-8 shadow-sm text-center">
          <div className="mx-auto mb-6 flex h-16 w-16 items-center justify-center rounded-full bg-red-50 dark:bg-red-900/20">
            <svg
              className="h-8 w-8 text-red-600 dark:text-red-400"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              strokeWidth={2}
              aria-hidden="true"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M12 9v3.75m9-.75a9 9 0 11-18 0 9 9 0 0118 0zm-9 3.75h.008v.008H12v-.008z"
              />
            </svg>
          </div>

          <h1 className="text-2xl font-bold text-foreground mb-3">
            Something Went Wrong
          </h1>
          <p className="text-muted-foreground mb-2 leading-relaxed">
            Your payment was received but we encountered an issue crediting your
            account.
          </p>
          <p className="text-sm text-muted-foreground mb-8">
            Please contact support with your session ID:{' '}
            <code className="text-xs bg-muted px-1 py-0.5 rounded font-mono">
              {session_id}
            </code>
          </p>

          <Link
            href="/dashboard"
            className="inline-block w-full rounded-lg bg-olive-700 hover:bg-olive-800 dark:bg-olive-600 dark:hover:bg-olive-500 px-6 py-3 text-sm font-semibold text-white transition-colors"
          >
            Go to Dashboard
          </Link>
        </div>
      </div>
    );
  }

  // fulfilled or already_fulfilled — show success UI
  return (
    <div className="min-h-screen flex items-center justify-center bg-background px-4">
      <div className="w-full max-w-md rounded-xl border border-border bg-card p-8 shadow-sm text-center">
        {/* Success checkmark */}
        <div className="mx-auto mb-6 flex h-16 w-16 items-center justify-center rounded-full bg-olive-100 dark:bg-olive-900/30">
          <svg
            className="h-8 w-8 text-olive-700 dark:text-olive-400"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
            strokeWidth={2.5}
            aria-hidden="true"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M4.5 12.75l6 6 9-13.5"
            />
          </svg>
        </div>

        <h1 className="text-2xl font-bold text-foreground mb-3">
          Purchase Complete!
        </h1>

        {/* Credit summary */}
        <div className="mb-6">
          {isAlreadyFulfilled ? (
            <p className="text-muted-foreground leading-relaxed">
              Your credits are ready —{' '}
              <span className="font-semibold text-foreground">
                {displayBalance} credit{displayBalance !== 1 ? 's' : ''}{' '}
                available
              </span>{' '}
              in your account.
            </p>
          ) : (
            <>
              <p className="text-muted-foreground leading-relaxed">
                <span className="font-semibold text-foreground">
                  {creditsAdded} credit{creditsAdded !== 1 ? 's' : ''} added
                </span>{' '}
                to your account.
              </p>
              <p className="text-sm text-muted-foreground mt-2">
                You now have{' '}
                <span className="font-semibold text-foreground">
                  {displayBalance} credit{displayBalance !== 1 ? 's' : ''}
                </span>{' '}
                total.
              </p>
            </>
          )}
        </div>

        {/* Credit badge */}
        <div className="mb-8 inline-flex items-center gap-2 rounded-full bg-olive-50 dark:bg-olive-900/20 border border-olive-200 dark:border-olive-800 px-4 py-2">
          <svg
            className="h-4 w-4 text-olive-600 dark:text-olive-400"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
            strokeWidth={2}
            aria-hidden="true"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M12 6v12m-3-2.818l.879.659c1.171.879 3.07.879 4.242 0 1.172-.879 1.172-2.303 0-3.182C13.536 12.219 12.768 12 12 12c-.725 0-1.45-.22-2.003-.659-1.106-.879-1.106-2.303 0-3.182s2.9-.879 4.006 0l.415.33"
            />
          </svg>
          <span className="text-sm font-medium text-olive-700 dark:text-olive-300">
            {displayBalance} workshop credit{displayBalance !== 1 ? 's' : ''}
          </span>
        </div>

        {/* CTAs */}
        <div className="flex flex-col gap-3">
          <Link
            href="/dashboard"
            className="inline-block w-full rounded-lg bg-olive-700 hover:bg-olive-800 dark:bg-olive-600 dark:hover:bg-olive-500 px-6 py-3 text-sm font-semibold text-white transition-colors"
          >
            Go to Dashboard
          </Link>
          <Link
            href="/dashboard"
            className="inline-block w-full rounded-lg border border-border bg-card hover:bg-background px-6 py-3 text-sm font-medium text-foreground transition-colors"
          >
            Start a New Workshop
          </Link>
        </div>
      </div>
    </div>
  );
}
