import Link from 'next/link';
import { ChevronDown } from 'lucide-react';
import { SignedIn } from '@clerk/nextjs';
import Logo from '@/components/Logo';
import { StartWorkshopButton } from '@/components/workshop/start-workshop-button';
import { Button } from '@/components/ui/button';

/**
 * Landing page hero section
 * Full-viewport-height hero with headline, subheadline, CTA buttons, and scroll indicator
 * Uses olive theme tokens throughout — no hardcoded colors
 */
export function HeroSection() {
  return (
    <main className="flex min-h-[calc(100vh-4rem)] flex-col items-center justify-center gap-8 px-4">
      <div className="mx-auto max-w-4xl px-4 sm:px-6 lg:px-8 text-center">
        {/* Logo */}
        <div className="mb-6">
          <Logo size="lg" className="sm:text-7xl md:text-8xl" />
        </div>

        {/* Headline */}
        <h1 className="text-3xl sm:text-4xl md:text-5xl font-bold tracking-tight text-foreground">
          From Vague Idea to AI-Ready Specs
        </h1>

        {/* Subheadline */}
        <p className="mt-4 text-lg text-muted-foreground max-w-2xl mx-auto">
          AI-powered design thinking that turns rough concepts into validated PRDs, user stories,
          and tech specs — no product management experience required.
        </p>

        {/* CTA Buttons */}
        <div className="mt-8 flex flex-col items-center gap-4 sm:flex-row sm:justify-center">
          <StartWorkshopButton />

          {/* For signed-in users, also show Continue Workshop secondary CTA */}
          <SignedIn>
            <Link href="/dashboard">
              <Button variant="outline" size="lg">
                Continue Workshop
              </Button>
            </Link>
          </SignedIn>
        </div>

        {/* Scroll indicator */}
        <div className="mt-12">
          <ChevronDown className="mx-auto h-6 w-6 text-muted-foreground/50 animate-bounce" />
        </div>
      </div>
    </main>
  );
}
