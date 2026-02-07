'use client';

import { SignUp } from '@clerk/nextjs';
import { useEffect } from 'react';

export interface SignUpModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  redirectUrl?: string;
  onSwitchToSignIn?: () => void;
}

export function SignUpModal({
  open,
  onOpenChange,
  redirectUrl = '/dashboard',
  onSwitchToSignIn,
}: SignUpModalProps) {
  // Prevent body scroll when modal is open
  useEffect(() => {
    if (open) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = 'unset';
    }
    return () => {
      document.body.style.overflow = 'unset';
    };
  }, [open]);

  if (!open) return null;

  const handleBackdropClick = (e: React.MouseEvent<HTMLDivElement>) => {
    if (e.target === e.currentTarget) {
      onOpenChange(false);
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50"
      onClick={handleBackdropClick}
    >
      <div className="relative w-full max-w-md rounded-lg bg-white p-6 shadow-xl">
        {/* Close button */}
        <button
          onClick={() => onOpenChange(false)}
          className="absolute right-4 top-4 rounded-sm opacity-70 ring-offset-white transition-opacity hover:opacity-100 focus:outline-none focus:ring-2 focus:ring-gray-400 focus:ring-offset-2"
          aria-label="Close"
        >
          <svg
            className="h-5 w-5"
            xmlns="http://www.w3.org/2000/svg"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <line x1="18" y1="6" x2="6" y2="18" />
            <line x1="6" y1="6" x2="18" y2="18" />
          </svg>
        </button>

        {/* Clerk SignUp component */}
        <div className="mt-2">
          {/* TODO: Configure first name, last name as required fields in Clerk Dashboard.
              Company/org field to be added as custom field in Clerk unsafeMetadata via
              Dashboard configuration or deferred to post-sign-up profile completion. */}
          <SignUp
            routing="hash"
            appearance={{
              elements: {
                rootBox: 'w-full',
                card: 'shadow-none border-0',
              },
            }}
            fallbackRedirectUrl={redirectUrl}
          />
        </div>

        {/* Switch to sign-in link */}
        {onSwitchToSignIn && (
          <div className="mt-4 text-center text-sm text-gray-600">
            Already have an account?{' '}
            <button
              onClick={onSwitchToSignIn}
              className="font-medium text-blue-600 hover:text-blue-500 focus:outline-none focus:underline"
            >
              Sign in
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
