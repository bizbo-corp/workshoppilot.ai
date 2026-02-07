'use client';

import { SignUp } from '@clerk/nextjs';
import { useEffect } from 'react';

export interface AuthWallModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSwitchToSignIn?: () => void;
  workshopId?: string;
}

export function AuthWallModal({
  open,
  onOpenChange,
  onSwitchToSignIn,
}: AuthWallModalProps) {
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

  // Explicit close only (no backdrop click)
  const handleNotNow = () => {
    onOpenChange(false);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
      <div className="relative w-full max-w-4xl rounded-lg bg-white shadow-2xl">
        {/* Close button */}
        <button
          onClick={handleNotNow}
          className="absolute right-4 top-4 z-10 rounded-sm opacity-70 ring-offset-white transition-opacity hover:opacity-100 focus:outline-none focus:ring-2 focus:ring-gray-400 focus:ring-offset-2"
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

        {/* Two-column layout */}
        <div className="grid grid-cols-1 md:grid-cols-2">
          {/* LEFT COLUMN: What's Next Preview */}
          <div className="rounded-l-lg bg-gradient-to-br from-gray-50 to-gray-100 p-8 md:p-10">
            <div className="space-y-6">
              <div>
                <h2 className="text-2xl font-bold text-gray-900">
                  Create your account to continue
                </h2>
                <p className="mt-2 text-sm text-gray-600">
                  You&apos;ve completed the first 3 steps! Sign up to unlock the rest of your design thinking journey.
                </p>
              </div>

              {/* Step 4 Preview Card */}
              <div className="rounded-lg border-2 border-blue-200 bg-white p-6 shadow-sm">
                <div className="mb-3 flex items-center gap-3">
                  <div className="flex h-10 w-10 items-center justify-center rounded-full bg-blue-600 text-lg font-bold text-white">
                    4
                  </div>
                  <div>
                    <h3 className="text-lg font-semibold text-gray-900">
                      Prototype
                    </h3>
                  </div>
                </div>
                <p className="text-sm text-gray-600">
                  Create low-fidelity representations of your solutions to test with users.
                </p>
              </div>

              {/* Remaining Steps */}
              <div>
                <h4 className="mb-3 text-sm font-semibold uppercase tracking-wide text-gray-500">
                  What comes next
                </h4>
                <div className="space-y-2">
                  {[
                    { num: 5, name: 'Test', desc: 'Validate assumptions with real users' },
                    { num: 6, name: 'Define MVP', desc: 'Identify core features' },
                    { num: 7, name: 'Technical Spec', desc: 'Define architecture & tech stack' },
                    { num: 8, name: 'User Stories', desc: 'Create detailed requirements' },
                    { num: 9, name: 'Architecture', desc: 'Design system structure' },
                    { num: 10, name: 'Build Pack', desc: 'Generate AI-ready specifications' },
                  ].map((step) => (
                    <div key={step.num} className="flex items-start gap-3">
                      <div className="flex h-7 w-7 flex-shrink-0 items-center justify-center rounded-full bg-gray-200 text-xs font-semibold text-gray-700">
                        {step.num}
                      </div>
                      <div className="min-w-0 flex-1 pt-0.5">
                        <div className="text-sm font-medium text-gray-900">
                          {step.name}
                        </div>
                        <div className="text-xs text-gray-500">
                          {step.desc}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>

          {/* RIGHT COLUMN: SignUp Form */}
          <div className="flex flex-col rounded-r-lg bg-white p-8 md:p-10">
            <div className="flex-1">
              <SignUp
                appearance={{
                  elements: {
                    rootBox: 'w-full',
                    card: 'shadow-none border-0',
                  },
                }}
                fallbackRedirectUrl="/dashboard"
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

        {/* Not Now button */}
        <div className="absolute bottom-4 left-4">
          <button
            onClick={handleNotNow}
            className="text-sm text-gray-500 hover:text-gray-700 focus:outline-none focus:underline"
          >
            Not now
          </button>
        </div>
      </div>
    </div>
  );
}
