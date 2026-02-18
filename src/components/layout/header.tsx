'use client';

import { UserButton, SignedIn, SignedOut } from '@clerk/nextjs';
import Link from 'next/link';
import { useState } from 'react';
import Logo from '@/components/Logo';
import { SignInModal } from '@/components/auth/sign-in-modal';
import { SignUpModal } from '@/components/auth/sign-up-modal';

export function Header() {
  const [signInOpen, setSignInOpen] = useState(false);
  const [signUpOpen, setSignUpOpen] = useState(false);

  const handleSwitchToSignUp = () => {
    setSignInOpen(false);
    setSignUpOpen(true);
  };

  const handleSwitchToSignIn = () => {
    setSignUpOpen(false);
    setSignInOpen(true);
  };

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
                className="rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90 focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2"
              >
                Sign in
              </button>
            </SignedOut>
            <SignedIn>
              <UserButton afterSignOutUrl="/" />
            </SignedIn>
          </div>
        </div>
      </header>

      {/* Modals */}
      <SignInModal
        open={signInOpen}
        onOpenChange={setSignInOpen}
        onSwitchToSignUp={handleSwitchToSignUp}
      />
      <SignUpModal
        open={signUpOpen}
        onOpenChange={setSignUpOpen}
        onSwitchToSignIn={handleSwitchToSignIn}
      />
    </>
  );
}
