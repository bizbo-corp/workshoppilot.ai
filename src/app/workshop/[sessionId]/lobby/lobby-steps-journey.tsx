/**
 * LobbyStepsJourney
 *
 * Illustrated preview of the 10 design-thinking stages the participant will move
 * through (steps 2–11, since the challenge is already framed before the lobby).
 *
 * Each card has a hand-drawn-feeling SVG that emulates the sketchy, amber-toned
 * style of the paywall/ideation visuals — to make the workshop feel like the
 * creative tool it is, not a form to fill in.
 */

import type { ReactNode } from 'react';

interface StepCard {
  order: number;
  name: string;
  description: string;
  illustration: ReactNode;
  /** Tailwind classes for the step-number badge — picked per card to keep visual rhythm. */
  badgeBg: string;
  badgeText: string;
}

const STEP_CARDS: StepCard[] = [
  {
    order: 2,
    name: 'Stakeholder Interviews',
    description:
      'Map who matters — power, interest, influence — and decide who you actually need to talk to.',
    illustration: <StakeholderIllustration />,
    badgeBg: 'bg-amber-100 dark:bg-amber-900/50',
    badgeText: 'text-amber-700 dark:text-amber-300',
  },
  {
    order: 3,
    name: 'User Research',
    description:
      'Sit down with real or synthetic users in conversation — surface real pains and hidden needs.',
    illustration: <ResearchIllustration />,
    badgeBg: 'bg-cyan-100 dark:bg-cyan-900/50',
    badgeText: 'text-cyan-700 dark:text-cyan-300',
  },
  {
    order: 4,
    name: 'Sense Making',
    description:
      'Cluster everything you heard into themes, pains, and gains until patterns start to shimmer.',
    illustration: <SenseMakingIllustration />,
    badgeBg: 'bg-violet-100 dark:bg-violet-900/50',
    badgeText: 'text-violet-700 dark:text-violet-300',
  },
  {
    order: 5,
    name: 'Personas',
    description:
      'Pull your insights into a real human you can design for — name, story, motivations, the lot.',
    illustration: <PersonaIllustration />,
    badgeBg: 'bg-pink-100 dark:bg-pink-900/50',
    badgeText: 'text-pink-700 dark:text-pink-300',
  },
  {
    order: 6,
    name: 'Journey Mapping',
    description:
      "Walk through your persona's experience step by step and find where it falls apart — the dip is the opportunity.",
    illustration: <JourneyIllustration />,
    badgeBg: 'bg-emerald-100 dark:bg-emerald-900/50',
    badgeText: 'text-emerald-700 dark:text-emerald-300',
  },
  {
    order: 7,
    name: 'Reframe',
    description:
      'Sharpen the question. Turn the fuzzy challenge into a focused How Might We you can actually answer.',
    illustration: <ReframeIllustration />,
    badgeBg: 'bg-yellow-100 dark:bg-yellow-900/50',
    badgeText: 'text-yellow-700 dark:text-yellow-300',
  },
  {
    order: 8,
    name: 'Ideation',
    description:
      'Mind maps and Crazy 8s sketching — generate volume first, judge later. The good ideas hide behind the bad ones.',
    illustration: <IdeationIllustration />,
    badgeBg: 'bg-orange-100 dark:bg-orange-900/50',
    badgeText: 'text-orange-700 dark:text-orange-300',
  },
  {
    order: 9,
    name: 'Brain Writing',
    description:
      'Take the ideas you picked and push each one further — draw variations until the strongest version reveals itself.',
    illustration: <BrainWritingIllustration />,
    badgeBg: 'bg-rose-100 dark:bg-rose-900/50',
    badgeText: 'text-rose-700 dark:text-rose-300',
  },
  {
    order: 10,
    name: 'Concept Development',
    description:
      'Pressure-test the strongest ideas with SWOT, feasibility, and an elevator pitch a five-year-old could repeat.',
    illustration: <ConceptIllustration />,
    badgeBg: 'bg-indigo-100 dark:bg-indigo-900/50',
    badgeText: 'text-indigo-700 dark:text-indigo-300',
  },
  {
    order: 11,
    name: 'Validate & Ship',
    description:
      'Flow diagrams, PRD, user stories — your validated Build Pack, ready to hand to an AI coder or a real one.',
    illustration: <ValidateIllustration />,
    badgeBg: 'bg-green-100 dark:bg-green-900/50',
    badgeText: 'text-green-700 dark:text-green-300',
  },
];

export function LobbyStepsJourney() {
  return (
    <section className="rounded-3xl border bg-card p-6 shadow-sm sm:p-8">
      <div className="mb-6 flex flex-col items-start gap-2 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="text-xs font-bold uppercase tracking-[0.18em] text-muted-foreground">
            The journey ahead
          </p>
          <h2 className="mt-1 text-2xl font-semibold leading-tight sm:text-3xl">
            Ten stages, one validated build pack
          </h2>
        </div>
        <p className="text-sm text-muted-foreground sm:max-w-xs sm:text-right">
          A guided arc from fuzzy problem to a PRD, user stories, and tech specs you can ship.
        </p>
      </div>

      <ol className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {STEP_CARDS.map((card) => (
          <li
            key={card.order}
            className="group relative overflow-hidden rounded-2xl border bg-background/60 p-5 transition-all hover:border-foreground/20 hover:shadow-md"
          >
            <div className="mb-3 flex items-center gap-2">
              <span
                className={`inline-flex h-7 w-7 items-center justify-center rounded-full text-xs font-bold ${card.badgeBg} ${card.badgeText}`}
              >
                {card.order - 1}
              </span>
              <h3 className="text-sm font-semibold leading-tight">{card.name}</h3>
            </div>

            <div className="mb-3 flex h-24 items-center justify-center rounded-lg bg-gradient-to-br from-muted/50 to-muted/20 p-3">
              {card.illustration}
            </div>

            <p className="text-xs leading-relaxed text-muted-foreground">
              {card.description}
            </p>
          </li>
        ))}
      </ol>
    </section>
  );
}

/* ────────────────────────────────────────────────────────────────────────────
 * Illustrations — each is a self-contained SVG, ~120×80, hand-drawn feel.
 * Style: thin strokes, semi-transparent fills, paper-like, no photo realism.
 * ────────────────────────────────────────────────────────────────────────── */

function StakeholderIllustration() {
  // Three concentric circles (inner = core stakeholders, middle = secondary,
  // outer = peripheral) with dots scattered across the zones.
  return (
    <svg viewBox="0 0 120 80" className="h-full w-auto">
      <g
        className="text-amber-600 dark:text-amber-400"
        stroke="currentColor"
        strokeWidth="0.9"
        fill="none"
      >
        <circle cx="60" cy="40" r="32" opacity="0.35" />
        <circle cx="60" cy="40" r="22" opacity="0.5" />
        <circle cx="60" cy="40" r="11" opacity="0.7" />
      </g>
      <g className="text-amber-500 dark:text-amber-400" fill="currentColor">
        {/* Two dots per zone, placed in opposite quadrants for an even scatter. */}
        {/* Inner zone */}
        <circle cx="56" cy="38" r="2.4" opacity="0.9" />
        <circle cx="66" cy="44" r="2" opacity="0.8" />
        {/* Middle zone */}
        <circle cx="47" cy="34" r="2.2" opacity="0.75" />
        <circle cx="72" cy="50" r="2.2" opacity="0.75" />
        {/* Outer zone */}
        <circle cx="84" cy="26" r="2" opacity="0.65" />
        <circle cx="36" cy="56" r="2" opacity="0.65" />
      </g>
    </svg>
  );
}

function ResearchIllustration() {
  // Two chat bubbles facing each other — interview vibe.
  return (
    <svg viewBox="0 0 120 80" className="h-full w-auto">
      <g className="text-cyan-600 dark:text-cyan-400">
        <path
          d="M14 22 q0 -6 6 -6 h32 q6 0 6 6 v14 q0 6 -6 6 h-22 l-8 7 v-7 q-8 0 -8 -6 z"
          fill="currentColor"
          opacity="0.18"
          stroke="currentColor"
          strokeWidth="0.8"
        />
        <line x1="22" y1="26" x2="48" y2="26" stroke="currentColor" strokeWidth="0.8" opacity="0.55" />
        <line x1="22" y1="31" x2="42" y2="31" stroke="currentColor" strokeWidth="0.8" opacity="0.55" />
        <line x1="22" y1="36" x2="46" y2="36" stroke="currentColor" strokeWidth="0.8" opacity="0.55" />
      </g>
      <g className="text-cyan-500 dark:text-cyan-300">
        <path
          d="M62 40 q0 -6 6 -6 h32 q6 0 6 6 v14 q0 6 -6 6 h-8 l-6 7 v-7 h-18 q-6 0 -6 -6 z"
          fill="currentColor"
          opacity="0.18"
          stroke="currentColor"
          strokeWidth="0.8"
        />
        <line x1="70" y1="44" x2="98" y2="44" stroke="currentColor" strokeWidth="0.8" opacity="0.55" />
        <line x1="70" y1="49" x2="94" y2="49" stroke="currentColor" strokeWidth="0.8" opacity="0.55" />
        <line x1="70" y1="54" x2="100" y2="54" stroke="currentColor" strokeWidth="0.8" opacity="0.55" />
      </g>
    </svg>
  );
}

function SenseMakingIllustration() {
  // Three clusters of sticky notes.
  return (
    <svg viewBox="0 0 120 80" className="h-full w-auto">
      <g>
        {/* Cluster 1 */}
        <rect x="10" y="14" width="14" height="14" rx="1" fill="#fde68a" opacity="0.9" transform="rotate(-4 17 21)" />
        <rect x="18" y="20" width="14" height="14" rx="1" fill="#fcd34d" opacity="0.85" transform="rotate(3 25 27)" />
        <rect x="26" y="16" width="14" height="14" rx="1" fill="#fbbf24" opacity="0.7" transform="rotate(-2 33 23)" />
        {/* Cluster 2 */}
        <rect x="50" y="42" width="14" height="14" rx="1" fill="#c4b5fd" opacity="0.9" transform="rotate(5 57 49)" />
        <rect x="58" y="50" width="14" height="14" rx="1" fill="#a78bfa" opacity="0.8" transform="rotate(-3 65 57)" />
        {/* Cluster 3 */}
        <rect x="86" y="18" width="14" height="14" rx="1" fill="#86efac" opacity="0.9" transform="rotate(-5 93 25)" />
        <rect x="94" y="26" width="14" height="14" rx="1" fill="#4ade80" opacity="0.75" transform="rotate(4 101 33)" />
        <rect x="84" y="32" width="14" height="14" rx="1" fill="#22c55e" opacity="0.6" transform="rotate(-2 91 39)" />
      </g>
      <g className="text-violet-600 dark:text-violet-400" stroke="currentColor" strokeWidth="0.6" fill="none" opacity="0.3" strokeDasharray="2 2">
        <ellipse cx="25" cy="22" rx="20" ry="12" />
        <ellipse cx="62" cy="52" rx="16" ry="10" />
        <ellipse cx="95" cy="30" rx="16" ry="14" />
      </g>
    </svg>
  );
}

function PersonaIllustration() {
  // Persona card with profile circle + name lines.
  return (
    <svg viewBox="0 0 120 80" className="h-full w-auto">
      <g className="text-pink-600 dark:text-pink-400">
        <rect x="22" y="8" width="76" height="64" rx="4" fill="currentColor" opacity="0.1" stroke="currentColor" strokeWidth="0.8" />
        <circle cx="44" cy="28" r="9" fill="currentColor" opacity="0.3" />
        <path d="M30 50 q14 -10 28 0 v6 h-28 z" fill="currentColor" opacity="0.25" />
      </g>
      <g className="text-pink-700 dark:text-pink-300" stroke="currentColor" strokeWidth="0.9" opacity="0.7">
        <line x1="62" y1="20" x2="92" y2="20" />
        <line x1="62" y1="26" x2="86" y2="26" />
        <line x1="62" y1="34" x2="90" y2="34" />
        <line x1="62" y1="40" x2="80" y2="40" />
        <line x1="30" y1="60" x2="90" y2="60" opacity="0.5" />
        <line x1="30" y1="65" x2="80" y2="65" opacity="0.5" />
      </g>
    </svg>
  );
}

function JourneyIllustration() {
  // Emotional curve with the "dip" highlighted.
  return (
    <svg viewBox="0 0 120 80" className="h-full w-auto">
      <g className="text-emerald-600 dark:text-emerald-400">
        <path
          d="M10 30 Q 25 18, 38 30 T 64 56 T 90 38 T 112 28"
          stroke="currentColor"
          strokeWidth="1.6"
          fill="none"
          opacity="0.85"
        />
        <circle cx="10" cy="30" r="2.5" fill="currentColor" opacity="0.9" />
        <circle cx="38" cy="30" r="2.5" fill="currentColor" opacity="0.9" />
        <circle cx="64" cy="56" r="3.5" fill="#dc2626" opacity="0.85" />
        <circle cx="90" cy="38" r="2.5" fill="currentColor" opacity="0.9" />
        <circle cx="112" cy="28" r="2.5" fill="currentColor" opacity="0.9" />
        <line x1="6" y1="68" x2="116" y2="68" stroke="currentColor" strokeWidth="0.6" opacity="0.3" />
      </g>
      <text x="56" y="72" fontSize="5" fill="#dc2626" opacity="0.85" fontWeight="600">the dip</text>
    </svg>
  );
}

function ReframeIllustration() {
  // "HMW?" speech bubble with a lightbulb spark.
  return (
    <svg viewBox="0 0 120 80" className="h-full w-auto">
      <g className="text-yellow-600 dark:text-yellow-400">
        <path
          d="M20 18 q0 -6 6 -6 h62 q6 0 6 6 v28 q0 6 -6 6 h-46 l-10 10 v-10 h-6 q-6 0 -6 -6 z"
          fill="currentColor"
          opacity="0.18"
          stroke="currentColor"
          strokeWidth="0.9"
        />
        <text x="36" y="38" fontSize="14" fontWeight="700" fill="currentColor" opacity="0.85">HMW?</text>
      </g>
      <g className="text-yellow-500 dark:text-yellow-300" fill="currentColor">
        <path d="M104 12 l2 5 l5 2 l-5 2 l-2 5 l-2 -5 l-5 -2 l5 -2 z" opacity="0.85" />
        <path d="M98 38 l1.4 3.5 l3.5 1.4 l-3.5 1.4 l-1.4 3.5 l-1.4 -3.5 l-3.5 -1.4 l3.5 -1.4 z" opacity="0.6" />
      </g>
    </svg>
  );
}

function IdeationIllustration() {
  // Mini mind map + a tiny crazy 8s grid hint.
  return (
    <svg viewBox="0 0 120 80" className="h-full w-auto">
      <g className="text-orange-600 dark:text-orange-400">
        <circle cx="40" cy="40" r="11" fill="currentColor" opacity="0.25" />
        <text x="40" y="43" textAnchor="middle" fontSize="6" fontWeight="700" fill="currentColor" opacity="0.85">HMW</text>
        <line x1="49" y1="34" x2="68" y2="20" stroke="currentColor" strokeWidth="1" opacity="0.5" />
        <line x1="51" y1="40" x2="74" y2="40" stroke="currentColor" strokeWidth="1" opacity="0.5" />
        <line x1="49" y1="46" x2="68" y2="60" stroke="currentColor" strokeWidth="1" opacity="0.5" />
        <line x1="31" y1="34" x2="14" y2="22" stroke="currentColor" strokeWidth="1" opacity="0.5" />
        <line x1="29" y1="40" x2="10" y2="40" stroke="currentColor" strokeWidth="1" opacity="0.5" />
        <line x1="31" y1="46" x2="14" y2="58" stroke="currentColor" strokeWidth="1" opacity="0.5" />
        <circle cx="68" cy="20" r="4" fill="currentColor" opacity="0.4" />
        <circle cx="74" cy="40" r="4" fill="currentColor" opacity="0.4" />
        <circle cx="68" cy="60" r="4" fill="currentColor" opacity="0.4" />
        <circle cx="14" cy="22" r="4" fill="currentColor" opacity="0.4" />
        <circle cx="10" cy="40" r="4" fill="currentColor" opacity="0.4" />
        <circle cx="14" cy="58" r="4" fill="currentColor" opacity="0.4" />
      </g>
      <g className="text-orange-500 dark:text-orange-300" fill="none" stroke="currentColor" strokeWidth="0.6" opacity="0.5">
        <rect x="86" y="8" width="28" height="62" rx="2" />
        <line x1="86" y1="23.5" x2="114" y2="23.5" />
        <line x1="86" y1="39" x2="114" y2="39" />
        <line x1="86" y1="54.5" x2="114" y2="54.5" />
        <line x1="100" y1="8" x2="100" y2="70" />
      </g>
    </svg>
  );
}

function BrainWritingIllustration() {
  // One original sketch + three variations branching off — divergent iteration.
  return (
    <svg viewBox="0 0 120 80" className="h-full w-auto">
      <g className="text-rose-600 dark:text-rose-400" fill="none" stroke="currentColor" strokeWidth="0.9">
        {/* Original */}
        <rect x="8" y="30" width="22" height="20" rx="2" fill="currentColor" fillOpacity="0.28" opacity="0.85" />
        <circle cx="19" cy="40" r="4" fill="currentColor" fillOpacity="0.5" stroke="none" />
        {/* Variations */}
        <rect x="60" y="8" width="22" height="18" rx="2" fill="currentColor" fillOpacity="0.16" opacity="0.7" />
        <rect x="60" y="31" width="22" height="18" rx="2" fill="currentColor" fillOpacity="0.16" opacity="0.7" />
        <rect x="60" y="54" width="22" height="18" rx="2" fill="currentColor" fillOpacity="0.16" opacity="0.7" />
        {/* Arrows */}
        <path d="M30 36 L 60 18" strokeWidth="0.8" opacity="0.55" />
        <path d="M30 40 L 60 40" strokeWidth="0.8" opacity="0.55" />
        <path d="M30 44 L 60 62" strokeWidth="0.8" opacity="0.55" />
      </g>
      <g className="text-rose-500 dark:text-rose-300" fill="currentColor" opacity="0.7">
        <path d="M98 14 l1.4 3.5 l3.5 1.4 l-3.5 1.4 l-1.4 3.5 l-1.4 -3.5 l-3.5 -1.4 l3.5 -1.4 z" />
        <path d="M100 56 l1.1 2.8 l2.8 1.1 l-2.8 1.1 l-1.1 2.8 l-1.1 -2.8 l-2.8 -1.1 l2.8 -1.1 z" opacity="0.6" />
      </g>
    </svg>
  );
}

function ConceptIllustration() {
  // SWOT quadrant.
  return (
    <svg viewBox="0 0 120 80" className="h-full w-auto">
      <g>
        <rect x="22" y="10" width="38" height="28" rx="2" fill="#86efac" opacity="0.45" />
        <rect x="62" y="10" width="38" height="28" rx="2" fill="#fca5a5" opacity="0.45" />
        <rect x="22" y="40" width="38" height="28" rx="2" fill="#93c5fd" opacity="0.45" />
        <rect x="62" y="40" width="38" height="28" rx="2" fill="#fcd34d" opacity="0.45" />
        <text x="26" y="22" fontSize="6" fontWeight="700" fill="#166534" opacity="0.85">S</text>
        <text x="66" y="22" fontSize="6" fontWeight="700" fill="#991b1b" opacity="0.85">W</text>
        <text x="26" y="52" fontSize="6" fontWeight="700" fill="#1e40af" opacity="0.85">O</text>
        <text x="66" y="52" fontSize="6" fontWeight="700" fill="#92400e" opacity="0.85">T</text>
      </g>
      <g stroke="#4f46e5" strokeWidth="0.6" opacity="0.5">
        <line x1="22" y1="39" x2="100" y2="39" />
        <line x1="61" y1="10" x2="61" y2="68" />
      </g>
    </svg>
  );
}

function ValidateIllustration() {
  // Flow chart with a checkmark at the end.
  return (
    <svg viewBox="0 0 120 80" className="h-full w-auto">
      <g className="text-green-600 dark:text-green-400" fill="none" stroke="currentColor" strokeWidth="0.9" opacity="0.65">
        <rect x="10" y="32" width="20" height="16" rx="2" fill="currentColor" fillOpacity="0.18" />
        <rect x="42" y="14" width="20" height="16" rx="2" fill="currentColor" fillOpacity="0.18" />
        <rect x="42" y="50" width="20" height="16" rx="2" fill="currentColor" fillOpacity="0.18" />
        <path d="M30 40 L 42 22" />
        <path d="M30 40 L 42 58" />
        <path d="M62 22 L 78 40" />
        <path d="M62 58 L 78 40" />
      </g>
      <g>
        <circle cx="92" cy="40" r="13" fill="#16a34a" opacity="0.95" />
        <path
          d="M86 40 l5 5 l9 -10"
          fill="none"
          stroke="white"
          strokeWidth="2.2"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </g>
    </svg>
  );
}
