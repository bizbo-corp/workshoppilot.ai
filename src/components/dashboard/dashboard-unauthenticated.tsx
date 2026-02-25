'use client';

import { AuthGuard } from '@/components/auth/auth-guard';

/**
 * Rendered by the dashboard page when the server determines the user is
 * unauthenticated. Delegates to AuthGuard which shows the sign-in modal
 * in-place, keeping the user on /dashboard so after sign-in they land here.
 */
export function DashboardUnauthenticated() {
  return (
    <AuthGuard>
      {/* AuthGuard will intercept and show the sign-in modal when not signed in.
          This content only renders once auth is confirmed (shouldn't normally happen
          since the server already detected !userId, but guards against race conditions). */}
      <div className="flex h-64 items-center justify-center">
        <div className="animate-pulse text-muted-foreground">Loading your workshops...</div>
      </div>
    </AuthGuard>
  );
}
