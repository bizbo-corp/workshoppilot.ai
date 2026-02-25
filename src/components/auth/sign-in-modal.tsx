'use client';

import { SignIn } from '@clerk/nextjs';
import { useEffect, useRef } from 'react';
import { X } from 'lucide-react';
import { toast } from 'sonner';

export interface SignInModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  redirectUrl?: string;
}

export function SignInModal({
  open,
  onOpenChange,
  redirectUrl = '/dashboard',
}: SignInModalProps) {
  const formRef = useRef<HTMLDivElement>(null);

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

  // MutationObserver to surface Clerk inline errors as toast notifications
  useEffect(() => {
    if (!open || !formRef.current) return;

    const seenErrors = new Set<string>();

    const observer = new MutationObserver(() => {
      const errorEls = formRef.current?.querySelectorAll(
        '.cl-formFieldErrorText, .cl-alert__text'
      );
      errorEls?.forEach((el) => {
        const text = el.textContent?.trim();
        if (text && !seenErrors.has(text)) {
          seenErrors.add(text);
          toast.error(text);
          // Clear from seen after a delay so repeated attempts can re-trigger
          setTimeout(() => seenErrors.delete(text), 5000);
        }
      });
    });

    observer.observe(formRef.current, {
      childList: true,
      subtree: true,
      characterData: true,
    });

    return () => observer.disconnect();
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

        {/* Clerk SignIn component */}
        <div className="p-2" ref={formRef}>
          <SignIn
            routing="hash"
            appearance={{
              elements: {
                rootBox: 'w-full',
                card: 'shadow-none border-0',
                formFieldErrorText: 'sr-only',
                alert: 'sr-only',
                alertText: 'sr-only',
              },
            }}
            fallbackRedirectUrl={redirectUrl}
          />
        </div>
      </div>
    </div>
  );
}
