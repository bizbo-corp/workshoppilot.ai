"use client";

import dynamic from "next/dynamic";

// Lazy-load Globe (~cobe library) — only renders after main thread is free
export const LazyGlobe = dynamic(
  () => import("@/components/ui/globe").then((mod) => ({ default: mod.Globe })),
  { ssr: false },
);

// Lazy-load HeroVisual (~GSAP + LightTrails) — deferred to avoid blocking INP
export const LazyHeroVisual = dynamic(
  () =>
    import("@/components/landing-v3/hero-visual").then((mod) => ({
      default: mod.HeroVisual,
    })),
  { ssr: false },
);
