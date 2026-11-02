import Link from 'next/link';
import { redirect } from 'next/navigation';
import { requireUser } from '@/lib/auth/current-user';
import { stripe } from '@/lib/billing/stripe';
import { fulfilCheckoutSession } from '@/lib/billing/fulfil';
import { Button } from '@/components/ui/button';

export const dynamic = 'force-dynamic';

/**
 * Fulfils on return from Stripe as well as via the webhook, so the balance
 * is right the moment the user lands here. addCredits is idempotent.
 */
export default async function CreditsSuccessPage({
  searchParams,
}: {
  searchParams: Promise<{ session_id?: string; return_to?: string }>;
}) {
  const [user, params] = await Promise.all([requireUser(), searchParams]);
  if (!params.session_id) redirect('/credits');

  const session = await stripe.checkout.sessions.retrieve(params.session_id);
  if (session.metadata?.userId !== user.id) redirect('/credits');
  const result = await fulfilCheckoutSession(session);

  const returnTo = params.return_to && params.return_to.startsWith('/') && !params.return_to.startsWith('//') ? params.return_to : '/dashboard';

  return (
    <div className="mx-auto max-w-md space-y-4 py-12 text-center">
      <h1 className="text-2xl font-semibold">{result.ok ? 'Credits added' : 'Payment is still processing'}</h1>
      <p className="text-muted-foreground">
        {result.ok
          ? `${result.credits} credits are in your account.`
          : 'Stripe has not confirmed the payment yet. Your credits will appear as soon as it does.'}
      </p>
      <Button asChild variant="primary">
        <Link href={returnTo}>Carry on</Link>
      </Button>
    </div>
  );
}
