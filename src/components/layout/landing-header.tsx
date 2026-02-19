'use client';

import { useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Menu } from 'lucide-react';
import { SignedIn, SignedOut, UserButton } from '@clerk/nextjs';
import Logo from '@/components/Logo';
import { Button } from '@/components/ui/button';
import { SignInModal } from '@/components/auth/sign-in-modal';
import { ThemeToggle } from '@/components/ui/theme-toggle';
import {
  Sheet,
  SheetTrigger,
  SheetContent,
  SheetClose,
  SheetTitle,
} from '@/components/ui/sheet';

/**
 * Landing page header
 * Separate from workshop header (per user decision)
 * Desktop: [Logo] ... [Pricing] [Dashboard?] ... [ThemeToggle] [Sign in / UserButton]
 * Mobile: [Logo] ... [ThemeToggle] [Hamburger] → Sheet with nav + auth
 */
export function LandingHeader() {
  const [showSignIn, setShowSignIn] = useState(false);
  const [sheetOpen, setSheetOpen] = useState(false);
  const pathname = usePathname();

  const navLinks = [
    { href: '/pricing', label: 'Pricing', authOnly: false },
    { href: '/dashboard', label: 'Dashboard', authOnly: true },
  ];

  function NavLink({
    href,
    label,
    mobile,
  }: {
    href: string;
    label: string;
    mobile?: boolean;
  }) {
    const isActive = pathname === href;
    if (mobile) {
      return (
        <SheetClose asChild>
          <Link
            href={href}
            className={`block rounded-md px-3 py-2 text-base font-medium transition-colors ${
              isActive
                ? 'bg-accent text-accent-foreground'
                : 'text-muted-foreground hover:bg-accent hover:text-accent-foreground'
            }`}
          >
            {label}
          </Link>
        </SheetClose>
      );
    }
    return (
      <Link
        href={href}
        className={`text-sm font-medium transition-colors ${
          isActive
            ? 'text-foreground'
            : 'text-muted-foreground hover:text-foreground'
        }`}
      >
        {label}
      </Link>
    );
  }

  return (
    <>
      <header className="sticky top-0 z-40 w-full border-b border-border bg-background/95 backdrop-blur-sm">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-4 py-4 sm:px-6 lg:px-8">
          {/* Left: Logo */}
          <Link href="/" className="flex items-center">
            <Logo size="sm" className="text-2xl sm:text-3xl" />
          </Link>

          {/* Center: Nav links (desktop) */}
          <nav className="hidden items-center gap-6 md:flex">
            <NavLink href="/pricing" label="Pricing" />
            <SignedIn>
              <NavLink href="/dashboard" label="Dashboard" />
            </SignedIn>
          </nav>

          {/* Right: Theme toggle + Auth (desktop) */}
          <div className="flex items-center gap-2">
            <ThemeToggle />

            {/* Desktop auth controls */}
            <div className="hidden items-center gap-2 md:flex">
              <SignedOut>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setShowSignIn(true)}
                >
                  Sign in
                </Button>
              </SignedOut>
              <SignedIn>
                <UserButton
                  appearance={{
                    elements: {
                      avatarBox: 'w-8 h-8',
                    },
                  }}
                />
              </SignedIn>
            </div>

            {/* Mobile hamburger */}
            <Sheet open={sheetOpen} onOpenChange={setSheetOpen}>
              <SheetTrigger asChild>
                <Button variant="ghost" size="icon" className="md:hidden">
                  <Menu className="h-5 w-5" />
                  <span className="sr-only">Open menu</span>
                </Button>
              </SheetTrigger>
              <SheetContent side="right" className="flex flex-col">
                <SheetTitle className="sr-only">Navigation menu</SheetTitle>

                {/* Nav links */}
                <nav className="flex flex-col gap-1 pt-4">
                  {navLinks.map((link) =>
                    link.authOnly ? (
                      <SignedIn key={link.href}>
                        <NavLink
                          href={link.href}
                          label={link.label}
                          mobile
                        />
                      </SignedIn>
                    ) : (
                      <NavLink
                        key={link.href}
                        href={link.href}
                        label={link.label}
                        mobile
                      />
                    )
                  )}
                </nav>

                {/* Auth controls at bottom */}
                <div className="mt-auto border-t border-border pt-4">
                  <SignedOut>
                    <Button
                      variant="outline"
                      className="w-full"
                      onClick={() => {
                        setSheetOpen(false);
                        setShowSignIn(true);
                      }}
                    >
                      Sign in
                    </Button>
                  </SignedOut>
                  <SignedIn>
                    <div className="flex items-center gap-3 px-3">
                      <UserButton
                        appearance={{
                          elements: {
                            avatarBox: 'w-8 h-8',
                          },
                        }}
                      />
                      <span className="text-sm text-muted-foreground">
                        Account
                      </span>
                    </div>
                  </SignedIn>
                </div>
              </SheetContent>
            </Sheet>
          </div>
        </div>
      </header>

      {/* Sign-in modal */}
      <SignInModal open={showSignIn} onOpenChange={setShowSignIn} />
    </>
  );
}
