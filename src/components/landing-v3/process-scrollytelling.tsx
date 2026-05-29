"use client";

import { useEffect, useRef, useState } from "react";
import { ImageIcon, MessageSquare, Package, Sparkles } from "lucide-react";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";

type Step = {
  num: string;
  title: string;
  description: string;
  icon: typeof MessageSquare;
};

const STEPS: Step[] = [
  {
    num: "01",
    title: "Describe Your Idea",
    description:
      'Even if it\'s just a sentence. "I want to build an app that helps dog walkers find clients" is enough to start.',
    icon: MessageSquare,
  },
  {
    num: "02",
    title: "AI Runs the Workshop",
    description:
      "Our AI facilitator walks you through a structured 10-step Design Thinking process — the same framework consultants charge $5,000+ for.",
    icon: Sparkles,
  },
  {
    num: "03",
    title: "Walk Away Build-Ready",
    description:
      "Download your Build Pack: PRD, technical roadmap and more. Hand it to developers or feed it to AI coding tools.",
    icon: Package,
  },
];

/** Neutral, olive-tinted placeholder standing in for per-step concept art. */
function StepPlaceholder({ step }: { step: Step }) {
  const Icon = step.icon;
  return (
    <div className="flex h-full w-full flex-col items-center justify-center gap-5 rounded-2xl border border-dashed border-border bg-muted/40">
      <Icon className="h-14 w-14 text-olive-600/40 dark:text-olive-400/40" />
      <div className="text-center">
        <p className="font-mono text-xs uppercase tracking-widest text-olive-600/70 dark:text-olive-400/70">
          Step {step.num}
        </p>
        <p className="mt-1 text-sm font-medium text-muted-foreground">
          {step.title}
        </p>
      </div>
      <span className="inline-flex items-center gap-1.5 text-[11px] font-medium uppercase tracking-wider text-muted-foreground/50">
        <ImageIcon className="h-3.5 w-3.5" />
        Placeholder
      </span>
    </div>
  );
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
            // One viewport of scroll per step keeps each concept on screen
            // long enough to read before the next slides in.
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
      {/* ── Desktop: pinned scroll-driven panel ─────────────────── */}
      <section
        ref={trackRef}
        aria-label="How it works"
        className="hidden border-t border-border bg-background md:block"
      >
        <div
          ref={panelRef}
          className="flex h-screen flex-col justify-center overflow-hidden py-16"
        >
          <div className="mx-auto w-full max-w-6xl px-4 sm:px-6 lg:px-8">
            <Header />

            <div className="grid grid-cols-1 items-center gap-12 lg:grid-cols-2 lg:gap-16">
              {/* Left — crossfading placeholder image */}
              <div className="relative aspect-[4/3] w-full">
                {STEPS.map((step, i) => (
                  <div
                    key={step.num}
                    className="absolute inset-0 transition-opacity duration-500 ease-out"
                    style={{ opacity: activeStep === i ? 1 : 0 }}
                    aria-hidden={activeStep !== i}
                  >
                    <StepPlaceholder step={step} />
                  </div>
                ))}
              </div>

              {/* Right — three steps, active one emphasized */}
              <div className="relative">
                {/* progress rail */}
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
            </div>
          </div>
        </div>
      </section>

      {/* ── Mobile / reduced-motion: plain stacked layout ───────── */}
      <section
        aria-label="How it works"
        className="border-t border-border bg-background py-24 md:hidden"
        style={{ contentVisibility: "auto", containIntrinsicSize: "0 800px" }}
      >
        <div className="mx-auto max-w-6xl px-4 sm:px-6">
          <Header />
          <div className="space-y-16">
            {STEPS.map((step) => (
              <div key={step.num} className="space-y-5">
                <div className="aspect-[4/3] w-full">
                  <StepPlaceholder step={step} />
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
