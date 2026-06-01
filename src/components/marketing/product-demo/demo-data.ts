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

/** Step 3 output: a markdown Build Pack file ready to hand to a coding agent. */
export const BUILD_PACK_FILENAME = "vetclinic-prd.md";
export const HANDOFF_AGENTS = ["Cursor", "Claude", "Gemini", "Codex"];

export type MdLine = {
  kind: "h1" | "h2" | "li" | "p" | "blank";
  text?: string;
};

export const BUILD_PACK_MD: MdLine[] = [
  { kind: "h1", text: "# VetClinic — Build Pack" },
  { kind: "blank" },
  { kind: "h2", text: "## Overview" },
  {
    kind: "p",
    text: "A web app for vet clinics — appointment scheduling, records & client comms.",
  },
  { kind: "blank" },
  { kind: "h2", text: "## Tech Stack" },
  { kind: "li", text: "- Next.js (App Router) · React · TypeScript" },
  { kind: "li", text: "- Tailwind CSS · shadcn/ui" },
  { kind: "li", text: "- PostgreSQL · Drizzle ORM · Zod" },
  { kind: "li", text: "- Auth: Clerk · Payments: Stripe" },
  { kind: "blank" },
  { kind: "h2", text: "## Platform" },
  { kind: "li", text: "- Google Cloud — Cloud Run (containerised app)" },
  { kind: "li", text: "- Cloud SQL (PostgreSQL) · Cloud Storage" },
  { kind: "li", text: "- Pub/Sub + Cloud Scheduler (reminders)" },
  { kind: "li", text: "- CDN + Cloud Armor at the edge" },
  { kind: "blank" },
  { kind: "h2", text: "## Database" },
  { kind: "li", text: "- users — vet · reception · owner (RBAC)" },
  { kind: "li", text: "- pets · owners · appointments" },
  { kind: "li", text: "- invoices · payments · audit_log" },
  { kind: "li", text: "- soft-delete + row-level history" },
  { kind: "blank" },
  { kind: "h2", text: "## System Requirements" },
  { kind: "li", text: "- Roles: vet · reception · pet owner" },
  { kind: "li", text: "- Online booking + automated reminders" },
  { kind: "li", text: "- Audit log on every record change" },
  { kind: "li", text: "- 99.9% uptime · nightly encrypted backups" },
];

/** Step 3: stakeholder slide deck ("Concepts"). */
export const BUILD_PACK_DECK_TITLE = "VetPro Workshop";
export type DeckSlide = { n: number; title: string; sub: string };
export const BUILD_PACK_SLIDES: DeckSlide[] = [
  { n: 1, title: "Problem", sub: "Why clinics lose hours" },
  { n: 2, title: "Personas", sub: "Vet, reception, owner" },
  { n: 3, title: "Journey Map", sub: "Book to follow-up" },
  { n: 4, title: "Solution", sub: "One scheduling hub" },
  { n: 5, title: "Concepts", sub: "Shortlisted directions" },
  { n: 6, title: "Roadmap", sub: "Phase 1 to launch" },
];

/** Step 3: feature-prioritisation roadmap (draggable). */
export type RoadmapFeature = {
  n: number;
  title: string;
  priority: string;
  desc: string;
  sub: number;
};
export const BUILD_PACK_FEATURES: RoadmapFeature[] = [
  {
    n: 1,
    title: "Appointment Booking",
    priority: "Must-have",
    desc: "Self-serve scheduling with live clinic availability.",
    sub: 3,
  },
  {
    n: 2,
    title: "Client & Pet Records",
    priority: "Must-have",
    desc: "One shared history for every patient.",
    sub: 4,
  },
  {
    n: 3,
    title: "Automated Reminders",
    priority: "Should-have",
    desc: "SMS + email nudges that cut no-shows.",
    sub: 2,
  },
  {
    n: 4,
    title: "Billing & Invoices",
    priority: "Nice-to-have",
    desc: "Take payment and reconcile at checkout.",
    sub: 3,
  },
];

// ── Step 2 (scripted): stakeholder mapping — stuck -> suggest -> group ─────
// Positions are % of the FRAMED box (the contained "main area"). The dotted
// board + rings render in a separate layer that bleeds beyond this box.
export type WorkshopNote = { label: string; x: number; y: number; rotate: number };

/** Loose notes outside the focus area (above + to the right; they bleed out). */
export const WORKSHOP_STICKIES: WorkshopNote[] = [
  { label: "Pet Owners", x: 90, y: -26, rotate: 0 },
  { label: "Insurers", x: 110, y: 78, rotate: 0 },
];

/** Group members already on the board (rotation 0 — clean squares). */
export const GROUP_NOTES_BASE: WorkshopNote[] = [
  { label: "Practice Manager", x: 45, y: 22, rotate: 0 },
  { label: "Owners", x: 70, y: 17, rotate: 0 },
];

/** The card added when the user accepts the AI's suggestion chip. */
export const GROUP_NOTE_ADDED: WorkshopNote = {
  label: "Reception Staff",
  x: 57,
  y: 55,
  rotate: 0,
};

/** The titled "Vet Practice" container drawn around the three cards. */
export const WORKSHOP_GROUP = { label: "Vet Practice", x: 41, y: 9, w: 57, h: 80 };

/** AI-suggested cards, shown as chips with a + to add to the board. */
export const SUGGESTION_CHIPS: string[] = ["Reception Staff", "Suppliers"];

export const WORKSHOP_CHAT = {
  prompt:
    "Now let's get into your stakeholders. Who touches this product? Who does it affect? Jot down everything, or hit “I'm stuck” for a suggestion.",
  stuckLabel: "I'm stuck",
  suggestion:
    "Perhaps break the vet practice into the internal people who touch it day to day, like the reception or practice manager.",
  placeholder: "Add a stakeholder…",
};

/** Fake-cursor waypoints, % of the framed box. */
export const CURSOR_WAYPOINTS = {
  start: { x: 25, y: 40 },
  button: { x: 24, y: 28 },
  chip: { x: 27, y: 58 },
  lasso: { x: 46, y: 16 },
  lassoEnd: { x: 82, y: 74 },
};
