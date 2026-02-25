'use client';

import { UserButton, SignedIn, SignedOut } from '@clerk/nextjs';
import Link from 'next/link';
import { useState } from 'react';
import Logo from '@/components/Logo';
import { SignInModal } from '@/components/auth/sign-in-modal';

export function Header() {
  const [signInOpen, setSignInOpen] = useState(false);

  return (
    <>
      <header className="fixed top-0 z-40 h-16 w-full border-b bg-card shadow-sm">
        <div className="mx-auto flex h-full max-w-7xl items-center justify-between px-4 sm:px-6 lg:px-8">
          {/* Left: Logo */}
          <Link href="/" className="flex items-center">
            <Logo size="sm" />
          </Link>

          {/* Right: Auth UI */}
          <div className="flex items-center gap-4">
            <SignedOut>
              <button
                onClick={() => setSignInOpen(true)}
                className="text-sm font-medium text-muted-foreground hover:text-foreground transition-colors focus:outline-none"
              >
                Sign in
              </button>
            </SignedOut>
            <SignedIn>
              <Link
                href="/dashboard"
                className="text-sm font-medium text-muted-foreground hover:text-foreground transition-colors"
              >
                Dashboard
              </Link>
              <UserButton afterSignOutUrl="/" />
            </SignedIn>
          </div>
        </div>
      </header>

      {/* Modal */}
      <SignInModal open={signInOpen} onOpenChange={setSignInOpen} />
    </>
  );
}
