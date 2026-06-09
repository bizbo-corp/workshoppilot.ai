import Link from 'next/link';
import { redirect } from 'next/navigation';
import { auth } from '@clerk/nextjs/server';
import { eq } from 'drizzle-orm';
import { Icon } from '@/components/ui/icon';
import { db } from '@/db/client';
import { sessions } from '@/db/schema';
import { resolveClerkParticipant } from '@/lib/auth/resolve-participant';
import { getValidateArtifact } from '@/lib/validation/save-validation';
import { loadFakeDoorHandoff } from '@/lib/validation/fake-door-prompt';

interface FakeDoorPageProps {
  params: Promise<{ sessionId: string }>;
}

/**
 * Fake-door / landing-page smoke test — PLACEHOLDER.
 *
 * The generator isn't wired yet; for now this page produces the grounded coding-agent prompt
 * (see fake-door-prompt.ts) so the page can be built by handoff. Reachable from the Validate
 * step's primary CTA when the chosen artifact is a fake-door test.
 */
export default async function FakeDoorPage({ params }: FakeDoorPageProps) {
  const { sessionId } = await params;

  const session = await db.query.sessions.findFirst({
    where: eq(sessions.id, sessionId),
    with: { workshop: true },
  });
  if (!session) redirect('/');

  const { workshop } = session;
  const { userId } = await auth();
  if (!userId) redirect('/');
  if (workshop.clerkUserId !== userId) {
    const participant = await resolveClerkParticipant(workshop.id);
    if (!participant) redirect('/');
  }

  const artifact = await getValidateArtifact(workshop.id);
  const plan =
    artifact?.validationPlans
      ?.filter((p) => p.artifactType === 'fake_door_smoke_test')
      .sort((a, b) => (a.updatedAt < b.updatedAt ? 1 : -1))[0] ?? null;

  const handoff = plan ? await loadFakeDoorHandoff(workshop.id, plan) : null;

  return (
    <div className="mx-auto h-full w-full max-w-3xl space-y-6 overflow-y-auto p-6">
      <Link
        href={`/workshop/${sessionId}/step/validate`}
        className="inline-flex items-center gap-1.5 text-sm text-muted-foreground transition-colors hover:text-foreground"
      >
        <Icon name="arrow-left" className="h-4 w-4" />
        Back to Validate
      </Link>

      <div className="flex items-center gap-3">
        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-primary/10">
          <Icon name="door-open" className="h-5 w-5 text-primary" />
        </div>
        <div>
          <h1 className="text-lg font-semibold">Fake-door landing page</h1>
          <p className="text-sm text-muted-foreground">
            Put up a simple page with one call-to-action and measure who clicks — real demand,
            before you build.
          </p>
        </div>
      </div>

      <div className="rounded-xl border border-dashed border-border bg-muted/40 p-4 text-sm text-muted-foreground">
        The one-click generator is coming soon. For now, hand the prompt below to a coding agent
        (v0, Claude, etc.) to build the page — it&apos;s already grounded in your workshop and the
        signal you committed to.
      </div>

      {handoff ? (
        <div className="space-y-2">
          <h2 className="text-sm font-semibold">Handoff prompt</h2>
          <pre className="max-h-[60vh] overflow-auto whitespace-pre-wrap rounded-xl border border-border bg-card p-4 text-xs leading-relaxed text-foreground">
            {handoff.prompt}
          </pre>
          <p className="text-xs text-muted-foreground">Select all and copy to use it.</p>
        </div>
      ) : (
        <div className="rounded-xl border border-border bg-card p-4 text-sm text-muted-foreground">
          No fake-door test found yet. Pick the fake-door / landing-page test on the Validate step
          first, then come back here.
        </div>
      )}
    </div>
  );
}
