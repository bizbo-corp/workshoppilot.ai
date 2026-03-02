import { auth, currentUser } from '@clerk/nextjs/server';
import { redirect } from 'next/navigation';
import Link from 'next/link';
import { isAdmin } from '@/lib/auth/roles';
import { AdminResetOnboarding } from '@/components/dashboard/admin-reset-onboarding';

export default async function AdminPage() {
  // Defense in depth: verify auth AND role at page level
  const { userId, sessionClaims } = await auth();

  if (!userId) {
    redirect('/');
  }

  // Check admin role — with email fallback (matches API route pattern)
  let adminAllowed = isAdmin(sessionClaims);
  if (!adminAllowed) {
    const user = await currentUser();
    const adminEmail = process.env.ADMIN_EMAIL;
    const userEmail = user?.emailAddresses?.[0]?.emailAddress;
    adminAllowed = !!(adminEmail && userEmail && userEmail.toLowerCase() === adminEmail.toLowerCase());
  }
  if (!adminAllowed) {
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

        {/* Admin tools */}
        <div className="mt-8">
          <h2 className="text-lg font-semibold text-foreground mb-4">Admin Tools</h2>
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            <Link
              href="/admin/library"
              className="group rounded-lg bg-card p-6 shadow hover:shadow-md transition-shadow"
            >
              <h3 className="text-sm font-semibold text-foreground group-hover:text-primary transition-colors">
                Media Manager
              </h3>
              <p className="mt-1 text-sm text-muted-foreground">
                Upload, organize, and manage image assets used by canvas guides.
              </p>
            </Link>
            <div className="rounded-lg bg-card p-6 shadow">
              <h3 className="text-sm font-semibold text-foreground mb-2">Onboarding</h3>
              <p className="text-sm text-muted-foreground mb-3">
                Reset the welcome modal and onboarding flow.
              </p>
              <AdminResetOnboarding />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
