'use client';

import { useAuth } from '@clerk/nextjs';
import { SignInModal } from './sign-in-modal';

interface AuthGuardProps {
  children: React.ReactNode;
}

/**
 * Client-side auth guard for protected pages.
 * When unauthenticated, shows the sign-in modal in-place (no redirect).
 * After successful sign-in, the user stays on the page they wanted to reach.
 */
export function AuthGuard({ children }: AuthGuardProps) {
  const { isSignedIn, isLoaded } = useAuth();

  if (!isLoaded) {
    return (
      <div className="flex h-screen items-center justify-center">
        <div className="animate-pulse text-muted-foreground">Loading...</div>
      </div>
    );
  }

  if (!isSignedIn) {
    return <SignInModal open={true} onOpenChange={() => {}} />;
  }

  return <>{children}</>;
}
