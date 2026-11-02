import { requireAdmin } from '@/lib/auth/current-user';

export const dynamic = 'force-dynamic';

export default async function AdminPage() {
  await requireAdmin();
  return (
    <div className="space-y-2">
      <h1 className="text-2xl font-semibold tracking-tight">Admin</h1>
      <p className="text-muted-foreground">Cost and margin views arrive with the premium build step.</p>
    </div>
  );
}
