'use client';

import { SignUp } from '@clerk/nextjs';
import { useEffect } from 'react';
import { X } from 'lucide-react';

export interface SignUpModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  redirectUrl?: string;
}

export function SignUpModal({
  open,
  onOpenChange,
  redirectUrl = '/dashboard',
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
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm"
      onClick={handleBackdropClick}
    >
      <div className="relative w-full max-w-md rounded-xl bg-card shadow-2xl border border-border">
        {/* Close button */}
        <button
          onClick={() => onOpenChange(false)}
          className="absolute right-4 top-4 z-10 rounded-sm opacity-70 ring-offset-background transition-opacity hover:opacity-100 focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2"
          aria-label="Close"
        >
          <X className="h-5 w-5" />
        </button>

        {/* Clerk SignUp component */}
        <div className="p-2">
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
      </div>
    </div>
  );
}
