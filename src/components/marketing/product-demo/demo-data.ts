import {
  Code2,
  FileText,
  FlagTriangleRight,
  Route,
  type LucideIcon,
} from "lucide-react";

/**
 * Scripted content for the marketing PRODUCT demo (the animated lookalike of
 * the real app shown in the homepage "Process" section). All copy lives here
 * so it's easy to tweak without touching the animation code.
 *
 * NOTE: this is a faux, non-interactive demo — no real canvas / chat / AI SDK.
 * Sticky colors mirror the real `sticky-note-node.tsx` palette via the same
 * `--sticky-note-*` CSS vars, so they read as genuine product UI.
 */

export type StickyColor =
  | "yellow"
  | "blue"
  | "pink"
  | "green"
  | "purple"
  | "orange";

export const STICKY_BG: Record<StickyColor, string> = {
  yellow: "bg-[var(--sticky-note-yellow)]",
  blue: "bg-[var(--sticky-note-blue)]",
  pink: "bg-[var(--sticky-note-pink)]",
  green: "bg-[var(--sticky-note-green)]",
  purple: "bg-[var(--sticky-note-purple)]",
  orange: "bg-[var(--sticky-note-orange)]",
};

export const STICKY_TEXT: Record<StickyColor, string> = {
  yellow: "text-[var(--sticky-note-yellow-text)]",
  blue: "text-[var(--sticky-note-blue-text)]",
  pink: "text-[var(--sticky-note-pink-text)]",
  green: "text-[var(--sticky-note-green-text)]",
  purple: "text-[var(--sticky-note-purple-text)]",
  orange: "text-[var(--sticky-note-orange-text)]",
};

// ── Step 1: the idea ──────────────────────────────────────────────────────
export const IDEA_TEXT =
  "A digital platform to streamline appointment scheduling, record-keeping, and client communication for vet clinics.";

export const IDEA_SUGGESTIONS = [
  "A podcast that demystifies personal finance",
  "A subscription box for independent coffee roasters",
  "A redesign of how new hires get onboarded",
];

// ── Step 2: the AI workshop ───────────────────────────────────────────────
export type ChatMessage = { role: "ai" | "user"; text: string };

export const CHAT_MESSAGES: ChatMessage[] = [
  { role: "user", text: "Admin time is the real pain for clinics." },
  {
    role: "ai",
    text: "How might we cut clinic admin time so vets can focus on care?",
  },
];

export type StakeholderSticky = {
  label: string;
  color: StickyColor;
  /** left/top as % of the canvas box */
  x: number;
  y: number;
  rotate: number;
};

export const STAKEHOLDERS: StakeholderSticky[] = [
  { label: "Veterinarians", color: "yellow", x: 5, y: 6, rotate: -3 },
  { label: "Owners", color: "green", x: 41, y: 2, rotate: 2 },
  { label: "Suppliers", color: "blue", x: 70, y: 14, rotate: -2 },
  { label: "Pet Owners", color: "pink", x: 12, y: 50, rotate: 3 },
  { label: "Insurance cos.", color: "orange", x: 54, y: 56, rotate: -1 },
];

// ── Step 3: the build pack ────────────────────────────────────────────────
export type BuildPackItem = {
  title: string;
  format: string;
  icon: LucideIcon;
};

export const BUILD_PACK_ITEMS: BuildPackItem[] = [
  { title: "Product Requirements", format: ".md", icon: FileText },
  { title: "Technical Specs", format: ".md", icon: Code2 },
  { title: "Journey Map", format: ".md", icon: Route },
  { title: "Feature Priorities", format: ".json", icon: FlagTriangleRight },
];
