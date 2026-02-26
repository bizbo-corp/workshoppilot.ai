'use client';

/* ─── Sticky Note ────────────────────────────────────────────── */

interface StickyNoteProps {
  text: string;
  className: string;
  rotation: string;
  delay: string;
}

function StickyNote({ text, className, rotation, delay }: StickyNoteProps) {
  return (
    <div
      className={`absolute rounded-lg bg-amber-100 dark:bg-amber-200 px-3 py-2.5 shadow-md will-change-transform ${className}`}
      style={{
        '--note-rotation': rotation,
        animation: `note-float 5s ease-in-out ${delay} infinite`,
      } as React.CSSProperties}
    >
      <p className="text-[11px] leading-snug font-medium text-amber-900/80 max-w-[140px]">
        {text}
      </p>
    </div>
  );
}

/* ─── Cursor + Name Pill ─────────────────────────────────────── */

interface CursorPillProps {
  name: string;
  color: string;
  pillBg: string;
  className: string;
  driftAnimation: string;
  /** Hide on mobile, show on md+ */
  desktopOnly?: boolean;
}

function CursorPill({
  name,
  color,
  pillBg,
  className,
  driftAnimation,
  desktopOnly,
}: CursorPillProps) {
  return (
    <div
      className={`absolute will-change-transform ${desktopOnly ? 'hidden md:block' : ''} ${className}`}
      style={{ animation: driftAnimation }}
    >
      {/* SVG arrow cursor */}
      <svg
        width="16"
        height="20"
        viewBox="0 0 16 20"
        fill="none"
        className="drop-shadow-sm"
      >
        <path
          d="M1 1L1 15L5.5 11.5L9 19L12 17.5L8.5 10L14 9L1 1Z"
          fill={color}
          stroke="white"
          strokeWidth="1.5"
          strokeLinejoin="round"
        />
      </svg>
      {/* Name pill */}
      <span
        className="ml-2 -mt-1 inline-block rounded-full px-2.5 py-0.5 text-[10px] font-semibold text-white shadow-sm whitespace-nowrap"
        style={{ backgroundColor: pillBg }}
      >
        {name}
      </span>
    </div>
  );
}

/* ─── Main Overlay ───────────────────────────────────────────── */

export function WorkshopSimulation() {
  return (
    <div
      className="absolute inset-x-0 bottom-0 h-[55%] pointer-events-none z-[5]"
      aria-hidden="true"
    >
      {/* Top fade gradient so elements don't hard-cut */}
      <div className="absolute inset-x-0 top-0 h-24 bg-gradient-to-b from-background to-transparent z-10" />

      {/* ── Sticky Notes ── */}

      {/* Note 1 — always visible */}
      <StickyNote
        text="User needs quick onboarding"
        className="left-[8%] top-[30%] md:left-[12%] md:top-[25%]"
        rotation="-3deg"
        delay="0s"
      />
      {/* Note 2 — always visible */}
      <StickyNote
        text="Mobile-first checkout flow"
        className="right-[10%] top-[22%] md:right-[14%] md:top-[18%]"
        rotation="2deg"
        delay="0.8s"
      />
      {/* Note 3 — desktop only */}
      <StickyNote
        text="Validate with 5 interviews"
        className="hidden md:block left-[22%] top-[55%]"
        rotation="-2deg"
        delay="1.6s"
      />
      {/* Note 4 — desktop only */}
      <StickyNote
        text="API-first architecture"
        className="hidden md:block right-[20%] top-[50%]"
        rotation="4deg"
        delay="2.4s"
      />
      {/* Note 5 — desktop only */}
      <StickyNote
        text="Offer structure for building narrative"
        className="hidden md:block left-[42%] top-[65%]"
        rotation="-1deg"
        delay="3.2s"
      />

      {/* ── Cursors ── */}

      {/* Sophie — olive/brown (always visible) */}
      <CursorPill
        name="Sophie"
        color="#6b7f4e"
        pillBg="#6b7f4e"
        className="left-[15%] top-[35%] md:left-[18%] md:top-[30%]"
        driftAnimation="cursor-drift-1 7s ease-in-out 0s infinite"
      />
      {/* Yav — pink (always visible) */}
      <CursorPill
        name="Yav"
        color="#d4618c"
        pillBg="#d4618c"
        className="right-[18%] top-[28%] md:right-[22%] md:top-[24%]"
        driftAnimation="cursor-drift-2 8s ease-in-out 0.5s infinite"
      />
      {/* Max — blue (always visible) */}
      <CursorPill
        name="Max"
        color="#3b82f6"
        pillBg="#3b82f6"
        className="left-[35%] top-[50%] md:left-[30%] md:top-[48%]"
        driftAnimation="cursor-drift-3 6.5s ease-in-out 1s infinite"
      />
      {/* Jane — blue (desktop only) */}
      <CursorPill
        name="Jane"
        color="#2563eb"
        pillBg="#2563eb"
        className="right-[30%] top-[55%]"
        driftAnimation="cursor-drift-1 9s ease-in-out 2s infinite"
        desktopOnly
      />
      {/* Dubo — green (desktop only) */}
      <CursorPill
        name="Dubo"
        color="#16a34a"
        pillBg="#16a34a"
        className="left-[48%] top-[38%]"
        driftAnimation="cursor-drift-2 7.5s ease-in-out 1.5s infinite"
        desktopOnly
      />
      {/* Kas — purple (desktop only) */}
      <CursorPill
        name="Kas"
        color="#8b5cf6"
        pillBg="#8b5cf6"
        className="right-[12%] top-[58%]"
        driftAnimation="cursor-drift-3 8.5s ease-in-out 3s infinite"
        desktopOnly
      />
      {/* Charlotte — coral (desktop only) */}
      <CursorPill
        name="Charlotte"
        color="#e87461"
        pillBg="#e87461"
        className="left-[10%] top-[62%]"
        driftAnimation="cursor-drift-1 7s ease-in-out 2.5s infinite"
        desktopOnly
      />
    </div>
  );
}
