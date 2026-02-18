export const dynamic = 'force-dynamic';

import { LandingHeader } from '@/components/layout/landing-header';
import { HeroSection } from '@/components/landing/hero-section';
import { ValuePropsSection } from '@/components/landing/value-props-section';
import { TestimonialsSection } from '@/components/landing/testimonials-section';
import { Footer } from '@/components/landing/footer';
import { StartWorkshopButton } from '@/components/workshop/start-workshop-button';

export default function Home() {
  return (
    <div className="flex min-h-screen flex-col bg-background">
      <LandingHeader />
      <HeroSection />
      <ValuePropsSection />
      <TestimonialsSection />

      {/* Bottom CTA — secondary conversion point above footer */}
      <section className="py-20 sm:py-24 bg-card text-center">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <h2 className="text-2xl sm:text-3xl font-bold text-foreground mb-4">
            Ready to Turn Your Idea Into Reality?
          </h2>
          <p className="text-muted-foreground mb-8 max-w-xl mx-auto">
            Start a free workshop and walk away with a complete Build Pack — no design thinking experience required.
          </p>
          <StartWorkshopButton />
        </div>
      </section>

      <Footer />
    </div>
  );
}
