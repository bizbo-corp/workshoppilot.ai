'use client';

import { useState } from 'react';
import Link from 'next/link';
import { SignedIn, SignedOut, UserButton } from '@clerk/nextjs';
import Logo from '@/components/Logo';
import { Button } from '@/components/ui/button';
import { SignInModal } from '@/components/auth/sign-in-modal';

/**
 * Landing page header
 * Separate from workshop header (per user decision)
 * Shows sign-in for unauthenticated users, UserButton + Dashboard link for authenticated
 * Not sticky/fixed - scrolls away with content
 */
export function LandingHeader() {
  const [showSignIn, setShowSignIn] = useState(false);

  return (
    <>
      <header className="w-full border-b border-border bg-background">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-4 py-4 sm:px-6 lg:px-8">
          {/* Left: Logo */}
          <Link href="/" className="flex items-center">
            <Logo size="sm" className="text-2xl sm:text-3xl" />
          </Link>

          {/* Right: Auth controls */}
          <div className="flex items-center gap-3">
            {/* Signed out: Show sign in button */}
            <SignedOut>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setShowSignIn(true)}
              >
                Sign in
              </Button>
            </SignedOut>

            {/* Signed in: Show Dashboard link + UserButton */}
            <SignedIn>
              <Link href="/dashboard">
                <Button variant="ghost" size="sm">
                  Dashboard
                </Button>
              </Link>
              <UserButton
                appearance={{
                  elements: {
                    avatarBox: 'w-8 h-8',
                  },
                }}
              />
            </SignedIn>
          </div>
        </div>
      </header>

      {/* Sign-in modal */}
      <SignInModal open={showSignIn} onOpenChange={setShowSignIn} />
    </>
  );
}
