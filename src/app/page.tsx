export const dynamic = 'force-dynamic';

import { LandingHeader } from '@/components/layout/landing-header';
import { HeroSection } from '@/components/landing/hero-section';
import { Footer } from '@/components/landing/footer';

export default function Home() {
  return (
    <div className="flex min-h-screen flex-col bg-background">
      <LandingHeader />
      <HeroSection />
      {/* Value props and testimonials sections added in 37-02 */}
      <Footer />
    </div>
  );
}
