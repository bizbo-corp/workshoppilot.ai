"use client";

import {
  Code2,
  FileText,
  Map,
  MousePointerClick,
  Presentation,
  Sparkles,
  Users as UsersIcon,
} from "lucide-react";
import { LightTrails } from "./light-trails";

/* ─── Sticky Note ───────────────────────────────────────────── */

function StickyNote({
  text,
  left,
  top,
  rotation,
  delay = "0s",
  z = 1,
  trailIndex,
}: {
  text: string;
  left: string;
  top: string;
  rotation: string;
  delay?: string;
  z?: number;
  trailIndex?: number;
}) {
  return (
    <div
      data-trail-source={trailIndex}
      className="group/note absolute pointer-events-auto rounded-xl bg-card/20 backdrop-blur-xl border border-white/[0.08] w-[90px] h-[90px] flex items-center justify-center will-change-transform transition-all duration-300 ease-out hover:bg-amber-100/80 hover:dark:bg-amber-200/80 hover:rounded-md cursor-default"
      /* glassmorphic lighting is applied via style.boxShadow below */
      style={
        {
          left,
          top,
          zIndex: z,
          transform: `rotate(${rotation})`,
          "--note-rotation": rotation,
          boxShadow:
            "inset 0 1px 0 rgba(240, 214, 49, 0.15), inset 0 -1px 0 rgba(0,0,0,0.08), 0 2px 8px -2px rgba(0,0,0,0.12)",
        } as React.CSSProperties
      }
    >
      <p className="text-xs font-medium text-center leading-tight text-foreground group-hover/note:text-amber-900/80 group-hover/note:font-semibold px-1.5 transition-colors duration-300">
        {text}
      </p>
    </div>
  );
}

/* ─── Cursor + Name Pill ────────────────────────────────────── */

function UserCursor({
  name,
  color,
  left,
  top,
  drift,
  delay,
  hasIcon,
}: {
  name: string;
  color: string;
  left: string;
  top: string;
  drift: string;
  delay: string;
  hasIcon?: boolean;
}) {
  return (
    <div
      className="absolute will-change-transform z-[4]"
      style={{
        left,
        top,
        animation: `${drift} ease-in-out ${delay} infinite`,
      }}
    >
      <svg
        width="14"
        height="18"
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
      <span
        className="ml-1.5 -mt-0.5 inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-[10px] font-semibold text-white shadow-sm whitespace-nowrap"
        style={{ backgroundColor: color }}
      >
        {hasIcon && <Sparkles className="h-2.5 w-2.5" />}
        {name}
      </span>
    </div>
  );
}

/* ─── Deliverables data ────────────────────────────────────── */

const deliverables = [
  {
    icon: FileText,
    label: "Markdown PRDs",
    rotation: "1deg",
    delay: "0.2s",
    color: "#16a34a",
  },
  {
    icon: Code2,
    label: "Tech Specs",
    rotation: "-1.5deg",
    delay: "1s",
    color: "#6366f1",
  },
  {
    icon: UsersIcon,
    label: "User Stories",
    rotation: "2deg",
    delay: "1.8s",
    color: "#6366f1",
  },
  {
    icon: Presentation,
    label: "Stakeholder Deck",
    rotation: "-1deg",
    delay: "2.5s",
    color: "#e97820",
  },
  {
    icon: Map,
    label: "Journey Map",
    rotation: "1.5deg",
    delay: "3.2s",
    color: "#06b6d4",
  },
  {
    icon: MousePointerClick,
    label: "Prototype",
    rotation: "-2deg",
    delay: "0.6s",
    color: "#16a34a",
  },
];

/* ─── Main Component ────────────────────────────────────────── */

export function HeroVisual() {
  return (
    <div
      className="absolute inset-0 pointer-events-none overflow-hidden bg-red-500/0"
      aria-hidden="true"
    >
      {/* ── Light trails (lg+) ── */}
      <LightTrails />

      {/* ── Stickies — start near top, spread downward ── */}
      <div className="absolute inset-0 scale-[0.55] sm:scale-[0.65] md:scale-[0.75] lg:scale-[0.85] xl:scale-100">
        <StickyNote
          text="Pain Point"
          left="12%"
          top="8%"
          rotation="-2deg"
          delay="0s"
          z={2}
          trailIndex={0}
        />
        <StickyNote
          text="Problem"
          left="8%"
          top="28%"
          rotation="1.5deg"
          delay="0.8s"
          z={1}
          trailIndex={1}
        />
        <StickyNote
          text="Concept"
          left="16%"
          top="32%"
          rotation="-1deg"
          delay="1.6s"
          z={3}
          trailIndex={2}
        />
        <StickyNote
          text="Goal"
          left="16%"
          top="58%"
          rotation="3deg"
          delay="2.4s"
          z={1}
          trailIndex={3}
        />
        <StickyNote
          text="Idea"
          left="6%"
          top="50%"
          rotation="-3deg"
          delay="3.2s"
          z={1}
          trailIndex={4}
        />
        <StickyNote
          text="Conduct user interviews"
          left="13%"
          top="18%"
          rotation="2deg"
          delay="0s"
          z={4}
          trailIndex={5}
        />

        {/* Cursors — md+ only */}
        <div className="hidden md:block">
          <UserCursor
            name="Sales"
            color="#16a34a"
            left="18%"
            top="14%"
            drift="cursor-drift-1 9s"
            delay="0s"
          />
          <UserCursor
            name="Facilitator"
            color="#6366f1"
            left="24%"
            top="28%"
            drift="cursor-drift-2 11s"
            delay="2s"
            hasIcon
          />
          <UserCursor
            name="Product"
            color="#e05c14ff"
            left="10%"
            top="38%"
            drift="cursor-drift-3 10s"
            delay="4s"
          />
          <UserCursor
            name="Operations"
            color="#e97820"
            left="14%"
            top="56%"
            drift="cursor-drift-1 12s"
            delay="6s"
          />
          <UserCursor
            name="Founder"
            color="#06b6d4"
            left="22%"
            top="46%"
            drift="cursor-drift-3 10s"
            delay="3s"
          />
        </div>
      </div>

      {/* ── Deliverables — top-aligned, right side ── */}
      <div
        data-trail-dest-container
        className="grid absolute grid-cols-2 gap-1.5 w-[220px] right-[1%] top-1/2 -translate-y-1/2 sm:w-[280px] sm:gap-2 sm:right-[2%] md:w-[340px] md:gap-2.5 md:right-[5%] lg:w-[400px] lg:gap-3 lg:right-[8%] rounded-2xl bg-card/30 backdrop-blur-xl p-3 sm:p-4"
        style={{
          boxShadow:
            "inset 0 1px 0 rgba(255,255,255,0.15), inset 0 -1px 0 rgba(0,0,0,0.06), 0 4px 24px -4px rgba(0,0,0,0.08)",
        }}
      >
        {deliverables.map(
          ({ icon: Icon, label, rotation, delay, color }, i) => (
            <div
              key={label}
              data-trail-dest={i}
              className="rounded-xl bg-card/50 backdrop-blur-xl border border-foreground/[0.08] px-2 py-1.5 sm:px-2.5 sm:py-2 md:px-3 md:py-2.5 will-change-transform flex items-center gap-1.5 sm:gap-2 md:gap-2.5"
              style={
                {
                  transform: `rotate(${rotation})`,
                  "--note-rotation": rotation,
                  animation: `note-float 6s ease-in-out ${delay} infinite`,
                  boxShadow:
                    "inset 0 1px 0 rgba(255,255,255,0.15), inset 0 -1px 0 rgba(0,0,0,0.08), 0 2px 8px -2px rgba(0,0,0,0.12)",
                } as React.CSSProperties
              }
            >
              <div
                className="w-6 h-6 sm:w-7 sm:h-7 md:w-8 md:h-8 rounded-lg flex items-center justify-center shrink-0"
                style={{ backgroundColor: color }}
              >
                <Icon className="h-2.5 w-2.5 sm:h-3 sm:w-3 md:h-3.5 md:w-3.5 text-white" />
              </div>
              <span className="text-[10px] sm:text-[11px] md:text-[12px] font-medium text-foreground whitespace-nowrap">
                {label}
              </span>
            </div>
          ),
        )}
      </div>
    </div>
  );
}
