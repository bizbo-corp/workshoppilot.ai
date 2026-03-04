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

/* ─── Sticky Note ───────────────────────────────────────────── */

function StickyNote({
  text,
  left,
  top,
  rotation,
  delay = "0s",
  z = 1,
}: {
  text: string;
  left: string;
  top: string;
  rotation: string;
  delay?: string;
  z?: number;
}) {
  return (
    <div
      className="absolute rounded-md bg-amber-100 dark:bg-amber-200 w-[90px] h-[90px] flex items-center justify-center shadow-[inset_0_0_0_1px_rgba(0,0,0,0.06),0_2px_8px_-2px_rgba(0,0,0,0.25)] will-change-transform"
      style={
        {
          left,
          top,
          zIndex: z,
          transform: `rotate(${rotation})`,
          "--note-rotation": rotation,
          /* stickies stay still — only cursors animate */
        } as React.CSSProperties
      }
    >
      <p className="text-xs font-semibold text-center leading-tight text-amber-900/80 px-1.5">
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

/* ─── Floating Deliverable ──────────────────────────────────── */

function FloatingDeliverable({
  icon: Icon,
  label,
  left,
  top,
  rotation,
  delay = "0s",
}: {
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  left: string;
  top: string;
  rotation: string;
  delay?: string;
}) {
  return (
    <div
      className="absolute rounded-xl bg-card/90 backdrop-blur-sm border border-border px-4 py-2.5 shadow-md will-change-transform flex items-center gap-3"
      style={
        {
          left,
          top,
          transform: `rotate(${rotation})`,
          "--note-rotation": rotation,
          animation: `note-float 6s ease-in-out ${delay} infinite`,
        } as React.CSSProperties
      }
    >
      <span className="text-[13px] font-medium text-foreground whitespace-nowrap">
        {label}
      </span>
      <div className="w-9 h-9 rounded-lg bg-olive-600 dark:bg-olive-700 flex items-center justify-center shrink-0">
        <Icon className="h-4 w-4 text-white" />
      </div>
    </div>
  );
}

/* ─── Main Component ────────────────────────────────────────── */

export function HeroVisual() {
  return (
    <div
      className="absolute inset-0 pointer-events-none overflow-hidden"
      aria-hidden="true"
    >
      {/* ── Stickies — lower left (md+) ── */}
      <div className="hidden md:block">
        <StickyNote
          text="Pain Point"
          left="12%"
          top="50%"
          rotation="-2deg"
          delay="0s"
          z={2}
        />
        <StickyNote
          text="Problem"
          left="8%"
          top="58%"
          rotation="1.5deg"
          delay="0.8s"
          z={1}
        />
        <StickyNote
          text="Concept"
          left="16%"
          top="60%"
          rotation="-1deg"
          delay="1.6s"
          z={3}
        />
        <StickyNote
          text="Goal"
          left="16%"
          top="72%"
          rotation="3deg"
          delay="2.4s"
          z={1}
        />
        <StickyNote
          text="Idea"
          left="6%"
          top="68%"
          rotation="-3deg"
          delay="3.2s"
          z={1}
        />
        <StickyNote
          text="Conduct user interviews"
          left="13%"
          top="56.5%"
          rotation="2deg"
          delay="0s"
          z={4}
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
          color="#e87461"
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
      </div>

      {/* ── Floating Deliverables — lower right, closer together (lg+) ── */}
      <div className="hidden lg:block">
        <FloatingDeliverable
          icon={FileText}
          label="Markdown PRDs"
          left="calc(64% + 120px)"
          top="calc(52% + 20px)"
          rotation="1deg"
          delay="0.2s"
        />
        <FloatingDeliverable
          icon={Code2}
          label="Technical Specifications"
          left="calc(70% + 120px)"
          top="calc(58% + 20px)"
          rotation="-1.5deg"
          delay="1s"
        />
        <FloatingDeliverable
          icon={UsersIcon}
          label="User Stories"
          left="calc(62% + 120px)"
          top="calc(64% + 20px)"
          rotation="2deg"
          delay="1.8s"
        />
        <FloatingDeliverable
          icon={Presentation}
          label="Stakeholder Presentation"
          left="calc(68% + 120px)"
          top="calc(70% + 20px)"
          rotation="-1deg"
          delay="2.5s"
        />
        <FloatingDeliverable
          icon={Map}
          label="Journey Map"
          left="calc(60% + 120px)"
          top="calc(76% + 20px)"
          rotation="1.5deg"
          delay="3.2s"
        />
        <FloatingDeliverable
          icon={MousePointerClick}
          label="Validation Prototype"
          left="calc(72% + 120px)"
          top="calc(82% + 20px)"
          rotation="-2deg"
          delay="0.6s"
        />
      </div>
    </div>
  );
}
