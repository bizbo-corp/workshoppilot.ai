import { redirect } from 'next/navigation';

interface ResultsPageProps {
  params: Promise<{ sessionId: string }>;
}

/**
 * The results / synthesis screen has been merged into the Build Pack page. The workshop summary
 * now lives there as a collapsible tile at the top, alongside the deliverables. Redirect any old
 * /results links to /outputs.
 */
export default async function ResultsPage({ params }: ResultsPageProps) {
  const { sessionId } = await params;
  redirect(`/workshop/${sessionId}/outputs`);
}
