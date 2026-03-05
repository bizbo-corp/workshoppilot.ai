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
      className="group/note absolute pointer-events-auto rounded-xl bg-card/90 backdrop-blur-sm border border-border w-[90px] h-[90px] flex items-center justify-center shadow-md will-change-transform transition-all duration-300 ease-out hover:bg-amber-100 hover:dark:bg-amber-200 hover:border-amber-200 hover:dark:border-amber-300 hover:shadow-[inset_0_0_0_1px_rgba(0,0,0,0.06),0_2px_8px_-2px_rgba(0,0,0,0.25)] hover:rounded-md cursor-default"
      style={
        {
          left,
          top,
          zIndex: z,
          transform: `rotate(${rotation})`,
          "--note-rotation": rotation,
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
      className="absolute inset-0 pointer-events-none overflow-hidden"
      aria-hidden="true"
    >
      {/* ── Light trails (lg+) ── */}
      <LightTrails />

      {/* ── Stickies — lower left (md+) ── */}
      <div className="hidden md:block">
        <StickyNote
          text="Pain Point"
          left="12%"
          top="46%"
          rotation="-2deg"
          delay="0s"
          z={2}
          trailIndex={0}
        />
        <StickyNote
          text="Problem"
          left="8%"
          top="58%"
          rotation="1.5deg"
          delay="0.8s"
          z={1}
          trailIndex={1}
        />
        <StickyNote
          text="Concept"
          left="16%"
          top="60%"
          rotation="-1deg"
          delay="1.6s"
          z={3}
          trailIndex={2}
        />
        <StickyNote
          text="Goal"
          left="16%"
          top="72%"
          rotation="3deg"
          delay="2.4s"
          z={1}
          trailIndex={3}
        />
        <StickyNote
          text="Idea"
          left="6%"
          top="68%"
          rotation="-3deg"
          delay="3.2s"
          z={1}
          trailIndex={4}
        />
        <StickyNote
          text="Conduct user interviews"
          left="13%"
          top="56.5%"
          rotation="2deg"
          delay="0s"
          z={4}
          trailIndex={5}
        />

        {/* 4 Cursors — staggered delays so they don't move in sync */}
        <UserCursor
          name="Sales"
          color="#16a34a"
          left="18%"
          top="56%"
          drift="cursor-drift-1 9s"
          delay="0s"
        />
        <UserCursor
          name="Facilitator"
          color="#6366f1"
          left="24%"
          top="62%"
          drift="cursor-drift-2 11s"
          delay="2s"
          hasIcon
        />
        <UserCursor
          name="Product"
          color="#e05c14ff"
          left="10%"
          top="66%"
          drift="cursor-drift-3 10s"
          delay="4s"
        />
        <UserCursor
          name="Operations"
          color="#e97820"
          left="14%"
          top="76%"
          drift="cursor-drift-1 12s"
          delay="6s"
        />
        <UserCursor
          name="Founder"
          color="#06b6d4"
          left="22%"
          top="70%"
          drift="cursor-drift-3 10s"
          delay="3s"
        />
      </div>

      {/* ── Deliverables — 2×3 grid, lower right (lg+) ── */}
      <div
        data-trail-dest-container
        className="hidden lg:grid absolute grid-cols-2 gap-3 w-[340px]"
        style={{ right: "12%", top: "62%", transform: "translateY(-50%)" }}
      >
        {deliverables.map(
          ({ icon: Icon, label, rotation, delay, color }, i) => (
            <div
              key={label}
              data-trail-dest={i}
              className="rounded-xl bg-card/90 backdrop-blur-sm border border-border px-3 py-2.5 shadow-md will-change-transform flex items-center gap-2.5"
              style={
                {
                  transform: `rotate(${rotation})`,
                  "--note-rotation": rotation,
                  animation: `note-float 6s ease-in-out ${delay} infinite`,
                } as React.CSSProperties
              }
            >
              <div
                className="w-8 h-8 rounded-lg flex items-center justify-center shrink-0"
                style={{ backgroundColor: color }}
              >
                <Icon className="h-3.5 w-3.5 text-white" />
              </div>
              <span className="text-[12px] font-medium text-foreground whitespace-nowrap">
                {label}
              </span>
            </div>
          ),
        )}
      </div>
    </div>
  );
}
