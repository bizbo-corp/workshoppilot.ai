import Link from 'next/link';
import { SignedIn } from '@clerk/nextjs';
import Logo from '@/components/Logo';
import { LandingHeader } from '@/components/layout/landing-header';
import { StartWorkshopButton } from '@/components/workshop/start-workshop-button';
import { Button } from '@/components/ui/button';

export default function Home() {
  return (
    <div className="flex min-h-screen flex-col bg-background">
      {/* Landing-specific header */}
      <LandingHeader />

      {/* Main content */}
      <main className="flex flex-1 flex-col items-center justify-center gap-8 px-4 text-center">
        <Logo size="lg" className="sm:text-7xl md:text-8xl" />
        <h1 className="text-2xl font-bold tracking-tight text-foreground/80 sm:text-3xl">
          From Vague Idea to AI-Ready Specs.
        </h1>
        <p className="text-muted-foreground">
          Democratizing Product Management with Design Thinking!
        </p>

        {/* Primary CTA */}
        <div className="flex flex-col items-center gap-4 sm:flex-row">
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
      </main>
    </div>
  );
}
