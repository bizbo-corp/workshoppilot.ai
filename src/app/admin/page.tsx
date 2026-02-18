import { auth } from '@clerk/nextjs/server';
import { redirect } from 'next/navigation';
import { isAdmin } from '@/lib/auth/roles';

export default async function AdminPage() {
  // Defense in depth: verify auth AND role at page level
  const { userId, sessionClaims } = await auth();

  if (!userId) {
    redirect('/');
  }

  // Check admin role - silently redirect non-admins to dashboard
  if (!isAdmin(sessionClaims)) {
    redirect('/dashboard');
  }

  return (
    <div className="min-h-screen bg-background">
      <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
        {/* Page header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-foreground">Admin Dashboard</h1>
          <p className="mt-2 text-muted-foreground">
            System administration and analytics
          </p>
        </div>

        {/* Admin content placeholder */}
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          {/* Stats card */}
          <div className="rounded-lg bg-card p-6 shadow">
            <h3 className="text-sm font-medium text-muted-foreground">Total Users</h3>
            <p className="mt-2 text-3xl font-semibold text-foreground">0</p>
            <p className="mt-1 text-sm text-muted-foreground">Placeholder</p>
          </div>

          <div className="rounded-lg bg-card p-6 shadow">
            <h3 className="text-sm font-medium text-muted-foreground">Active Workshops</h3>
            <p className="mt-2 text-3xl font-semibold text-foreground">0</p>
            <p className="mt-1 text-sm text-muted-foreground">Placeholder</p>
          </div>

          <div className="rounded-lg bg-card p-6 shadow">
            <h3 className="text-sm font-medium text-muted-foreground">Completed Workshops</h3>
            <p className="mt-2 text-3xl font-semibold text-foreground">0</p>
            <p className="mt-1 text-sm text-muted-foreground">Placeholder</p>
          </div>
        </div>

        {/* Admin actions placeholder */}
        <div className="mt-8 rounded-lg bg-card p-6 shadow">
          <h2 className="text-lg font-semibold text-foreground">Admin Actions</h2>
          <p className="mt-2 text-sm text-muted-foreground">
            Admin functionality will be implemented in future phases.
          </p>
        </div>
      </div>
    </div>
  );
}
