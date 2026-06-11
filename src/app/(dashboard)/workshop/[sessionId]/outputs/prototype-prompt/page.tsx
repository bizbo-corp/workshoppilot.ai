import { redirect } from 'next/navigation';
import { auth } from '@clerk/nextjs/server';
import { eq } from 'drizzle-orm';
import Link from 'next/link';
import { db } from '@/db/client';
import { sessions } from '@/db/schema';
import { resolveClerkParticipant } from '@/lib/auth/resolve-participant';
import { Icon } from '@/components/ui/icon';

/**
 * Prototype Prompt Builder — placeholder page (Phase 65 deviation).
 *
 * This route is linked from the Validate step guidance card once the Journey Flow is
 * approved. Phase 66 will replace the placeholder content with the actual builder.
 * Keeping a real (non-404) page here avoids a dead link during the interim.
 */

interface PrototypePromptPageProps {
  params: Promise<{ sessionId: string }>;
  searchParams: Promise<{ from?: string }>;
}

export default async function PrototypePromptPage({
  params,
  searchParams,
}: PrototypePromptPageProps) {
  const { sessionId } = await params;
  const { from } = await searchParams;

  const session = await db.query.sessions.findFirst({
    where: eq(sessions.id, sessionId),
    with: { workshop: true },
  });

  if (!session) redirect('/');

  const { workshop } = session;

  const { userId } = await auth();
  if (!userId) redirect('/');

  // Owner has full access; participants are read-only viewers.
  if (workshop.clerkUserId !== userId) {
    const participant = await resolveClerkParticipant(workshop.id);
    if (!participant) redirect('/');
  }

  const backHref =
    from === 'validate'
      ? `/workshop/${sessionId}/step/validate`
      : `/workshop/${sessionId}/outputs`;
  const backLabel = from === 'validate' ? 'Validation Plan' : 'Build Pack';

  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-background px-4">
      <div className="w-full max-w-md space-y-6 rounded-2xl border border-border bg-card p-8 shadow-sm">
        <div className="flex h-14 w-14 items-center justify-center rounded-full bg-primary/10">
          <Icon name="layers" className="h-7 w-7 text-primary" />
        </div>

        <div className="space-y-2">
          <h1 className="font-serif text-2xl font-semibold tracking-tight text-foreground">
            Prototype prompt builder
          </h1>
          <p className="text-base text-foreground/70">
            This feature is coming soon. It will generate a structured prompt you can feed into
            a design tool or AI to rapidly produce a low-fidelity prototype of your journey flow.
          </p>
        </div>

        <div className="rounded-xl border border-dashed border-border bg-muted/40 px-4 py-3 text-sm text-foreground/60">
          Available in an upcoming release — check back after Phase 66 ships.
        </div>

        <Link
          href={backHref}
          className="inline-flex items-center gap-1.5 text-sm text-muted-foreground transition-colors hover:text-foreground"
        >
          <Icon name="arrow-left" className="h-3.5 w-3.5" />
          Back to {backLabel}
        </Link>
      </div>
    </div>
  );
}
