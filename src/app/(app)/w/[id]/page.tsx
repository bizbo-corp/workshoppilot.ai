import { notFound } from 'next/navigation';
import { requireMember, ForbiddenError } from '@/lib/workshops/access';
import { loadWorkshop } from '@/lib/engine/store';
import { WorkshopRoom } from '@/components/workshop/workshop-room';

export const dynamic = 'force-dynamic';

export default async function WorkshopPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  try {
    await requireMember(id);
  } catch (err) {
    if (err instanceof ForbiddenError) notFound();
    throw err;
  }
  const loaded = await loadWorkshop(id);
  if (!loaded) notFound();

  return <WorkshopRoom workshopId={id} initialState={loaded.state} title={loaded.workshop.title} />;
}
