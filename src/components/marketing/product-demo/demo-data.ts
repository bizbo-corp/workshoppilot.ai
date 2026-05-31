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
 * NOTE: this is a faux, non-interactive demo — no real canvas / chat / model
 * calls. Sticky colors mirror the real `sticky-note-node.tsx` palette via the
 * same `--sticky-note-*` CSS vars, so they read as genuine product UI.
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

// ── Generic chat (used by the standalone MockChat) ────────────────────────
export type ChatMessage = { role: "ai" | "user"; text: string };

export const CHAT_MESSAGES: ChatMessage[] = [
  { role: "user", text: "Admin time is the real pain for clinics." },
  {
    role: "ai",
    text: "How might we cut clinic admin time so vets can focus on care?",
  },
];

// ── Stakeholder canvas (used by the standalone MockCanvas) ─────────────────
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

// ── Step 2 (scripted): stakeholder mapping — stuck -> suggest -> group ─────
// Positions are % of the CANVAS (the dotted area on the right). The chat panel
// overhangs the canvas's left edge, so notes live from canvas x ~44% rightward.
export type WorkshopNote = { label: string; x: number; y: number; rotate: number };

/** Standalone stakeholder notes already on the board. */
export const WORKSHOP_STICKIES: WorkshopNote[] = [
  { label: "Pet Owners", x: 54, y: 5, rotate: -2 },
  { label: "Suppliers", x: 82, y: 16, rotate: 2 },
  { label: "Insurance companies", x: 56, y: 80, rotate: -1 },
];

/** Internal notes that the VET PRACTICE container ends up wrapping. */
export const GROUP_NOTES_BASE: WorkshopNote[] = [
  { label: "Vet practice", x: 46, y: 34, rotate: -1 },
  { label: "Owner", x: 66, y: 50, rotate: 2 },
];

/** The note added when the user accepts the AI's suggestion chip. */
export const GROUP_NOTE_ADDED: WorkshopNote = {
  label: "Practice Manager",
  x: 44,
  y: 54,
  rotate: -2,
};

/** The dashed container drawn around the three internal notes. */
export const WORKSHOP_GROUP = { label: "Vet Practice", x: 38, y: 28, w: 46, h: 44 };

/** AI-suggested stakeholders, shown as chips with a + to add to the board. */
export const SUGGESTION_CHIPS: string[] = ["Practice Manager", "Reception"];

export const WORKSHOP_CHAT = {
  prompt:
    "Now let's get into your stakeholders. Who touches this product? Who does it affect? Jot down everything, or hit “I'm stuck” for a suggestion.",
  stuckLabel: "I'm stuck",
  suggestion:
    "Perhaps break the vet practice into the internal people who touch it day to day, like the reception or practice manager.",
  placeholder: "Add a stakeholder…",
};

/** Fake-cursor waypoints, % of the CANVAS. */
export const CURSOR_WAYPOINTS = {
  start: { x: 12, y: 42 },
  button: { x: 11, y: 30 },
  chip: { x: 14, y: 60 },
  lasso: { x: 44, y: 30 },
  lassoEnd: { x: 64, y: 54 },
};
