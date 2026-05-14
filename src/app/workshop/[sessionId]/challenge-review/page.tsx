/**
 * Legacy redirect — superseded by /lobby in v2.2.
 * Kept so that older invitation emails (which linked to /challenge-review) still work.
 */

import { redirect } from 'next/navigation';

interface PageProps {
  params: Promise<{ sessionId: string }>;
}

export default async function LegacyChallengeReviewRedirect({ params }: PageProps) {
  const { sessionId } = await params;
  redirect(`/workshop/${sessionId}/lobby`);
}
