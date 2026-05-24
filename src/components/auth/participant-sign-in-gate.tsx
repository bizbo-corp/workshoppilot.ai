'use client';

import { SignIn } from '@clerk/nextjs';
import { useEffect, useRef } from 'react';
import { toast } from 'sonner';
import Logo from '@/components/Logo';

interface ParticipantSignInGateProps {
  /** Where Clerk returns the user after a successful sign-in. Must be the exact
   *  join/invite URL (including any token/query) so they land back in the flow. */
  redirectUrl: string;
  /** Headline context — workshop title. */
  workshopTitle: string;
  /** Optional sub-context line, e.g. "You've been invited as alex@acme.com". */
  subtitle?: string;
}

/**
 * Full-screen, non-dismissible sign-in gate for workshop participants. Renders
 * Clerk's passwordless <SignIn> (email code + Google, configured in the Clerk
 * dashboard). Uses `forceRedirectUrl` so Clerk returns the user to the exact
 * join/invite URL instead of a stale `redirect_url` cookie or /dashboard.
 */
export function ParticipantSignInGate({
  redirectUrl,
  workshopTitle,
  subtitle,
}: ParticipantSignInGateProps) {
  const formRef = useRef<HTMLDivElement>(null);

  // Surface Clerk inline errors as toasts (mirrors SignInModal).
  useEffect(() => {
    if (!formRef.current) return;
    const seen = new Set<string>();
    const observer = new MutationObserver(() => {
      formRef.current
        ?.querySelectorAll('.cl-formFieldErrorText, .cl-alert__text')
        .forEach((el) => {
          const text = el.textContent?.trim();
          if (text && !seen.has(text)) {
            seen.add(text);
            toast.error(text);
            setTimeout(() => seen.delete(text), 5000);
          }
        });
    });
    observer.observe(formRef.current, { childList: true, subtree: true, characterData: true });
    return () => observer.disconnect();
  }, []);

  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-background px-4 py-10">
      <Logo size="md" className="mb-8 text-foreground" />
      <div className="mb-6 max-w-md text-center">
        <p className="text-sm font-medium text-muted-foreground">You&apos;re joining</p>
        <h1 className="mt-1 text-2xl font-semibold text-foreground">{workshopTitle}</h1>
        <p className="mt-3 text-sm text-muted-foreground">
          {subtitle ?? 'Sign in to join — it takes a few seconds and keeps everyone’s name and work correctly attributed.'}
        </p>
      </div>
      <div ref={formRef} className="w-full max-w-md">
        <SignIn
          routing="hash"
          forceRedirectUrl={redirectUrl}
          signUpForceRedirectUrl={redirectUrl}
          appearance={{
            elements: {
              rootBox: 'w-full',
              cardBox: { boxShadow: 'none' },
              formButtonPrimary: {
                backgroundColor: 'var(--primary)',
                color: 'var(--primary-foreground)',
                boxShadow: 'none',
              },
              formFieldErrorText: 'sr-only',
              alert: 'sr-only',
              alertText: 'sr-only',
            },
          }}
        />
      </div>
    </div>
  );
}
