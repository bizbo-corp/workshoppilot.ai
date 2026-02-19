import Link from "next/link";
import { ArrowRight, ChevronDown, Sparkles, Star } from "lucide-react";
import { SignedIn } from "@clerk/nextjs";
import { StartWorkshopButton } from "@/components/workshop/start-workshop-button";
import { Button } from "@/components/ui/button";
import { Globe } from "@/components/ui/globe";

/**
 * Landing page hero section
 * Full-viewport-height hero with badge, headline, subheadline, CTA buttons,
 * decorative background, social proof, and scroll indicator.
 * Uses olive theme tokens throughout — no hardcoded colors.
 */
export function HeroSection() {
  return (
    <section className="relative flex min-h-[calc(100vh-4rem)] flex-col items-center justify-start pt-20 md:pt-32 gap-8 overflow-hidden px-4">
      {/* Decorative background elements */}
      <div className="pointer-events-none absolute inset-0" aria-hidden="true">
        {/* Olive gradient orb — top right */}
        <div className="absolute -top-24 right-1/4 h-96 w-96 rounded-full bg-olive-400/20 blur-3xl dark:bg-olive-600/10" />
        {/* Olive gradient orb — bottom left */}
        <div className="absolute -bottom-32 left-1/4 h-180 w-180 rounded-full bg-olive-300/15 blur-3xl dark:bg-olive-50/10" />
        {/* Radial dot grid */}
        <div
          className="absolute inset-0 opacity-[0.03] dark:opacity-[0.05]"
          style={{
            backgroundImage:
              "radial-gradient(circle, currentColor 1px, transparent 1px)",
            backgroundSize: "24px 24px",
          }}
        />
      </div>

      {/* Animated Globe - placed behind text at bottom */}
      <div className="absolute inset-x-0 bottom-[-500px] md:bottom-[-700px] xl:bottom-[-900px] mx-auto h-[800px] md:h-[1200px] xl:h-[1600px] w-full max-w-none opacity-60 dark:opacity-80 pointer-events-none select-none z-0">
        <Globe className="h-full w-full" />
      </div>

      <div className="relative mx-auto max-w-4xl px-4 text-center sm:px-6 lg:px-8 z-10">
        {/* Badge / eyebrow pill */}
        <div className="mb-6 inline-flex items-center gap-2 rounded-full border border-olive-300/50 bg-olive-50/80 px-4 py-1.5 text-sm font-medium text-olive-700 dark:border-olive-700/50 dark:bg-olive-950/50 dark:text-olive-300">
          <Sparkles className="h-4 w-4" />
          AI-Powered Design Thinking
        </div>

        {/* Headline */}
        <h1 className="text-4xl font-serif leading-[1.1] tracking-tight text-foreground sm:text-5xl md:text-6xl">
          Take a vague idea to{" "}
          <span className="text-olive-600 dark:text-olive-400">
            validated digital product.
          </span>
        </h1>

        {/* Subheadline */}
        <p className="mx-auto mt-6 max-w-2xl text-lg leading-relaxed text-muted-foreground sm:text-xl">
          AI-powered design thinking that turns rough concepts into validated
          PRDs, user stories, and tech specs — no product management experience
          required.
        </p>

        {/* CTA Buttons */}
        <div className="mt-10 flex flex-col items-center gap-4 sm:flex-row sm:justify-center">
          <StartWorkshopButton />

          {/* For signed-in users, also show Continue Workshop secondary CTA */}
          <SignedIn>
            <Link href="/dashboard">
              <Button variant="outline" size="lg">
                Continue Workshop
                <ArrowRight className="ml-2 h-4 w-4" />
              </Button>
            </Link>
          </SignedIn>
        </div>

        {/* Social proof */}
        <div className="mt-10 flex flex-col items-center gap-2">
          <div className="flex gap-0.5">
            {Array.from({ length: 5 }).map((_, i) => (
              <Star
                key={i}
                className="h-4 w-4 fill-olive-500 text-olive-500 dark:fill-olive-400 dark:text-olive-400"
              />
            ))}
          </div>
          <p className="text-sm text-muted-foreground">
            Trusted by indie developers, founders, and product teams
          </p>
        </div>

        {/* Scroll indicator */}
        <div className="mt-12">
          <ChevronDown className="mx-auto h-6 w-6 animate-bounce text-muted-foreground/50" />
        </div>
      </div>
    </section>
  );
}
