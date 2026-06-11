import { redirect } from 'next/navigation';
import { auth } from '@clerk/nextjs/server';
import { eq, and, like } from 'drizzle-orm';
import Link from 'next/link';
import { db } from '@/db/client';
import { sessions, buildPacks } from '@/db/schema';
import { resolveClerkParticipant } from '@/lib/auth/resolve-participant';
import { Icon } from '@/components/ui/icon';
import type { JourneyFlowState } from '@/lib/journey-flow/types';
import type { StoredPrototypePrompt } from '@/lib/ai/prompts/low-fi-prototype-prompt';
import { PrototypePromptContent } from './prototype-prompt-content';

/**
 * Prototype Prompt Builder — Phase 66 implementation.
 *
 * Server component: loads Journey Flow + Prototype Prompt build_pack rows,
 * computes staleness via timestamp comparison, redirects to journey-flow when
 * no flow exists, and passes typed props to PrototypePromptContent.
 *
 * Route linked from the Validate step guidance card (Phase 65).
 * Prototype Prompt: PROMPT-01, PROMPT-03, PROMPT-05.
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

  // Auth check
  const { userId } = await auth();
  if (!userId) redirect('/');

  // Owner gets full access; a participant of this workshop views read-only.
  let isReadOnly = false;
  if (workshop.clerkUserId !== userId) {
    const participant = await resolveClerkParticipant(workshop.id);
    if (!participant) redirect('/');
    isReadOnly = true;
  }

  // Back link — honour ?from param
  const backHref =
    from === 'validate'
      ? `/workshop/${sessionId}/step/validate`
      : `/workshop/${sessionId}/outputs`;
  const backLabel = from === 'validate' ? 'Validation Plan' : 'Build Pack';

  // --- Load Journey Flow row ---
  const flowRows = await db
    .select()
    .from(buildPacks)
    .where(and(eq(buildPacks.workshopId, workshop.id), like(buildPacks.title, 'Journey Flow:%')));

  const flowJsonRow = flowRows.find((r) => r.formatType === 'json' && r.content);

  let flowState: Partial<JourneyFlowState> | null = null;
  if (flowJsonRow) {
    try {
      flowState = JSON.parse(flowJsonRow.content!) as Partial<JourneyFlowState>;
    } catch {
      // Invalid JSON — treat as no saved state
    }
  }

  // Guard (Pitfall 3): redirect to journey-flow if no flow or no nodes yet
  if (!flowState || !flowState.nodes?.length) {
    redirect(`/workshop/${sessionId}/outputs/journey-flow?from=prototype-prompt`);
  }

  // Journey Flow row updatedAt ISO string — used for staleness comparison
  const flowUpdatedAt = flowJsonRow!.updatedAt.toISOString();

  // --- Load Prototype Prompt row ---
  const protoRows = await db
    .select()
    .from(buildPacks)
    .where(
      and(eq(buildPacks.workshopId, workshop.id), like(buildPacks.title, 'Prototype Prompt:%'))
    );

  const protoJsonRow = protoRows.find((r) => r.formatType === 'json' && r.content);

  let storedPrompt: StoredPrototypePrompt | null = null;
  if (protoJsonRow) {
    try {
      storedPrompt = JSON.parse(protoJsonRow.content!) as StoredPrototypePrompt;
    } catch {
      // Corrupted JSON — treat as no stored prompt
    }
  }

  // Staleness check (research Pattern 4): compare timestamp from when the prompt was
  // generated against the Journey Flow row's current updatedAt value
  const isStale =
    !!storedPrompt && storedPrompt.generatedFromFlowUpdatedAt !== flowUpdatedAt;

  // Derive scope from stored prompt if available, then from flow state, then default
  const testScope = storedPrompt?.testScope ?? flowState.testScope ?? 'journey';

  return (
    <div className="min-h-screen bg-background">
      <div className="mx-auto max-w-2xl px-4 py-8 sm:py-12">
        {/* Back link */}
        <Link
          href={backHref}
          className="mb-6 inline-flex items-center gap-1.5 text-sm text-muted-foreground transition-colors hover:text-foreground"
        >
          <Icon name="arrow-left" className="h-3.5 w-3.5" />
          Back to {backLabel}
        </Link>

        <PrototypePromptContent
          sessionId={sessionId}
          workshopId={workshop.id}
          initialPrompt={storedPrompt?.promptText ?? null}
          initialGeneratedFromFlowUpdatedAt={storedPrompt?.generatedFromFlowUpdatedAt ?? null}
          flowUpdatedAt={flowUpdatedAt}
          initialIsStale={isStale}
          testScope={testScope}
          isReadOnly={isReadOnly}
          backHref={backHref}
          backLabel={backLabel}
        />
      </div>
    </div>
  );
}
