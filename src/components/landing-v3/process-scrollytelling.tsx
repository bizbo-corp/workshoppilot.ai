"use client";

import { useEffect, useRef, useState } from "react";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import {
  DemoBoard,
  DemoRings,
  DOTTED_BG,
} from "@/components/marketing/product-demo/demo-board";
import { DemoStage } from "@/components/marketing/product-demo/demo-stage";
import { MockWorkshop } from "@/components/marketing/product-demo/mock-workshop";
import { MockBuildPack } from "@/components/marketing/product-demo/mock-build-pack";
import { MockIdea } from "@/components/marketing/product-demo/mock-idea";

type Step = {
  num: string;
  title: string;
  description: string;
};

const STEPS: Step[] = [
  {
    num: "01",
    title: "Describe Your Idea",
    description:
      'Even if it\'s just a sentence. "I want to build an app that helps dog walkers find clients" is enough to start.',
  },
  {
    num: "02",
    title: "AI Runs the Workshop",
    description:
      "Our AI facilitator walks you through a structured 10-step Design Thinking process — the same framework consultants charge $5,000+ for.",
  },
  {
    num: "03",
    title: "Walk Away Build-Ready",
    description:
      "Download your Build Pack: PRD, technical roadmap and more. Hand it to developers or feed it to AI coding tools.",
  },
];

/** The matching mock for each step, used in the static mobile fallback. */
function MockForStep({ index }: { index: number }) {
  if (index === 0) return <MockIdea play={false} />;
  if (index === 1) return <MockWorkshop play={false} />;
  return <MockBuildPack play={false} />;
}

function Header() {
  return (
    <div className="mb-10 max-w-2xl lg:mb-12">
      <p className="mb-4 text-sm font-medium uppercase tracking-widest text-olive-600 dark:text-olive-400">
        Process
      </p>
      <h2 className="font-serif text-3xl leading-[1.1] tracking-tight text-foreground sm:text-4xl md:text-5xl">
        Three steps. One session.
        <br /> A complete blueprint.
      </h2>
    </div>
  );
}

export function ProcessScrollytelling() {
  const trackRef = useRef<HTMLDivElement>(null);
  const panelRef = useRef<HTMLDivElement>(null);
  const progressFillRef = useRef<HTMLDivElement>(null);
  const [activeStep, setActiveStep] = useState(0);

  useEffect(() => {
    gsap.registerPlugin(ScrollTrigger);

    const ctx = gsap.context(() => {
      const mm = gsap.matchMedia();

      // Pinned scrollytelling only on larger screens with motion allowed.
      mm.add(
        "(min-width: 768px) and (prefers-reduced-motion: no-preference)",
        () => {
          const st = ScrollTrigger.create({
            trigger: panelRef.current,
            start: "top top",
            // One viewport of scroll per step keeps each phase on screen long
            // enough to read before the next slides in.
            end: () => "+=" + STEPS.length * window.innerHeight,
            pin: true,
            pinSpacing: true,
            anticipatePin: 1,
            scrub: true,
            onUpdate: (self) => {
              const p = self.progress;
              if (progressFillRef.current) {
                progressFillRef.current.style.transform = `scaleY(${p})`;
              }
              const idx = Math.min(
                STEPS.length - 1,
                Math.floor(p * STEPS.length),
              );
              setActiveStep((prev) => (prev === idx ? prev : idx));
            },
          });

          return () => st.kill();
        },
      );
    }, trackRef);

    return () => ctx.revert();
  }, []);

  return (
    <>
      {/* ── Desktop: pinned scroll-driven product demo ──────────── */}
      <section
        ref={trackRef}
        aria-label="How it works"
        className="hidden border-t border-border bg-background md:block"
      >
        <div
          ref={panelRef}
          className="relative flex h-screen flex-col justify-center overflow-hidden py-16"
        >
          {/* Section-wide dotted board (behind all three steps), bleeds right */}
          <DemoBoard />
          {/* Concentric rings — step 2 only, span the section top↔bottom */}
          <DemoRings active={activeStep === 1} />
          <div className="relative z-10 mx-auto w-full max-w-6xl px-4 sm:px-6 lg:px-8">
            <Header />

            <div className="grid grid-cols-1 items-center gap-10 lg:grid-cols-12 lg:gap-12">
              {/* Left — the three steps, active one emphasized */}
              <div className="relative lg:col-span-4">
                <div className="absolute left-0 top-0 h-full w-px bg-border" />
                <div
                  ref={progressFillRef}
                  className="absolute left-0 top-0 h-full w-px origin-top bg-olive-600 dark:bg-olive-400"
                  style={{ transform: "scaleY(0)" }}
                />

                <ol className="space-y-8 pl-8">
                  {STEPS.map((step, i) => {
                    const active = activeStep === i;
                    return (
                      <li
                        key={step.num}
                        className="transition-opacity duration-500 ease-out"
                        style={{ opacity: active ? 1 : 0.3 }}
                      >
                        <span className="font-mono text-sm text-olive-600 dark:text-olive-400">
                          {step.num}
                        </span>
                        <h3 className="mt-1 text-xl font-semibold tracking-tight text-foreground sm:text-2xl">
                          {step.title}
                        </h3>
                        <p className="mt-2 max-w-lg leading-relaxed text-muted-foreground">
                          {step.description}
                        </p>
                      </li>
                    );
                  })}
                </ol>
              </div>

              {/* Right — animated lookalike product UI (larger; board bleeds right) */}
              <div className="lg:col-span-8 h-[clamp(360px,56vh,600px)]">
                <DemoStage activeStep={activeStep} />
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ── Mobile / reduced-motion: plain stacked layout ───────── */}
      <section
        aria-label="How it works"
        className="border-t border-border bg-background py-24 md:hidden"
        style={{ contentVisibility: "auto", containIntrinsicSize: "0 1200px" }}
      >
        <div className="mx-auto max-w-6xl px-4 sm:px-6">
          <Header />
          <div className="space-y-16">
            {STEPS.map((step, i) => (
              <div key={step.num} className="space-y-5">
                <div
                  className="aspect-[4/3] w-full overflow-hidden rounded-2xl"
                  style={DOTTED_BG}
                >
                  <MockForStep index={i} />
                </div>
                <div>
                  <span className="font-mono text-sm text-olive-600 dark:text-olive-400">
                    {step.num}
                  </span>
                  <h3 className="mt-1 text-xl font-semibold tracking-tight text-foreground sm:text-2xl">
                    {step.title}
                  </h3>
                  <p className="mt-2 leading-relaxed text-muted-foreground">
                    {step.description}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>
    </>
  );
}
