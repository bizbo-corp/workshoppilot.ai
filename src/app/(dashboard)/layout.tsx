/**
 * Dashboard Group Layout
 * Shared shell for the dashboard, admin, and build pack (workshop outputs)
 * screens. Renders the dashboard sidebar — top-level navigation plus, inside
 * a build pack, the current workshop's deliverables (published via
 * BuildPackNavContext from the outputs layout).
 */

import { auth, currentUser } from '@clerk/nextjs/server';
import { isAdmin } from '@/lib/auth/roles';
import { SidebarInset, SidebarProvider } from '@/components/ui/sidebar';
import { DashboardSidebar } from '@/components/layout/dashboard-sidebar';
import { BuildPackNavProvider } from '@/components/layout/build-pack-nav-context';

export default async function DashboardGroupLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  // Admin link visibility — role claim with email fallback (matches admin page)
  const { sessionClaims } = await auth();
  let adminAllowed = isAdmin(sessionClaims);
  if (!adminAllowed && process.env.ADMIN_EMAIL) {
    const user = await currentUser();
    const userEmail = user?.emailAddresses?.[0]?.emailAddress;
    adminAllowed =
      !!userEmail &&
      userEmail.toLowerCase() === process.env.ADMIN_EMAIL.toLowerCase();
  }

  return (
    <BuildPackNavProvider>
      <SidebarProvider>
        <DashboardSidebar isAdmin={adminAllowed} />
        <SidebarInset>{children}</SidebarInset>
      </SidebarProvider>
    </BuildPackNavProvider>
  );
}
