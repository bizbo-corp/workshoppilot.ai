'use client';

import { SignIn } from '@clerk/nextjs';
import { useEffect } from 'react';
import { X } from 'lucide-react';
import { Heading, Text, Eyebrow } from '@/components/ui/typography';
import { Surface } from '@/components/ui/surface';

export interface AuthWallModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  workshopId?: string;
}

export function AuthWallModal({
  open,
  onOpenChange,
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
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
      <Surface className="relative w-full max-w-4xl shadow-2xl">
        {/* Close button */}
        <button
          onClick={handleNotNow}
          className="absolute right-4 top-4 z-10 rounded-sm opacity-70 ring-offset-background transition-opacity hover:opacity-100 focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2"
          aria-label="Close"
        >
          <X className="h-5 w-5" />
        </button>

        {/* Two-column layout */}
        <div className="grid grid-cols-1 md:grid-cols-2">
          {/* LEFT COLUMN: What's Next Preview */}
          <div className="rounded-l-xl bg-gradient-to-br from-neutral-olive-50 to-neutral-olive-100 p-8 md:p-10">
            <div className="space-y-6">
              <div>
                <Heading level={2}>
                  Create your account to continue
                </Heading>
                <Text variant="muted" className="mt-2">
                  You&apos;ve completed the first 3 steps! Sign in or create an account to unlock the rest of your design thinking journey.
                </Text>
              </div>

              {/* Step 4 Preview Card */}
              <Surface className="border-2 border-olive-200 p-6">
                <div className="mb-3 flex items-center gap-3">
                  <div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary text-lg font-bold text-primary-foreground">
                    4
                  </div>
                  <div>
                    <Heading level={3}>
                      Prototype
                    </Heading>
                  </div>
                </div>
                <Text variant="muted">
                  Create low-fidelity representations of your solutions to test with users.
                </Text>
              </Surface>

              {/* Remaining Steps */}
              <div>
                <Eyebrow className="mb-3">
                  What comes next
                </Eyebrow>
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
                      <div className="flex h-7 w-7 flex-shrink-0 items-center justify-center rounded-full bg-secondary text-xs font-semibold text-secondary-foreground">
                        {step.num}
                      </div>
                      <div className="min-w-0 flex-1 pt-0.5">
                        <div className="text-sm font-medium text-foreground">
                          {step.name}
                        </div>
                        <div className="text-xs text-muted-foreground">
                          {step.desc}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>

          {/* RIGHT COLUMN: SignIn Form (handles both sign-in and sign-up) */}
          <div className="flex flex-col rounded-r-xl bg-card p-8 md:p-10">
            <div className="flex-1">
              <SignIn
                routing="hash"
                appearance={{
                  elements: {
                    rootBox: 'w-full',
                    card: 'shadow-none border-0',
                  },
                }}
                fallbackRedirectUrl="/dashboard"
              />
            </div>
          </div>
        </div>

        {/* Not Now button */}
        <div className="absolute bottom-4 left-4">
          <button
            onClick={handleNotNow}
            className="text-sm text-muted-foreground hover:text-foreground focus:outline-none focus:underline"
          >
            Not now
          </button>
        </div>
      </Surface>
    </div>
  );
}
