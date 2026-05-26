"use client";

import * as React from "react";
import { useChat } from "@ai-sdk/react";
import { DefaultChatTransport, type UIMessage } from "ai";
import TextareaAutosize from "react-textarea-autosize";
import ReactMarkdown from "react-markdown";
import {
  Send,
  Loader2,
  Plus,
  CheckCircle2,
  Pencil,
  Sparkles,
  UserPlus,
  ArrowRight,
  Rocket,
  RefreshCw,
  FileText,
  Users,
} from "lucide-react";
import { PersonaInterrupt } from "./persona-interrupt";
import { getStepByOrder } from "@/lib/workshop/step-metadata";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { cn } from "@/lib/utils";
import { useAutoSave } from "@/hooks/use-auto-save";
import { refetchStepMessages } from "@/actions/auto-save-actions";
import {
  useCanvasStore,
  useCanvasStoreApi,
} from "@/providers/canvas-store-provider";
import {
  computeCanvasPosition,
  computeStickyNoteSize,
  computeThemeSortPositions,
  computeClusterChildPositions,
  POST_IT_WIDTH,
  POST_IT_HEIGHT,
} from "@/lib/canvas/canvas-position";
import type {
  StickyNoteColor,
  MindMapNodeState,
  MindMapEdgeState,
} from "@/stores/canvas-store";
import type { PersonaTemplateData } from "@/lib/canvas/persona-template-types";
import type { HmwCardData } from "@/lib/canvas/hmw-card-types";
import {
  createDefaultConceptCard,
  type ConceptCardData,
} from "@/lib/canvas/concept-card-types";
import { computeCardState } from "@/lib/canvas/concept-card-utils";
import { THEME_COLORS, ROOT_COLOR } from "@/lib/canvas/mind-map-theme-colors";
import { computeNewNodePosition } from "@/lib/canvas/mind-map-layout";
import { getStepCanvasConfig } from "@/lib/canvas/step-canvas-config";
import { addCanvasItemsToBoard } from "@/lib/canvas/add-canvas-items";
import { saveCanvasState, savePersonaCandidates, loadCanvasState } from "@/actions/canvas-actions";
import { sendResearchReminders } from "@/actions/research-actions";
import { ChatSkeleton } from "./chat-skeleton";
import { ResearchUploadDialog } from "./research-upload-dialog";
import { FieldworkRoster } from "./fieldwork-roster";
import type { ContributionType } from "@/lib/ai/prompts/research-analysis-prompts";
import { isPersonaCardForCluster } from "@/lib/canvas/canvas-position";
import { parsePersonaSelect, detectPersonaIntro } from "@/lib/chat/parse-utils";
import { getTemplateById } from "@/lib/workshop/journeyTemplates";
import {
  parseMindMapNodes,
  inlineMindMapNodes,
  findThemeNode,
  type MindMapNodeParsed,
} from "@/lib/chat/mind-map-parse-utils";
import { toast } from "sonner";
import { useMultiplayerContext } from "@/components/workshop/multiplayer-room";
import { useBroadcastEvent } from "@liveblocks/react";

/** Steps that support canvas item auto-add */
const CANVAS_ENABLED_STEPS = [
  "challenge",
  "stakeholder-mapping",
  "user-research",
  "sense-making",
  "persona",
  "journey-mapping",
  "reframe",
  "ideation",
  "concept",
];

/** Distinct colors assigned to persona cards in user-research step (one per persona) */
const PERSONA_CARD_COLORS: StickyNoteColor[] = ["yellow", "red", "orange", "blue", "green", "pink", "teal", "purple"];

/** Fixed initial greetings shown instantly while AI generates first response */
const STEP_INITIAL_GREETINGS: Record<string, string> = {
  "journey-mapping":
    "Time to map the journey! 🗺️ We're going to walk in your persona's shoes and trace their current experience — every action, emotion, and friction point. I'm pulling together what we've learned so far to recommend the best journey template...",
};

/** Rotating "thinking" phrases shown in sage while the AI works, before streaming begins. */
const THINKING_PHRASES = [
  "Contemplating…",
  "Considering the options…",
  "Connecting the dots…",
  "Mulling it over…",
  "Pondering…",
  "Mapping it out…",
  "Gathering my thoughts…",
  "Weighing the possibilities…",
  "Sketching this out…",
  "Thinking it through…",
  "Untangling the threads…",
  "Synthesizing…",
  "Percolating…",
  "Lining up the pieces…",
  "Working the angles…",
];

/**
 * Sage "thinking" indicator: rotates through THINKING_PHRASES every ~1.8s while
 * mounted, fading between phrases. Mounted only during the `submitted` window,
 * so it unmounts (and disappears) the moment the real response streams in.
 */
function ThinkingIndicator() {
  // Random start so it doesn't always open on the same phrase.
  const [i, setI] = React.useState(() =>
    Math.floor(Math.random() * THINKING_PHRASES.length),
  );
  React.useEffect(() => {
    const id = setInterval(
      () => setI((n) => (n + 1) % THINKING_PHRASES.length),
      1800,
    );
    return () => clearInterval(id);
  }, []);
  return (
    <div className="flex items-start">
      <div className="flex-1">
        <div
          key={i}
          className="text-base text-olive-500 dark:text-olive-300 animate-in fade-in duration-500"
        >
          {THINKING_PHRASES[i]}
        </div>
      </div>
    </div>
  );
}

/**
 * Parse [SUGGESTIONS]...[/SUGGESTIONS] block from AI content.
 * Returns clean content (block removed) and extracted suggestion strings.
 */
function parseSuggestions(content: string): {
  cleanContent: string;
  suggestions: string[];
} {
  // Complete block: extract suggestions and strip
  const match = content.match(/\[SUGGESTIONS\]([\s\S]*?)\[\/SUGGESTIONS\]/);
  if (match) {
    const cleanContent = content
      .replace(/\[SUGGESTIONS\][\s\S]*?\[\/SUGGESTIONS\]/, "")
      .trim();
    const suggestions = match[1]
      .split("\n")
      .map((line) => line.replace(/^[-*•]\s*/, "").trim())
      .filter((line) => line.length > 0);
    return { cleanContent, suggestions };
  }

  // Incomplete block (mid-stream): strip from [SUGGESTIONS] to end of string
  // Prevents raw suggestion text from flickering in the chat bubble during streaming
  if (content.includes("[SUGGESTIONS]")) {
    const cleanContent = content.replace(/\[SUGGESTIONS\][\s\S]*$/, "").trim();
    return { cleanContent, suggestions: [] };
  }

  return { cleanContent: content, suggestions: [] };
}

/**
 * Parse [INTERVIEW_MODE]...[/INTERVIEW_MODE] block from AI content.
 * Returns clean content (block removed) and extracted mode options.
 */
function parseInterviewMode(content: string): {
  cleanContent: string;
  modeOptions: {
    id: "synthetic" | "real";
    label: string;
    description: string;
  }[];
} {
  // Complete block: extract mode options and strip
  const match = content.match(
    /\[INTERVIEW_MODE\]([\s\S]*?)\[\/INTERVIEW_MODE\]/,
  );
  if (match) {
    const cleanContent = content
      .replace(/\[INTERVIEW_MODE\][\s\S]*?\[\/INTERVIEW_MODE\]/, "")
      .trim();
    const modeOptions = match[1]
      .split("\n")
      .map((line) => line.replace(/^[-*•\d.]\s*/, "").trim())
      .filter((line) => line.length > 0)
      .map((line) => {
        const dashMatch = line.match(/^(.+?)\s*[—–-]\s*(.+)$/);
        const label = dashMatch ? dashMatch[1].trim() : line;
        const description = dashMatch ? dashMatch[2].trim() : "";
        const id: "synthetic" | "real" = /real/i.test(label)
          ? "real"
          : "synthetic";
        return { id, label, description };
      });
    return { cleanContent, modeOptions };
  }

  // Incomplete block (mid-stream): strip from [INTERVIEW_MODE] to end
  if (content.includes("[INTERVIEW_MODE]")) {
    const cleanContent = content
      .replace(/\[INTERVIEW_MODE\][\s\S]*$/, "")
      .trim();
    return { cleanContent, modeOptions: [] };
  }

  return { cleanContent: content, modeOptions: [] };
}

/**
 * Parse [RESEARCH_SOURCE]...[/RESEARCH_SOURCE] block from AI content (Step 3,
 * Real Interviews fork). Returns clean content (block removed) and the two
 * source options: "upload" (user already has research) vs "conduct" (user will
 * run interviews — proceeds to the existing persona-select flow).
 */
function parseResearchSource(content: string): {
  cleanContent: string;
  sourceOptions: {
    id: "upload" | "conduct";
    label: string;
    description: string;
  }[];
} {
  const match = content.match(
    /\[RESEARCH_SOURCE\]([\s\S]*?)\[\/RESEARCH_SOURCE\]/,
  );
  if (match) {
    const cleanContent = content
      .replace(/\[RESEARCH_SOURCE\][\s\S]*?\[\/RESEARCH_SOURCE\]/, "")
      .trim();
    const sourceOptions = match[1]
      .split("\n")
      .map((line) => line.replace(/^[-*•\d.]\s*/, "").trim())
      .filter((line) => line.length > 0)
      .map((line) => {
        const dashMatch = line.match(/^(.+?)\s*[—–-]\s*(.+)$/);
        const label = dashMatch ? dashMatch[1].trim() : line;
        const description = dashMatch ? dashMatch[2].trim() : "";
        const id: "upload" | "conduct" = /already|have my|upload|analyse|analyze/i.test(
          label,
        )
          ? "upload"
          : "conduct";
        return { id, label, description };
      });
    return { cleanContent, sourceOptions };
  }

  // Incomplete block (mid-stream): strip from [RESEARCH_SOURCE] to end
  if (content.includes("[RESEARCH_SOURCE]")) {
    const cleanContent = content
      .replace(/\[RESEARCH_SOURCE\][\s\S]*$/, "")
      .trim();
    return { cleanContent, sourceOptions: [] };
  }

  return { cleanContent: content, sourceOptions: [] };
}

/**
 * Strip hallucinated system/tool tags from AI content.
 * Gemini sometimes leaks internal markers (`tool_code`, `artifact`, etc.)
 * that are not part of our markup format.
 */
// Valid markup tags use UPPERCASE_WITH_UNDERSCORES (optionally prefixed with `/`
// for closers). Anything else inside [...] in prose is a descriptive
// placeholder leaked from a prompt example. df_mr5rudfx0fbz9h18f44558v6.
const KNOWN_MARKUP_TAG_RE = /^\/?[A-Z][A-Z0-9_]*(\s|:|$)/;

function isPlaceholderText(text: string): boolean {
  const t = text.trim();
  if (t.length === 0) return true;
  if (/<<[^<>]+>>/.test(t)) return true;
  if (/^\[[^\[\]]+\]$/.test(t) && !KNOWN_MARKUP_TAG_RE.test(t.slice(1, -1).trim()))
    return true;
  return false;
}

function stripLeakedTags(content: string): { cleanContent: string } {
  const cleanContent = content
    // [artifact ...] or [/artifact] tags
    .replace(/\s*\[artifact[^\]]*\]\s*/gi, " ")
    .replace(/\s*\[\/artifact\]\s*/gi, " ")
    // `tool_code` backtick-wrapped markers (Gemini internal leak)
    .replace(/`tool_code`/gi, "")
    // ```tool_code fenced blocks
    .replace(/```tool_code[\s\S]*?```/gi, "")
    // <<angle-bracket placeholders>> leaked from prompt examples
    .replace(/<<[^<>\n]{1,300}>>/g, "")
    // [Descriptive square-bracket placeholders] that aren't markup tags
    .replace(/\[([^\[\]\n]{1,300})\]/g, (full, inner: string) =>
      KNOWN_MARKUP_TAG_RE.test(inner.trim()) ? full : "",
    )
    .trim();
  return { cleanContent };
}

/**
 * Detect and strip [THEME_SORT] markup from AI content.
 * Returns whether the trigger was found and the content with the trigger removed.
 */
function parseThemeSortTrigger(content: string): {
  cleanContent: string;
  shouldSort: boolean;
} {
  const shouldSort = content.includes("[THEME_SORT]");
  const cleanContent = content.replace(/\s*\[THEME_SORT\]\s*/g, " ").trim();
  return { cleanContent, shouldSort };
}

/**
 * Parsed canvas item with optional position metadata
 */
type CanvasItemParsed = {
  text: string;
  quadrant?: string;
  ring?: string; // Ring ID for concentric ring layout (inner/middle/outer)
  row?: string;
  col?: string;
  category?: string;
  cluster?: string; // Parent label for hierarchical clustering (stakeholder mapping)
  isGridItem?: boolean;
  color?: string; // Explicit color override (e.g. emotion traffic light: red/green/orange)
  templateKey?: string; // Template targeting key (e.g., 'idea', 'problem')
};

/** Known quadrant/category values that can appear in shorthand Quad: syntax */
const EMPATHY_ZONE_IDS = new Set([
  "says",
  "thinks",
  "feels",
  "does",
  "pains",
  "gains",
]);
const SENSE_MAKING_QUADRANTS = new Set([
  "said",
  "thought",
  "felt",
  "experienced",
]);
const PERSONA_CATEGORIES = new Set([
  "goals",
  "motivations",
  "frustrations",
  "behaviors",
]);
const RING_IDS = new Set(["inner", "middle", "outer"]);

/**
 * Parse a shorthand "Quad:" value into a quadrant, category, or ring.
 * Returns { quadrant, category, ring } — one or more may be set.
 *
 * Handles:
 * - Ring IDs: "inner" → ring: "inner"
 * - Stakeholder quadrants: "High Power/High Interest" → quadrant: "high-power-high-interest"
 * - Empathy zone IDs: "says" → quadrant: "says"
 * - Sense-making quadrants (legacy): "felt" → quadrant: "felt"
 * - Pains/gains: returns BOTH quadrant + category (used by empathy zones AND persona step)
 * - Persona categories: "goals" → category: "goals"
 */
function parseQuadLabel(label: string): {
  quadrant?: string;
  category?: string;
  ring?: string;
} {
  const lower = label.toLowerCase().trim();

  // Ring IDs (inner/middle/outer) for concentric ring layout
  if (RING_IDS.has(lower)) return { ring: lower };

  // Empathy zone IDs (says/thinks/feels/does/pains/gains) — canonical zone names
  // Pains/gains return both quadrant AND category so they work for
  // empathy zone placement (via quadrant) and persona placement (via category)
  if (EMPATHY_ZONE_IDS.has(lower)) {
    if (lower === "pains" || lower === "gains") {
      return { quadrant: lower, category: lower };
    }
    return { quadrant: lower };
  }

  // Legacy sense-making quadrants (said/thought/felt/experienced)
  if (SENSE_MAKING_QUADRANTS.has(lower)) return { quadrant: lower };

  // Persona categories (goals/motivations/frustrations/behaviors)
  if (PERSONA_CATEGORIES.has(lower)) return { category: lower };

  // Stakeholder power/interest quadrants — natural language
  const stripped = lower.replace(/[^a-z]/g, "");
  if (stripped.includes("highpower") && stripped.includes("highinterest"))
    return { quadrant: "high-power-high-interest" };
  if (stripped.includes("highpower") && stripped.includes("lowinterest"))
    return { quadrant: "high-power-low-interest" };
  if (stripped.includes("lowpower") && stripped.includes("highinterest"))
    return { quadrant: "low-power-high-interest" };
  if (stripped.includes("lowpower") && stripped.includes("lowinterest"))
    return { quadrant: "low-power-low-interest" };

  // Already in kebab-case stakeholder format
  if (label.startsWith("high-") || label.startsWith("low-"))
    return { quadrant: label };

  return {};
}

/**
 * Parse canvas item markup from AI content.
 *
 * Supports two formats:
 * 1. Tag format:      [CANVAS_ITEM quadrant="..."]Text[/CANVAS_ITEM]
 * 2. Shorthand format: [CANVAS_ITEM: Text] or [CANVAS_ITEM: Text, Quad: ...]
 *
 * Returns clean content (markup removed) and extracted canvas items with metadata.
 */
function parseCanvasItems(content: string): {
  cleanContent: string;
  canvasItems: CanvasItemParsed[];
} {
  const items: CanvasItemParsed[] = [];

  // --- Format 1: Tag pairs  [CANVAS_ITEM ...]...[/CANVAS_ITEM] ---
  const tagRegex =
    /\[(CANVAS_ITEM|GRID_ITEM)(?:\s+([^\]]*))?\](.*?)\[\/(CANVAS_ITEM|GRID_ITEM)\]/g;
  let match;

  while ((match = tagRegex.exec(content)) !== null) {
    const tagType = match[1];
    const attrString = match[2] || "";
    const text = match[3].trim();
    if (text.length === 0) continue;
    if (isPlaceholderText(text)) continue;

    // Parse attributes like quadrant="value" row="value" col="value"
    const attrs: Record<string, string> = {};
    const attrRegex = /(\w+)="([^"]*)"/g;
    let attrMatch;
    while ((attrMatch = attrRegex.exec(attrString)) !== null) {
      attrs[attrMatch[1]] = attrMatch[2];
    }

    items.push({
      text,
      quadrant: attrs.quadrant,
      ring: attrs.ring,
      row: attrs.row,
      col: attrs.col,
      category: attrs.category,
      cluster: attrs.cluster,
      isGridItem: tagType === "GRID_ITEM",
      color: attrs.color,
      templateKey: attrs.key,
    });
  }

  // --- Format 2: Shorthand  [CANVAS_ITEM: Text] or [CANVAS_ITEM: Text, Quad: ...] ---
  // Run on content with tag-format already stripped to avoid double-parsing
  const contentWithoutTags = content.replace(
    /\[(CANVAS_ITEM|GRID_ITEM)(?:\s+[^\]]*?)?\].*?\[\/(CANVAS_ITEM|GRID_ITEM)\]/g,
    "",
  );
  const shorthandRegex = /\[CANVAS_ITEM:\s*([^\]]+)\]/g;

  while ((match = shorthandRegex.exec(contentWithoutTags)) !== null) {
    const inner = match[1].trim();
    if (inner.length === 0) continue;

    // Parse comma-separated attributes: "Text, Ring: value, Quad: value, Cluster: value, Color: value, Key: value"
    // Extract known attributes from the end, remainder is the text
    let remaining = inner;
    let quadrant: string | undefined;
    let ring: string | undefined;
    let category: string | undefined;
    let cluster: string | undefined;
    let color: string | undefined;
    let templateKey: string | undefined;

    // Extract "Key: ..." (check first since attributes are matched from end)
    const keyMatch = remaining.match(/,\s*Key:\s*([^,]+)$/i);
    if (keyMatch) {
      templateKey = keyMatch[1].trim().toLowerCase();
      remaining = remaining.slice(0, keyMatch.index).trim();
    }

    // Extract "Color: ..." (check before Cluster since attributes are matched from end)
    const colorMatch = remaining.match(/,\s*Color:\s*([^,]+)$/i);
    if (colorMatch) {
      color = colorMatch[1].trim().toLowerCase();
      remaining = remaining.slice(0, colorMatch.index).trim();
    }

    // Extract "Cluster: ..." (must check before Ring/Quad since both use comma separation)
    // Use (.+) instead of ([^,]+) to handle persona names with commas (e.g. "Rafael, The Hesitant Speaker")
    const clusterMatch = remaining.match(/,\s*Cluster:\s*(.+)$/i);
    if (clusterMatch) {
      cluster = clusterMatch[1].trim();
      remaining = remaining.slice(0, clusterMatch.index).trim();
    }

    // Extract "Ring: ..." (before Quad extraction)
    const ringMatch = remaining.match(/,\s*Ring:\s*([^,]+)$/i);
    if (ringMatch) {
      ring = ringMatch[1].trim().toLowerCase();
      remaining = remaining.slice(0, ringMatch.index).trim();
    }

    // Extract "Quad: ..."
    const quadMatch = remaining.match(/,\s*Quad:\s*(.+)$/i);
    if (quadMatch) {
      const parsed = parseQuadLabel(quadMatch[1].trim());
      quadrant = parsed.quadrant;
      category = parsed.category;
      // parseQuadLabel may return ring if Quad value is a ring ID
      if (parsed.ring) ring = parsed.ring;
      remaining = remaining.slice(0, quadMatch.index).trim();
    }

    const text = remaining.trim();
    if (text.length > 0 && !isPlaceholderText(text)) {
      items.push({
        text,
        quadrant,
        ring,
        category,
        cluster,
        color,
        templateKey,
      });
    }
  }

  // Remove both markup formats from content for clean markdown rendering.
  // Use '\n\n' as replacement to preserve paragraph breaks when tags sit between paragraphs.
  let cleanContent = content
    // Tag format
    .replace(
      /\s*\[(CANVAS_ITEM|GRID_ITEM)(?:\s+[^\]]*?)?\].*?\[\/(CANVAS_ITEM|GRID_ITEM)\]\s*/g,
      "\n\n",
    )
    // Shorthand format
    .replace(/\s*\[CANVAS_ITEM:\s*[^\]]+\]\s*/g, "\n\n")
    .trim();

  return { cleanContent, canvasItems: items };
}

/**
 * Parse [CANVAS_DELETE: text] markup from AI content.
 * Returns clean content and texts to delete.
 */
function parseCanvasDeletes(content: string): {
  cleanContent: string;
  deleteTexts: string[];
} {
  const deleteTexts: string[] = [];
  const regex = /\[CANVAS_DELETE:\s*([^\]]+)\]/g;
  let match;
  while ((match = regex.exec(content)) !== null) {
    const text = match[1].trim();
    if (text.length > 0) deleteTexts.push(text);
  }
  const cleanContent = content
    .replace(/\s*\[CANVAS_DELETE:\s*[^\]]+\]\s*/g, " ")
    .trim();
  return { cleanContent, deleteTexts };
}

/**
 * Parse [CLUSTER: Parent | child1 | child2 | child3] markup from AI content.
 * Returns clean content and cluster suggestions.
 */
function parseClusterSuggestions(content: string): {
  cleanContent: string;
  clusters: Array<{ parent: string; children: string[] }>;
} {
  const clusters: Array<{ parent: string; children: string[] }> = [];
  const regex = /\[CLUSTER:\s*([^\]]+)\]/g;
  let match;
  while ((match = regex.exec(content)) !== null) {
    const parts = match[1]
      .split("|")
      .map((s) => s.trim())
      .filter((s) => s.length > 0);
    if (parts.length >= 2) {
      clusters.push({ parent: parts[0], children: parts.slice(1) });
    }
  }
  const cleanContent = content
    .replace(/\s*\[CLUSTER:\s*[^\]]+\]\s*/g, " ")
    .trim();
  return { cleanContent, clusters };
}

/**
 * Parse [PERSONA_TEMPLATE]{...JSON...}[/PERSONA_TEMPLATE] blocks from AI content.
 * Returns clean content (markup removed) and extracted persona template data.
 */
function parsePersonaTemplates(content: string): {
  cleanContent: string;
  templates: Partial<PersonaTemplateData>[];
} {
  const templates: Partial<PersonaTemplateData>[] = [];
  const regex = /\[PERSONA_TEMPLATE\]([\s\S]*?)\[\/PERSONA_TEMPLATE\]/g;
  let match;
  while ((match = regex.exec(content)) !== null) {
    try {
      const parsed = JSON.parse(match[1].trim());
      templates.push(parsed);
    } catch {
      // Skip malformed JSON
    }
  }

  let cleanContent = content
    .replace(/\s*\[PERSONA_TEMPLATE\][\s\S]*?\[\/PERSONA_TEMPLATE\]\s*/g, " ")
    .trim();

  // Strip incomplete blocks mid-stream
  if (cleanContent.includes("[PERSONA_TEMPLATE]")) {
    cleanContent = cleanContent
      .replace(/\[PERSONA_TEMPLATE\][\s\S]*$/, "")
      .trim();
  }

  return { cleanContent, templates };
}

/**
 * Parse [PERSONA_PLAN][...JSON array...][/PERSONA_PLAN] block from AI content.
 * Returns clean content (markup removed) and extracted persona plan entries.
 */
function parsePersonaPlan(content: string): {
  cleanContent: string;
  plan: Array<{ personaId?: string; archetype: string; archetypeRole: string }>;
} {
  const match = content.match(/\[PERSONA_PLAN\]([\s\S]*?)\[\/PERSONA_PLAN\]/);
  if (match) {
    const cleanContent = content
      .replace(/\[PERSONA_PLAN\][\s\S]*?\[\/PERSONA_PLAN\]/, "")
      .trim();
    try {
      const plan = JSON.parse(match[1].trim());
      if (Array.isArray(plan)) {
        return { cleanContent, plan };
      }
    } catch {
      // Skip malformed JSON
    }
    return { cleanContent, plan: [] };
  }

  // Incomplete block (mid-stream): strip from [PERSONA_PLAN] to end
  if (content.includes("[PERSONA_PLAN]")) {
    const cleanContent = content.replace(/\[PERSONA_PLAN\][\s\S]*$/, "").trim();
    return { cleanContent, plan: [] };
  }

  return { cleanContent: content, plan: [] };
}

/**
 * Parse [JOURNEY_STAGES]stage1|stage2|stage3[/JOURNEY_STAGES] markup from AI content.
 * Returns clean content and an array of stage labels to replace the grid columns.
 */
function parseJourneyStages(content: string): {
  cleanContent: string;
  stages: string[];
} {
  const stages: string[] = [];
  const regex = /\[JOURNEY_STAGES\]([\s\S]*?)\[\/JOURNEY_STAGES\]/g;
  let match;
  while ((match = regex.exec(content)) !== null) {
    const inner = match[1].trim();
    const parsed = inner
      .split("|")
      .map((s) => s.trim())
      .filter((s) => s.length > 0);
    if (parsed.length >= 3) {
      stages.push(...parsed);
    }
  }
  let cleanContent = content
    .replace(/\s*\[JOURNEY_STAGES\][\s\S]*?\[\/JOURNEY_STAGES\]\s*/g, " ")
    .trim();
  // Strip incomplete blocks mid-stream
  if (cleanContent.includes("[JOURNEY_STAGES]")) {
    cleanContent = cleanContent
      .replace(/\[JOURNEY_STAGES\][\s\S]*$/, "")
      .trim();
  }
  return { cleanContent, stages };
}

/**
 * Parse [JOURNEY_POLL_OPTIONS]templateId1|templateId2|templateId3[/JOURNEY_POLL_OPTIONS]
 * from AI content. The AI picks 3 template IDs from the journeyTemplates catalog;
 * we look up name/description/stages from the catalog ourselves.
 *
 * Returns clean content (markup removed for display) and the resolved option
 * list. Unknown template IDs are silently dropped — defensive against AI typos.
 */
function parseJourneyPollOptions(content: string): {
  cleanContent: string;
  options: import("@/lib/canvas/journey-poll-types").JourneyPollOption[];
} {
  const match = content.match(
    /\[JOURNEY_POLL_OPTIONS\]([\s\S]*?)\[\/JOURNEY_POLL_OPTIONS\]/,
  );
  let cleanContent = content
    .replace(/\s*\[JOURNEY_POLL_OPTIONS\][\s\S]*?\[\/JOURNEY_POLL_OPTIONS\]\s*/g, " ")
    .trim();
  if (cleanContent.includes("[JOURNEY_POLL_OPTIONS]")) {
    cleanContent = cleanContent
      .replace(/\[JOURNEY_POLL_OPTIONS\][\s\S]*$/, "")
      .trim();
  }
  if (!match) return { cleanContent, options: [] };
  const ids = match[1]
    .split("|")
    .map((s) => s.trim())
    .filter((s) => s.length > 0);
  const options: import("@/lib/canvas/journey-poll-types").JourneyPollOption[] =
    [];
  for (const id of ids) {
    const template = getTemplateById(id);
    if (!template) continue;
    options.push({
      templateId: template.id,
      templateName: template.name,
      description: template.description,
      stagePreview: template.stages.slice(0, 3).map((s) => s.name),
    });
  }
  return { cleanContent, options };
}

/**
 * Parse [HMW_CARD]{...JSON...}[/HMW_CARD] blocks from AI content.
 * Returns clean content (markup removed) and extracted HMW card data.
 */
function parseHmwCards(content: string): {
  cleanContent: string;
  cards: Partial<HmwCardData>[];
} {
  const cards: Partial<HmwCardData>[] = [];
  const regex = /\[HMW_CARD\]([\s\S]*?)\[\/HMW_CARD\]/g;
  let match;
  while ((match = regex.exec(content)) !== null) {
    try {
      const parsed = JSON.parse(match[1].trim());
      cards.push(parsed);
    } catch {
      // Skip malformed JSON
    }
  }

  let cleanContent = content
    .replace(/\s*\[HMW_CARD\][\s\S]*?\[\/HMW_CARD\]\s*/g, " ")
    .trim();

  // Strip incomplete blocks mid-stream
  if (cleanContent.includes("[HMW_CARD]")) {
    cleanContent = cleanContent.replace(/\[HMW_CARD\][\s\S]*$/, "").trim();
  }

  return { cleanContent, cards };
}

/**
 * Parse [CONCEPT_CARD]{...JSON...}[/CONCEPT_CARD] blocks from AI content.
 * Returns clean content (markup removed) and extracted concept card data.
 */
function parseConceptCards(content: string): {
  cleanContent: string;
  cards: (Partial<ConceptCardData> & { cardIndex?: number })[];
} {
  const cards: (Partial<ConceptCardData> & { cardIndex?: number })[] = [];
  const regex = /\[CONCEPT_CARD\]([\s\S]*?)\[\/CONCEPT_CARD\]/g;
  let match;
  while ((match = regex.exec(content)) !== null) {
    try {
      const parsed = JSON.parse(match[1].trim());
      cards.push(parsed);
    } catch {
      // Skip malformed JSON
    }
  }

  let cleanContent = content
    .replace(/\s*\[CONCEPT_CARD\][\s\S]*?\[\/CONCEPT_CARD\]\s*/g, " ")
    .replace(/\s*\[CONCEPT_COMPLETE\]\s*/g, " ")
    .trim();

  // Strip incomplete blocks mid-stream
  if (cleanContent.includes("[CONCEPT_CARD]")) {
    cleanContent = cleanContent.replace(/\[CONCEPT_CARD\][\s\S]*$/, "").trim();
  }

  return { cleanContent, cards };
}

interface ChatPanelProps {
  stepOrder: number;
  sessionId: string;
  workshopId: string;
  initialMessages?: UIMessage[];
  onMessageCountChange?: (count: number) => void;
  subStep?:
    | "mind-mapping"
    | "crazy-eights"
    | "idea-selection"
    | "brain-rewriting";
  showStepConfirm?: boolean;
  onStepConfirm?: () => void;
  onStepRevise?: () => void;
  stepConfirmLabel?: string;
  stepConfirmIsTransition?: boolean; // If true, don't send [STEP_CONFIRMED] or show revise button
  stepConfirmDisabled?: boolean; // Disable the confirm button (e.g. during AI processing)
  stepAlreadyConfirmed?: boolean; // Whether the step has already been confirmed (artifact locked)
  onConceptComplete?: () => void; // Fired when AI signals all concepts are done or user asks to move on
  skipAutoStart?: boolean; // Prevents auto-start when ChatPanel remounts (e.g. after toggle)
  onAutoStarted?: () => void; // Callback to notify parent that auto-start was triggered
  onLastAssistantMessage?: (text: string) => void; // Reports last assistant message text for collapsed preview
  hideAvatar?: boolean; // Hide in-body avatar when parent renders it in a card header
  /** Multiplayer-only — called when facilitator picks the step-3 interview mode.
   *  Parent (step-container) wraps a Liveblocks broadcast; left undefined in solo. */
  onInterviewModeBroadcast?: (mode: 'synthetic' | 'real') => void;
  /** Multiplayer-only — called when the facilitator's AI emits the step-6
   *  [JOURNEY_POLL_OPTIONS] marker so participants get the same poll. Parent
   *  (step-container) wraps a Liveblocks broadcast; left undefined in solo. */
  onJourneyPollOpenBroadcast?: (
    options: import("@/lib/canvas/journey-poll-types").JourneyPollOption[],
  ) => void;
}

/**
 * Pre-activity UI for the concept step in multiplayer mode.
 * Rendered inside the Liveblocks RoomProvider so useBroadcastEvent is safe.
 */
function ConceptPreActivity() {
  const broadcast = useBroadcastEvent();
  const setConceptActivityStarted = useCanvasStore((s) => s.setConceptActivityStarted);
  const setPendingFocusCardId = useCanvasStore((s) => s.setPendingFocusCardId);
  const storeApi = useCanvasStoreApi();

  const handleStart = React.useCallback(() => {
    broadcast({ type: 'CONCEPT_ACTIVITY_STARTED' });
    setConceptActivityStarted(true);
    const cards = storeApi.getState().conceptCards;
    const myCard = cards.find((c) => c.ownerId === 'facilitator');
    if (myCard) setPendingFocusCardId(myCard.id);
    toast('Activity started — participants navigated to their cards', { duration: 3000 });
  }, [broadcast, setConceptActivityStarted, setPendingFocusCardId, storeApi]);

  return (
    <div className="flex flex-col items-center justify-center gap-6 py-12 text-center">
      <div className="space-y-3 max-w-sm">
        <h3 className="text-lg font-semibold">Concept Development</h3>
        <p className="text-sm text-muted-foreground">
          Review the concept card assignments on the canvas.
          You can reassign cards using the dropdown on each card.
          When everyone is ready, start the activity.
        </p>
      </div>
      <button
        onClick={handleStart}
        className="inline-flex items-center gap-2 rounded-full bg-primary px-5 py-2.5 text-sm font-medium text-primary-foreground hover:bg-primary/90 transition-colors"
      >
        <Rocket className="h-4 w-4" />
        Start Activity
      </button>
    </div>
  );
}

export function ChatPanel({
  stepOrder,
  sessionId,
  workshopId,
  initialMessages,
  onMessageCountChange,
  subStep,
  showStepConfirm,
  onStepConfirm,
  onStepRevise,
  stepConfirmLabel,
  stepConfirmIsTransition,
  stepConfirmDisabled,
  stepAlreadyConfirmed,
  onConceptComplete,
  skipAutoStart,
  onAutoStarted,
  onLastAssistantMessage,
  hideAvatar,
  onInterviewModeBroadcast,
  onJourneyPollOpenBroadcast,
}: ChatPanelProps) {
  const step = getStepByOrder(stepOrder);

  // Multiplayer read-only mode — participants see conversation history only (no input, no actions).
  // isMultiplayer is false from the default MultiplayerContext in solo mode, so isReadOnly is always
  // false for solo workshops. No behavioral change for solo users.
  const { isFacilitator, isMultiplayer } = useMultiplayerContext();
  const isReadOnly = isMultiplayer && !isFacilitator;

  const storeApi = useCanvasStoreApi();
  const addStickyNote = useCanvasStore((state) => state.addStickyNote);
  const updateStickyNote = useCanvasStore((state) => state.updateStickyNote);
  const deleteStickyNote = useCanvasStore((state) => state.deleteStickyNote);
  const setCluster = useCanvasStore((state) => state.setCluster);
  const confirmAllPreviews = useCanvasStore((state) => state.confirmAllPreviews);
  const rejectAllPreviews = useCanvasStore((state) => state.rejectAllPreviews);
  const fieldworkOpen = useCanvasStore((state) => state.fieldworkOpen);
  const fieldworkSubmissions = useCanvasStore((state) => state.fieldworkSubmissions);
  const setFieldworkOpen = useCanvasStore((state) => state.setFieldworkOpen);
  const batchUpdatePositions = useCanvasStore(
    (state) => state.batchUpdatePositions,
  );
  const stickyNotes = useCanvasStore((state) => state.stickyNotes);
  const gridColumns = useCanvasStore((state) => state.gridColumns);
  const replaceGridColumns = useCanvasStore(
    (state) => state.replaceGridColumns,
  );
  // Persistent interview-mode setter (canvas store). Distinct from the local
  // `setInterviewMode` useState below — that one tracks chip-UI visibility;
  // this one persists the choice + drives the participant hold-card gate.
  const persistInterviewMode = useCanvasStore((state) => state.setInterviewMode);
  const journeyPoll = useCanvasStore((state) => state.journeyPoll);
  const openJourneyPoll = useCanvasStore((state) => state.openJourneyPoll);
  const drawingNodes = useCanvasStore((state) => state.drawingNodes);
  const mindMapNodes = useCanvasStore((state) => state.mindMapNodes);
  const mindMapEdges = useCanvasStore((state) => state.mindMapEdges);
  const addMindMapNode = useCanvasStore((state) => state.addMindMapNode);
  const crazy8sSlots = useCanvasStore((state) => state.crazy8sSlots);
  const conceptCards = useCanvasStore((state) => state.conceptCards);
  const updateConceptCard = useCanvasStore((state) => state.updateConceptCard);
  const addConceptCard = useCanvasStore((state) => state.addConceptCard);
  const personaTemplates = useCanvasStore((state) => state.personaTemplates);
  const addPersonaTemplate = useCanvasStore(
    (state) => state.addPersonaTemplate,
  );
  const updatePersonaTemplate = useCanvasStore(
    (state) => state.updatePersonaTemplate,
  );
  const hmwCards = useCanvasStore((state) => state.hmwCards);
  const addHmwCard = useCanvasStore((state) => state.addHmwCard);
  const updateHmwCard = useCanvasStore((state) => state.updateHmwCard);
  const isDirty = useCanvasStore((state) => state.isDirty);
  const markClean = useCanvasStore((state) => state.markClean);
  const setHighlightedCell = useCanvasStore(
    (state) => state.setHighlightedCell,
  );
  const setPendingFitView = useCanvasStore((state) => state.setPendingFitView);
  const setPendingFocusCardId = useCanvasStore((state) => state.setPendingFocusCardId);
  const pendingHmwChipSelection = useCanvasStore(
    (state) => state.pendingHmwChipSelection,
  );
  const setPendingHmwChipSelection = useCanvasStore(
    (state) => state.setPendingHmwChipSelection,
  );
  const pendingHmwManualComplete = useCanvasStore(
    (state) => state.pendingHmwManualComplete,
  );
  const setPendingHmwManualComplete = useCanvasStore(
    (state) => state.setPendingHmwManualComplete,
  );
  const boardAdvancedAt = useCanvasStore((state) => state.boardAdvancedAt);
  const pendingHmwFieldFocus = useCanvasStore(
    (state) => state.pendingHmwFieldFocus,
  );
  const setPendingHmwFieldFocus = useCanvasStore(
    (state) => state.setPendingHmwFieldFocus,
  );
  const selectedStickyNoteIds = useCanvasStore(
    (state) => state.selectedStickyNoteIds,
  );
  const conceptActivityStarted = useCanvasStore((s) => s.conceptActivityStarted);
  const messagesEndRef = React.useRef<HTMLDivElement>(null);
  const scrollContainerRef = React.useRef<HTMLDivElement>(null);
  const inputRef = React.useRef<HTMLTextAreaElement>(null);
  const hasAutoStarted = React.useRef(false);
  const hasScrolledOnMount = React.useRef(false);
  const countdownRef = React.useRef<NodeJS.Timeout | null>(null);
  const scrollIdleTimer = React.useRef<NodeJS.Timeout | null>(null);
  const [inputValue, setInputValue] = React.useState("");
  const [suggestions, setSuggestions] = React.useState<string[]>([]);
  const [justConfirmed, setJustConfirmed] = React.useState(false);
  const [rateLimitInfo, setRateLimitInfo] = React.useState<{
    retryAfter: number;
  } | null>(null);
  const [streamError, setStreamError] = React.useState(false);
  const [addedMessageIds, setAddedMessageIds] = React.useState<Set<string>>(
    () => new Set(),
  );
  const [addedMindMapLabels, setAddedMindMapLabels] = React.useState<
    Set<string>
  >(() => new Set());
  const [hasThemeSorted, setHasThemeSorted] = React.useState(false);
  const [showSortInstructions, setShowSortInstructions] = React.useState(false);
  const [personaOptions, setPersonaOptions] = React.useState<
    { name: string; description: string }[]
  >([]);
  const [personaSelections, setPersonaSelections] = React.useState<Set<string>>(
    () => new Set(),
  );
  const [personaSelectConfirmed, setPersonaSelectConfirmed] =
    React.useState(false);
  const [suggestionsExpanded, setSuggestionsExpanded] = React.useState(false);
  const [customPersonaInput, setCustomPersonaInput] = React.useState("");
  const [personaSelectMessageId, setPersonaSelectMessageId] = React.useState<
    string | null
  >(null);
  const [interviewMode, setInterviewMode] = React.useState<
    "synthetic" | "real" | null
  >(null);
  const [interviewModeMessageId, setInterviewModeMessageId] = React.useState<
    string | null
  >(null);
  const [readyToCompile, setReadyToCompile] = React.useState(false);
  const [personasDone, setPersonasDone] = React.useState(false);
  // Step 3 bulk research upload: dialog visibility, in-flight analysis, the
  // [RESEARCH_SOURCE] fork message, and the pending preview batch awaiting confirm.
  const [uploadOpen, setUploadOpen] = React.useState(false);
  const [analyzingResearch, setAnalyzingResearch] = React.useState(false);
  const [researchSourceMessageId, setResearchSourceMessageId] = React.useState<
    string | null
  >(null);
  const [researchSourceChosen, setResearchSourceChosen] = React.useState(false);
  const [pendingResearch, setPendingResearch] = React.useState<{
    personaCount: number;
    insightCount: number;
    newPersonaCandidates: { name: string; archetype: string; description: string }[];
  } | null>(null);
  // Step 4 (sense-making): map of Step 3 persona name (lowercased) → that persona's
  // color, so empathy items attributed to a persona inherit their color.
  const [personaColorMap, setPersonaColorMap] = React.useState<
    Record<string, StickyNoteColor>
  >({});
  // Gates the Step 4 auto-start greeting until the deterministic empathy-map seed
  // has populated + flushed the board, so the AI narrates the full board instead
  // of racing to (incompletely) populate it itself.
  const [seedComplete, setSeedComplete] = React.useState(false);
  // Show skeleton on mount before JS hydration completes; hide once component is mounted
  const [isMountLoading, setIsMountLoading] = React.useState(true);
  React.useEffect(() => {
    setIsMountLoading(false);
  }, []);

  if (!step) {
    return (
      <div className="flex h-full items-center justify-center">
        <p className="text-muted-foreground">Step not found</p>
      </div>
    );
  }

  const isCanvasStep = CANVAS_ENABLED_STEPS.includes(step.id);

  // Force-flush canvas state to DB before sending a chat message
  // Reads directly from Zustand store to avoid stale React closure values
  const flushCanvasToDb = React.useCallback(async () => {
    if (!isCanvasStep) return;
    const s = storeApi.getState();
    // In multiplayer, the canvas store deliberately keeps isDirty=false because
    // Liveblocks handles its own sync. But the AI reads from Postgres, not from
    // Liveblocks — so we must always flush in multiplayer regardless of isDirty.
    // In solo mode, isDirty is reliable and we can short-circuit when nothing
    // has changed. df_d3dgmx43.
    if (!isMultiplayer && !s.isDirty) return;
    await saveCanvasState(workshopId, step.id, {
      stickyNotes: s.stickyNotes,
      ...(s.gridColumns.length > 0 ? { gridColumns: s.gridColumns } : {}),
      ...(s.drawingNodes.length > 0 ? { drawingNodes: s.drawingNodes } : {}),
      ...(s.mindMapNodes.length > 0 ? { mindMapNodes: s.mindMapNodes } : {}),
      ...(s.mindMapEdges.length > 0 ? { mindMapEdges: s.mindMapEdges } : {}),
      ...(s.crazy8sSlots.length > 0 ? { crazy8sSlots: s.crazy8sSlots } : {}),
      ...(s.conceptCards.length > 0 ? { conceptCards: s.conceptCards } : {}),
      ...(s.personaTemplates.length > 0
        ? { personaTemplates: s.personaTemplates }
        : {}),
      ...(s.hmwCards.length > 0 ? { hmwCards: s.hmwCards } : {}),
      // Persist the step-3 interview-mode choice so the participant's
      // server-side greeting prompt sees it via assembleStepContext —
      // multiplayer autosave is disabled, so this flush is the only DB write path.
      ...(s.interviewMode ? { interviewMode: s.interviewMode } : {}),
      // Same reasoning for step-6 journey poll — persist for cross-tab reads.
      ...(s.journeyPoll ? { journeyPoll: s.journeyPoll } : {}),
    });
    s.markClean();
  }, [isCanvasStep, workshopId, step.id, storeApi, isMultiplayer]);

  // One-shot flush: persist skeleton cards to DB immediately on mount
  // (before user sends any message). Fires once when isDirty first becomes true
  // after mount — triggered by the skeleton sync in canvas-store-provider.
  const hasInitialFlushed = React.useRef(false);
  const lastConceptCardIndexRef = React.useRef<number | null>(null);
  React.useEffect(() => {
    if (!hasInitialFlushed.current && isDirty && isCanvasStep) {
      hasInitialFlushed.current = true;
      flushCanvasToDb();
    }
  }, [isDirty, isCanvasStep, flushCanvasToDb]);

  const transport = React.useMemo(
    () =>
      new DefaultChatTransport({
        api: "/api/chat",
        body: {
          sessionId,
          stepId: step.id,
          workshopId,
          subStep,
          selectedStickyNoteIds,
          // In multiplayer concept step, scope facilitator to their own cards
          ...(isMultiplayer && (step.id === 'concept' || step.id === 'reframe') ? { conceptOwnerId: 'facilitator' } : {}),
        },
      }),
    [sessionId, step.id, workshopId, subStep, selectedStickyNoteIds, isMultiplayer],
  );

  const { messages, sendMessage, status, setMessages, stop } = useChat({
    transport,
    messages: initialMessages,
    onError: (error) => {
      // Check if this is a rate limit error from our API
      const errorStr = error?.message || "";
      if (
        errorStr.includes("rate_limit_exceeded") ||
        errorStr.includes("429")
      ) {
        let retryAfter = 30;
        try {
          const parsed = JSON.parse(errorStr);
          if (parsed.retryAfter) retryAfter = parsed.retryAfter;
        } catch {
          // Use default
        }

        setRateLimitInfo({ retryAfter });

        // Start countdown
        if (countdownRef.current) clearInterval(countdownRef.current);
        countdownRef.current = setInterval(() => {
          setRateLimitInfo((prev) => {
            if (!prev || prev.retryAfter <= 1) {
              if (countdownRef.current) clearInterval(countdownRef.current);
              return null;
            }
            return { retryAfter: prev.retryAfter - 1 };
          });
        }, 1000);
      } else {
        // Non-rate-limit streaming error
        setStreamError(true);
        toast.error("Something went wrong — please try again.", {
          duration: 4000,
        });
      }
    },
  });

  // Abort any in-flight /api/chat request when scope ACTUALLY changes. We can't use
  // useEffect cleanup directly because React 19 Strict Mode dev fires a spurious
  // mount/unmount cycle which would abort the very first auto-start trigger before
  // it reaches the server — matching the bug where /api/chat never gets hit. Instead
  // track the scope manually and only stop when it changes mid-component-life.
  // Cross-scope leaks are still prevented server-side by the scope-assertion check
  // at /api/chat route.ts:62-85 (404/409 on session/workshop mismatch).
  const prevScopeRef = React.useRef<string | null>(null);
  React.useEffect(() => {
    const scope = `${sessionId}:${step.id}:${workshopId}`;
    if (prevScopeRef.current !== null && prevScopeRef.current !== scope) {
      stop();
    }
    prevScopeRef.current = scope;
  }, [sessionId, step.id, workshopId, stop]);

  const isLoading = status === "streaming" || status === "submitted";

  // Real interviews: is there actually research on the board to compile? True
  // once the user has brought back insights (uploaded or added as stickies) —
  // excludes preview items, templates, and persona cards ("Name — desc"). Gates
  // the "I'm ready to compile" button so it can't be triggered before any
  // research exists (which previously caused the AI to fabricate a compilation).
  const hasRealResearchInsights = React.useMemo(
    () =>
      stickyNotes.some(
        (n) =>
          (!n.type || n.type === "stickyNote") &&
          !n.isPreview &&
          !n.templateKey &&
          !(!n.cluster && n.text.includes(" — ")),
      ),
    [stickyNotes],
  );

  // Stream-empty recovery: the AI SDK v6 sometimes completes the request (status →
  // ready) without delivering the assistant message into client state, even though
  // the server-side onFinish fired and persisted the row. When this happens we pull
  // the just-persisted greeting from the DB and inject it directly into useChat's
  // state. Same effect as a full page reload, no UI flash.
  const prevStatusRef = React.useRef(status);
  React.useEffect(() => {
    const wasWaiting = prevStatusRef.current === "submitted" || prevStatusRef.current === "streaming";
    const nowReady = status === "ready";
    prevStatusRef.current = status;
    if (!wasWaiting || !nowReady) return;
    const hasAssistantContent = messages.some(
      (m) => m.role === "assistant" && m.parts?.some((p) => p.type === "text" && p.text.length > 0)
    );
    if (hasAssistantContent) return;
    console.log(`[greeting-lifecycle] client(facilitator):stream-empty-recovery scope=(${sessionId},${step.id},NULL)`);
    const t = setTimeout(async () => {
      try {
        const fresh = await refetchStepMessages(sessionId, step.id, null);
        const hasContent = fresh.some((m) => m.role === "assistant" && m.parts?.some((p) => p.type === "text" && (p as { text?: string }).text && (p as { text?: string }).text!.length > 0));
        if (hasContent) {
          console.log(`[greeting-lifecycle] client(facilitator):refetch-success count=${fresh.length}`);
          setMessages(fresh);
        } else {
          console.log(`[greeting-lifecycle] client(facilitator):refetch-empty — no DB content yet`);
        }
      } catch (err) {
        console.error(`[greeting-lifecycle] client(facilitator):refetch-failed`, err);
      }
    }, 250);
    return () => clearTimeout(t);
  }, [status, messages, sessionId, step.id, setMessages]);

  // Stuck-state recovery: if status stays in submitted/streaming >45s with no assistant
  // chunks arriving, surface a retry toast. 45s sits between Gemini worst case (~15s) and
  // Vercel maxDuration (60s) so we recover before the function dies.
  const retryStepStart = React.useCallback(() => {
    stop();
    setMessages([]);
    hasAutoStarted.current = false;
    console.log(`[greeting-lifecycle] client(facilitator):manual-retry scope=(${sessionId},${step.id},NULL)`);
  }, [stop, setMessages, sessionId, step.id]);

  React.useEffect(() => {
    const isWaiting = status === "submitted" || status === "streaming";
    const hasAssistantContent = messages.some(
      (m) => m.role === "assistant" && m.parts?.some((p) => p.type === "text" && p.text.length > 0)
    );
    if (!isWaiting || hasAssistantContent) return;
    const timer = setTimeout(() => {
      toast("The AI is taking longer than usual.", {
        id: "ai-stuck-retry",
        description: "Want to retry?",
        action: { label: "Retry", onClick: retryStepStart },
        duration: Infinity,
      });
    }, 45_000);
    return () => clearTimeout(timer);
  }, [status, messages, retryStepStart]);

  // Auto-save messages every 2 seconds (debounced) with 10s maxWait
  useAutoSave(sessionId, step.id, messages);

  // Report live message count to parent
  React.useEffect(() => {
    onMessageCountChange?.(messages.length);
  }, [messages.length, onMessageCountChange]);

  // Report last assistant message text for collapsed preview strip
  React.useEffect(() => {
    if (!onLastAssistantMessage) return;
    for (let i = messages.length - 1; i >= 0; i--) {
      if (messages[i].role === "assistant") {
        const textParts =
          messages[i].parts?.filter((p) => p.type === "text") || [];
        const raw = textParts
          .map((p) => p.text)
          .join(" ")
          .replace(/\s+/g, " ")
          .trim();
        // Strip markdown/tag noise and truncate
        const clean = raw
          .replace(/\[SUGGESTIONS\][\s\S]*?\[\/SUGGESTIONS\]/g, "")
          .replace(/\[CANVAS_ITEMS\][\s\S]*?\[\/CANVAS_ITEMS\]/g, "")
          .replace(/[#*_~`>\[\]]/g, "")
          .trim()
          .slice(0, 120);
        onLastAssistantMessage(clean);
        return;
      }
    }
  }, [messages, onLastAssistantMessage]);

  // Fire arc phase transition after each AI response completes
  React.useEffect(() => {
    // Only trigger after ready state with at least one message
    if (status === "ready" && messages.length > 0) {
      // Fire-and-forget arc phase transition based on message count
      fetch("/api/chat/arc-transition", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          workshopId,
          stepId: step.id,
          messageCount: messages.length,
        }),
      }).catch(() => {
        // Silently ignore errors - arc transition is non-critical
      });
    }
  }, [status, messages.length, workshopId, step.id]);

  // Extract suggestions from last assistant message when AI finishes responding
  React.useEffect(() => {
    if (status === "ready" && messages.length > 0) {
      const lastMsg = messages[messages.length - 1];
      if (lastMsg.role === "assistant") {
        const textParts = lastMsg.parts?.filter((p) => p.type === "text") || [];
        const content = textParts.map((p) => p.text).join("\n");
        const { suggestions: parsed } = parseSuggestions(content);
        setSuggestions(parsed);
        setSuggestionsExpanded(false);
      }
    }
    // Clear suggestions while AI is responding
    if (status === "streaming" || status === "submitted") {
      setSuggestions((prev) => (prev.length > 0 ? [] : prev));
    }
  }, [status, messages]);

  // Extract persona select options from last assistant message (Step 3 only)
  React.useEffect(() => {
    if (step.id !== "user-research") return;

    if (status === "ready" && messages.length > 0) {
      const lastMsg = messages[messages.length - 1];
      if (lastMsg.role === "assistant") {
        const textParts = lastMsg.parts?.filter((p) => p.type === "text") || [];
        const content = textParts.map((p) => p.text).join("\n");
        const { personaOptions: parsed } = parsePersonaSelect(content);
        if (parsed.length > 0) {
          // AI re-presented persona selection in a new message — reset confirmed state
          if (personaSelectMessageId !== lastMsg.id && personaSelectConfirmed) {
            setPersonaSelectConfirmed(false);
            setPersonaSelections(new Set());
          }
          setPersonaOptions(parsed);
          setPersonaSelectMessageId(lastMsg.id);
        }
      }
    }
    // Clear persona options while AI is responding
    if (status === "streaming" || status === "submitted") {
      setPersonaOptions((prev) => (prev.length > 0 ? [] : prev));
    }
  }, [status, messages, step.id, personaSelectConfirmed, personaSelectMessageId]);

  // Step 3 — analyze an uploaded research transcript into preview personas + insights.
  const handleAnalyzeResearch = React.useCallback(
    async (transcript: string, contributionType: ContributionType) => {
      setAnalyzingResearch(true);
      try {
        const existingNotes = storeApi.getState().stickyNotes;
        const existingPersonaCards = existingNotes.filter(
          (n) =>
            (!n.type || n.type === "stickyNote") &&
            !n.cluster &&
            n.text.includes(" — "),
        );
        const existingPersonaNames = existingPersonaCards.map((n) => n.text);

        const res = await fetch("/api/ai/analyze-research", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ workshopId, transcript, existingPersonaNames, contributionType }),
        });
        if (!res.ok) {
          const err = await res.json().catch(() => ({}));
          toast.error(err?.error || "Couldn't analyze that research — try again.");
          return;
        }
        const { data } = (await res.json()) as {
          data: {
            personas: { name: string; role?: string; archetype: string; summary: string }[];
            insights: { personaName: string; text: string }[];
            synthesized?: { text: string }[];
          };
        };
        const personas = data?.personas || [];
        const insights = data?.insights || [];
        const synthesized = data?.synthesized || [];
        if (personas.length === 0 && insights.length === 0 && synthesized.length === 0) {
          toast.error("I couldn't find any insights in that text.");
          return;
        }

        // 1) Persona cards for people not already on the board (preview).
        const existingCount = existingPersonaCards.length;
        const newPersonas = personas.filter(
          (p) =>
            !existingPersonaCards.some((card) =>
              isPersonaCardForCluster(card, p.name),
            ),
        );
        const personaCardText = (p: { name: string; role?: string; summary: string }) =>
          [p.name, p.role, p.summary].filter((s) => s && s.trim()).join(" — ");
        const personaItems = newPersonas.map((p, i) => ({
          text: personaCardText(p),
          color:
            PERSONA_CARD_COLORS[
              (existingCount + i) % PERSONA_CARD_COLORS.length
            ],
        }));
        if (personaItems.length > 0) {
          addCanvasItemsToBoard({
            stepId: step.id,
            items: personaItems,
            storeApi,
            addStickyNote,
            updateStickyNote,
            preview: { previewReason: "From your uploaded research" },
          });
        }

        // 2) Insight stickies (preview), clustered to their persona. Color
        //    auto-inherits from the persona card (user-research branch).
        const insightItems = insights.map((ins) => ({
          text: ins.text,
          cluster: ins.personaName,
        }));
        if (insightItems.length > 0) {
          addCanvasItemsToBoard({
            stepId: step.id,
            items: insightItems,
            storeApi,
            addStickyNote,
            updateStickyNote,
            preview: { previewReason: "From your uploaded research" },
          });
        }

        // 3) Synthesized "general vibes" insights → white cards. The reserved
        //    "Synthesized" cluster keeps them out of the persona list and carries
        //    them downstream (summary + Step 4 seed) without faking an interviewee.
        const synthItems = synthesized.map((s) => ({
          text: s.text,
          cluster: "Synthesized",
          color: "white" as StickyNoteColor,
        }));
        if (synthItems.length > 0) {
          addCanvasItemsToBoard({
            stepId: step.id,
            items: synthItems,
            storeApi,
            addStickyNote,
            updateStickyNote,
            preview: { previewReason: "Synthesized from your research" },
          });
        }

        // Lock step-3 into 'real' mode if it isn't already, and satisfy the
        // persona-select gate so downstream affordances behave normally.
        if (storeApi.getState().interviewMode === null) {
          setInterviewMode("real");
          persistInterviewMode("real");
          onInterviewModeBroadcast?.("real");
        }
        setPersonaSelectConfirmed(true);
        setResearchSourceChosen(true);

        setPendingResearch({
          personaCount: newPersonas.length,
          insightCount: insightItems.length + synthItems.length,
          newPersonaCandidates: newPersonas.map((p) => ({
            name: p.name,
            archetype: p.role || p.archetype,
            description: p.summary,
          })),
        });
        setUploadOpen(false);
      } catch (e) {
        console.error("analyze-research failed:", e);
        toast.error("Something went wrong analyzing your research.");
      } finally {
        setAnalyzingResearch(false);
      }
    },
    [
      workshopId,
      step.id,
      storeApi,
      addStickyNote,
      updateStickyNote,
      persistInterviewMode,
      onInterviewModeBroadcast,
    ],
  );

  // Confirm the preview batch onto the board, persist persona candidates for
  // Step 5, then auto-run the compile synthesis (real mode only).
  const handleConfirmResearch = React.useCallback(async () => {
    confirmAllPreviews();
    const candidates = pendingResearch?.newPersonaCandidates || [];
    setPendingResearch(null);
    if (candidates.length > 0) {
      await savePersonaCandidates(workshopId, step.id, candidates);
    }
    await flushCanvasToDb();
    if (storeApi.getState().interviewMode === "real") {
      setReadyToCompile(true);
      sendMessage({
        role: "user",
        parts: [
          {
            type: "text",
            text: "[COMPILE_READY] I uploaded my research — please compile the insights.",
          },
        ],
      });
    }
  }, [
    confirmAllPreviews,
    pendingResearch,
    workshopId,
    step.id,
    flushCanvasToDb,
    storeApi,
    sendMessage,
  ]);

  const handleDiscardResearch = React.useCallback(async () => {
    rejectAllPreviews();
    setPendingResearch(null);
    await flushCanvasToDb();
  }, [rejectAllPreviews, flushCanvasToDb]);

  // Step 4 — build the Step 3 persona→color map (so empathy items inherit their
  // source persona's color), then deterministically SEED the empathy map: a
  // structured call classifies every Step 3 insight into a zone and the client
  // places them all (persona-colored + badged; synthesized ones white). This is
  // the reliable carry-over — the chat model over-consolidates on its own.
  React.useEffect(() => {
    if (step.id !== "sense-making") return;
    let cancelled = false;
    (async () => {
      const canvas = await loadCanvasState(workshopId, "user-research");
      if (cancelled) return;
      const notes = canvas?.stickyNotes || [];

      // Persona → color map from Step 3 persona cards ("Name — description", no cluster).
      const map: Record<string, StickyNoteColor> = {};
      for (const n of notes) {
        if ((n.type && n.type !== "stickyNote") || n.cluster || !n.text.includes(" — ")) continue;
        const name = n.text.split(/\s*[—–]\s*/)[0].trim().toLowerCase();
        if (name && n.color) map[name] = n.color;
      }
      setPersonaColorMap(map);

      // Seed once: only when this board is empty and Step 3 actually has insights.
      const boardItems = storeApi
        .getState()
        .stickyNotes.filter((n) => (!n.type || n.type === "stickyNote") && !n.isPreview);
      const hasResearch = notes.some((n) => n.cluster);
      if (boardItems.length > 0 || !hasResearch) {
        if (!cancelled) setSeedComplete(true);
        return;
      }

      try {
        const res = await fetch("/api/ai/sense-making-seed", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ workshopId }),
        });
        if (!cancelled && res.ok) {
          const { data } = (await res.json()) as {
            data: {
              items: { persona: string; zone: string; text: string }[];
              synthesized: { zone: string; text: string }[];
            };
          };
          const personaItems = (data.items || []).map((it) => ({
            text: it.text,
            quadrant: it.zone,
            cluster: it.persona,
          }));
          const synthItems = (data.synthesized || []).map((s) => ({
            text: s.text,
            quadrant: s.zone,
          }));
          const allItems = [...personaItems, ...synthItems];
          if (allItems.length > 0) {
            addCanvasItemsToBoard({
              stepId: "sense-making",
              items: allItems,
              storeApi,
              addStickyNote,
              updateStickyNote,
              personaColorMap: map,
            });
            await flushCanvasToDb();
          }
        }
      } catch (e) {
        console.error("sense-making seed failed:", e);
      } finally {
        if (!cancelled) setSeedComplete(true);
      }
    })();
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [step.id, workshopId]);

  // Extract interview mode options from last assistant message (Step 3 only, before mode is chosen)
  React.useEffect(() => {
    if (step.id !== "user-research" || interviewMode !== null) return;

    if (status === "ready" && messages.length > 0) {
      const lastMsg = messages[messages.length - 1];
      if (lastMsg.role === "assistant") {
        const textParts = lastMsg.parts?.filter((p) => p.type === "text") || [];
        const content = textParts.map((p) => p.text).join("\n");
        const { modeOptions } = parseInterviewMode(content);
        if (modeOptions.length > 0) {
          setInterviewModeMessageId(lastMsg.id);
        }
      }
    }
  }, [status, messages, step.id, interviewMode]);

  // Extract the [RESEARCH_SOURCE] fork (Step 3, Real Interviews — before a
  // source is chosen). Records which message carries the fork so we render the
  // two buttons on it.
  React.useEffect(() => {
    if (step.id !== "user-research" || researchSourceChosen) return;
    if (status === "ready" && messages.length > 0) {
      const lastMsg = messages[messages.length - 1];
      if (lastMsg.role === "assistant") {
        const textParts = lastMsg.parts?.filter((p) => p.type === "text") || [];
        const content = textParts.map((p) => p.text).join("\n");
        const { sourceOptions } = parseResearchSource(content);
        if (sourceOptions.length > 0) {
          setResearchSourceMessageId(lastMsg.id);
        }
      }
    }
  }, [status, messages, step.id, researchSourceChosen]);

  // Step 6 — when the facilitator's AI emits [JOURNEY_POLL_OPTIONS], open the
  // template-vote poll in the canvas store. In multiplayer this fires once per
  // message (broadcasted to participants); in solo it's gated off since no poll
  // UI is rendered (right-panel guards on workshopType === 'multiplayer'). Once
  // a lockedTemplate is set the AI's prompt branch stops re-emitting the marker,
  // so this guard primarily protects against accidental re-emit before lock.
  const [journeyPollMessageId, setJourneyPollMessageId] = React.useState<
    string | null
  >(null);
  React.useEffect(() => {
    if (step.id !== "journey-mapping" || !isMultiplayer || !isFacilitator) return;
    if (journeyPoll?.lockedTemplate) return;
    if (status !== "ready" || messages.length === 0) return;
    const lastMsg = messages[messages.length - 1];
    if (lastMsg.role !== "assistant") return;
    if (journeyPollMessageId === lastMsg.id) return;
    const textParts = lastMsg.parts?.filter((p) => p.type === "text") || [];
    const content = textParts.map((p) => p.text).join("\n");
    const { options } = parseJourneyPollOptions(content);
    if (options.length === 0) return;
    openJourneyPoll(options);
    onJourneyPollOpenBroadcast?.(options);
    setJourneyPollMessageId(lastMsg.id);
  }, [
    status,
    messages,
    step.id,
    isMultiplayer,
    isFacilitator,
    journeyPoll?.lockedTemplate,
    journeyPollMessageId,
    openJourneyPoll,
    onJourneyPollOpenBroadcast,
  ]);

  // Step 6 — once the facilitator locks a template, send a hidden synthetic
  // user message so the AI gets a turn to act on the new "JOURNEY TEMPLATE
  // LOCKED" directive in its system prompt. Without this, the facilitator
  // sees the lock banner appear but the chat sits silent (the prior greeting
  // already fired pre-lock and there's nothing else to trigger a response).
  //
  // Edge-transition guard via `prevLockedTemplateIdRef`: this effect ONLY
  // fires when the locked template transitions from null → set during the
  // current chat-panel mount. On first run after mount, we just snapshot
  // the current value and return — this prevents firing when handleReset
  // re-mounts the panel with a still-stale store (the rAF clear hasn't
  // landed yet) and journeyPoll.lockedTemplate appears truthy at mount
  // time even though the workshop step has just been wiped on the server.
  //
  // Message-history check is the secondary guard for refresh-mid-flow: if
  // the chat already contains a __journey_template_locked__ user message
  // followed by an assistant reply, the lock turn ran in a previous session
  // and we should not re-fire even if the prev-value ref hasn't snapshotted.
  const prevLockedTemplateIdRef = React.useRef<string | null | undefined>(
    undefined,
  );
  const hasFiredLockMessage = React.useRef(false);
  React.useEffect(() => {
    if (step.id !== "journey-mapping") return;
    if (!isMultiplayer || !isFacilitator) return;
    const currentLockedId = journeyPoll?.lockedTemplate?.templateId ?? null;
    const previousLockedId = prevLockedTemplateIdRef.current;
    prevLockedTemplateIdRef.current = currentLockedId;
    // First effect run on this mount: snapshot only, never fire. This is the
    // critical guard against stale-store-on-remount after step reset.
    if (previousLockedId === undefined) return;
    // Only act on a true null → set transition. Any other shape (set → set,
    // set → null, null → null) is not a fresh lock.
    if (previousLockedId !== null) return;
    if (!currentLockedId) return;
    if (!journeyPoll?.lockedTemplate) return;
    if (status !== "ready") return;
    if (hasFiredLockMessage.current) return;
    const lockMarker = "__journey_template_locked__";
    // Secondary guard: if a prior session already fired the lock turn and
    // the AI responded, don't re-fire on refresh.
    let foundLockUser = false;
    let foundAssistantAfter = false;
    for (const msg of messages) {
      const content =
        msg.parts?.filter((p) => p.type === "text").map((p) => p.text).join("") ?? "";
      if (msg.role === "user" && content.startsWith(lockMarker)) {
        foundLockUser = true;
        continue;
      }
      if (foundLockUser && msg.role === "assistant") {
        foundAssistantAfter = true;
        break;
      }
    }
    if (foundAssistantAfter) {
      hasFiredLockMessage.current = true;
      return;
    }
    hasFiredLockMessage.current = true;
    const lockedTemplate = journeyPoll.lockedTemplate;
    void (async () => {
      // Persist the locked template to Postgres BEFORE the AI request fires.
      // The chat route reads lockedJourneyTemplate via assembleStepContext
      // (DB-backed), not from the live Zustand store, so an AI request that
      // races ahead of the flush will see lockedJourneyTemplate=null and
      // re-emit the recommendation flow instead of jumping to stages.
      await flushCanvasToDb();
      sendMessage({
        role: "user",
        parts: [
          {
            type: "text",
            text: `${lockMarker}:${lockedTemplate.templateId}`,
          },
        ],
      });
    })();
  }, [
    step.id,
    isMultiplayer,
    isFacilitator,
    journeyPoll?.lockedTemplate,
    journeyPoll,
    status,
    messages,
    flushCanvasToDb,
    sendMessage,
  ]);

  // Detect confirmed persona selection + interview mode from historical messages (persistence across refresh)
  const hasCheckedPersonaHistory = React.useRef(false);
  React.useEffect(() => {
    if (hasCheckedPersonaHistory.current || step.id !== "user-research") return;
    hasCheckedPersonaHistory.current = true;

    for (const msg of messages) {
      if (msg.role !== "user") continue;
      const textParts = msg.parts?.filter((p) => p.type === "text") || [];
      const content = textParts.map((p) => p.text).join("");
      if (content.startsWith("I'd like to interview these personas:")) {
        setPersonaSelectConfirmed(true);
      }
      if (content.includes("I'd like to use AI Interviews")) {
        setInterviewMode("synthetic");
      }
      if (content.includes("I'd like to use Real Interviews")) {
        setInterviewMode("real");
      }
      if (content.includes("[COMPILE_READY]")) {
        setReadyToCompile(true);
      }
    }
  }, [messages, step.id]);

  // Persona step is "done" when either:
  // (a) the user explicitly signals completion in chat, OR
  // (b) every persona template card on the canvas has been filled with a name
  //     (every skeleton card the user planned to build has actually been built).
  // Without (b) the Next button could stay disabled even when the canvas is
  // fully populated — the original cause of df_rpxxs6jwqe1rl0uppiosfroo.
  const personaDoneRegex =
    /personas? look good|looks good|let'?s move on|move on|done with personas?|ready to (?:move on|continue)|happy with (?:the )?personas?/i;
  const hasCheckedPersonaDoneHistory = React.useRef(false);
  React.useEffect(() => {
    if (step.id !== "persona" || personasDone) return;

    // (b) Derive from canvas: every existing template card has a filled name.
    if (
      personaTemplates.length > 0 &&
      personaTemplates.every((t) => !!t.name && t.name.trim().length > 0)
    ) {
      setPersonasDone(true);
      return;
    }

    // (a) Explicit signal in chat — check historical messages on first load.
    if (!hasCheckedPersonaDoneHistory.current) {
      hasCheckedPersonaDoneHistory.current = true;
      for (const msg of messages) {
        if (msg.role !== "user") continue;
        const textParts = msg.parts?.filter((p) => p.type === "text") || [];
        const content = textParts.map((p) => p.text).join("");
        if (personaDoneRegex.test(content)) {
          setPersonasDone(true);
          return;
        }
      }
    }

    // (a) Live messages as they come in.
    if (status === "ready" && messages.length > 0) {
      const lastUserMsg = [...messages]
        .reverse()
        .find((m) => m.role === "user");
      if (lastUserMsg) {
        const textParts =
          lastUserMsg.parts?.filter((p) => p.type === "text") || [];
        const content = textParts.map((p) => p.text).join("");
        if (personaDoneRegex.test(content)) {
          setPersonasDone(true);
        }
      }
    }
  }, [messages, step.id, status, personasDone, personaTemplates]);

  // Initialize addedMessageIds from history — mark historical assistant messages
  // containing canvas-modifying markup as already processed so they don't re-fire
  // and clobber the saved layout.
  //
  // Two passes with different gating:
  //
  // Pass A — `[THEME_SORT]`: ALWAYS mark on mount, regardless of canvas state.
  // THEME_SORT is purely a layout snap (computeThemeSortPositions overrides every
  // sticky's position based on cellAssignment). For a multiplayer participant the
  // canvas is briefly empty while Liveblocks Storage hydrates; if we gated this
  // pass on canvas-has-content, the auto-process effect could fire THEME_SORT on
  // an old assistant message before Storage finished loading, snapping the freshly
  // hydrated stickies into ring slots and destroying manual clusters.
  //
  // Pass B — other content-creating markers (`[CANVAS_ITEM]`, `[CLUSTER]`, persona
  // plans, journey stages, HMW cards, concept cards): gated on canvas-has-content
  // so a truly empty canvas can still re-create its initial seed items from chat
  // history (the existing "restore from chat" path).
  const hasInitializedThemeSortIds = React.useRef(false);
  const hasInitializedAddedIds = React.useRef(false);

  // Pass A: theme-sort init (always runs once per mount)
  React.useEffect(() => {
    if (hasInitializedThemeSortIds.current || !isCanvasStep || messages.length === 0) return;
    hasInitializedThemeSortIds.current = true;

    const themeSortIds = new Set<string>();
    let hadHistoricalSort = false;
    for (const msg of messages) {
      if (msg.role !== "assistant") continue;
      const textParts = msg.parts?.filter((p) => p.type === "text") || [];
      const content = textParts.map((p) => p.text).join("\n");
      const { shouldSort } = parseThemeSortTrigger(content);
      if (shouldSort) {
        themeSortIds.add(msg.id);
        hadHistoricalSort = true;
      }
    }
    if (hadHistoricalSort) setHasThemeSorted(true);
    if (themeSortIds.size > 0) {
      setAddedMessageIds((prev) => {
        const merged = new Set(prev);
        themeSortIds.forEach((id) => merged.add(id));
        return merged;
      });
    }
  }, [messages, isCanvasStep]);

  // Pass B: other content-creating markers (gated on canvas-has-content)
  React.useEffect(() => {
    if (
      hasInitializedAddedIds.current ||
      !isCanvasStep ||
      (stickyNotes.length === 0 &&
        personaTemplates.length === 0 &&
        hmwCards.length === 0 &&
        mindMapNodes.length === 0 &&
        conceptCards.length === 0)
    )
      return;
    hasInitializedAddedIds.current = true;

    const ids = new Set<string>();
    for (const msg of messages) {
      if (msg.role !== "assistant") continue;
      const textParts = msg.parts?.filter((p) => p.type === "text") || [];
      const content = textParts.map((p) => p.text).join("\n");
      const { canvasItems } = parseCanvasItems(content);
      const { clusters } = parseClusterSuggestions(content);
      const { deleteTexts } = parseCanvasDeletes(content);
      const { templates: personaTemplateParsed } =
        parsePersonaTemplates(content);
      const { plan: personaPlanParsed } = parsePersonaPlan(content);
      const { stages: journeyStages } = parseJourneyStages(content);
      const { cards: hmwCardParsed } = parseHmwCards(content);
      const { nodes: mindMapNodesParsed } = parseMindMapNodes(content);
      const { cards: conceptCardParsed } = parseConceptCards(content);
      // Mark any message that contains canvas-modifying markup as already processed
      if (
        canvasItems.length > 0 ||
        clusters.length > 0 ||
        deleteTexts.length > 0 ||
        personaTemplateParsed.length > 0 ||
        personaPlanParsed.length > 0 ||
        journeyStages.length > 0 ||
        hmwCardParsed.length > 0 ||
        conceptCardParsed.length > 0
      ) {
        ids.add(msg.id);
      }
    }
    if (ids.size > 0) {
      setAddedMessageIds((prev) => {
        const merged = new Set(prev);
        ids.forEach((id) => merged.add(id));
        return merged;
      });
    }
    // Pre-populate addedMindMapLabels from existing mind map nodes (level 2+)
    const existingMindMapLabels = new Set<string>();
    for (const n of mindMapNodes) {
      if (!n.isRoot && n.level >= 2)
        existingMindMapLabels.add(n.label.toLowerCase());
    }
    if (existingMindMapLabels.size > 0) {
      setAddedMindMapLabels(existingMindMapLabels);
    }
  }, [
    messages,
    isCanvasStep,
    stickyNotes.length,
    personaTemplates.length,
    hmwCards.length,
    mindMapNodes.length,
    conceptCards.length,
  ]);

  // Handle adding AI-suggested canvas items to the whiteboard
  // Only auto-fit the viewport when the board is currently empty for this step.
  // Otherwise, the user's pan/zoom is preserved across chat interactions
  // (df_qiwa2xew20euor6luc8epw41).
  const hasAutoFitForStepRef = React.useRef<Set<string>>(new Set());
  const handleAddToWhiteboard = React.useCallback(
    (messageId: string, canvasItems: CanvasItemParsed[]) => {
      if (addedMessageIds.has(messageId)) return;

      const latestGridColumns = storeApi.getState().gridColumns;
      const stepConfig = getStepCanvasConfig(step.id);
      const baseGridConfig = stepConfig.gridConfig;
      const dynamicGridConfig =
        baseGridConfig && latestGridColumns.length > 0
          ? { ...baseGridConfig, columns: latestGridColumns }
          : baseGridConfig;

      const boardWasEmpty =
        storeApi.getState().stickyNotes.length === 0 &&
        !hasAutoFitForStepRef.current.has(step.id);

      addCanvasItemsToBoard({
        stepId: step.id,
        items: canvasItems,
        storeApi,
        addStickyNote,
        updateStickyNote,
        gridConfigOverride: dynamicGridConfig,
        ...(step.id === "sense-making" ? { personaColorMap } : {}),
        onHighlightCell: setHighlightedCell,
        onRequestFitView: boardWasEmpty
          ? () => {
              hasAutoFitForStepRef.current.add(step.id);
              setPendingFitView(true);
            }
          : undefined,
      });

      setAddedMessageIds((prev) => new Set(prev).add(messageId));
    },
    [
      addedMessageIds,
      step.id,
      storeApi,
      addStickyNote,
      updateStickyNote,
      personaColorMap,
      setHighlightedCell,
      setPendingFitView,
    ],
  );

  // Add a single mind map node to the canvas (click-to-add from chat chip)
  const handleAddMindMapNode = React.useCallback(
    (parsed: MindMapNodeParsed) => {
      const normalizedLabel = parsed.label.toLowerCase();
      if (addedMindMapLabels.has(normalizedLabel)) return;

      const latestNodes = storeApi.getState().mindMapNodes;
      const latestEdges = storeApi.getState().mindMapEdges;
      const isOwnershipMode = latestNodes.some((n) => n.ownerId);
      const rootNode = isOwnershipMode
        ? latestNodes.find((n) => n.isRoot && n.ownerId === 'facilitator')
        : latestNodes.find((n) => n.isRoot);

      // Build label→node map (filter to facilitator's nodes in ownership mode)
      const scopedNodes = isOwnershipMode
        ? latestNodes.filter((n) => n.ownerId === 'facilitator')
        : latestNodes;
      const nodeLabelMap = new Map<string, MindMapNodeState>();
      for (const n of scopedNodes) {
        nodeLabelMap.set(n.label.toLowerCase(), n);
      }

      // Duplicate guard against canvas
      if (nodeLabelMap.has(normalizedLabel)) {
        setAddedMindMapLabels((prev) => new Set(prev).add(normalizedLabel));
        return;
      }

      // Resolve parent: match by theme (exact → substring → word-overlap)
      const parentNode = parsed.theme
        ? findThemeNode(parsed.theme, scopedNodes, nodeLabelMap) || rootNode
        : undefined;

      if (parentNode && !parentNode.isRoot) {
        // Idea-level node — attach to parent theme branch
        const position = computeNewNodePosition(
          parentNode.id,
          latestNodes,
          latestEdges,
        );

        const newId = crypto.randomUUID();
        const newNode: MindMapNodeState = {
          id: newId,
          label: parsed.label,
          description: parsed.description,
          themeColorId: parentNode.themeColorId,
          themeColor: parentNode.themeColor,
          themeBgColor: parentNode.themeBgColor,
          isRoot: false,
          level: parentNode.level + 1,
          parentId: parentNode.id,
          position,
          ...(isOwnershipMode && { ownerId: 'facilitator' }),
        };
        const newEdge: MindMapEdgeState = {
          id: `${parentNode.id}-${newId}`,
          source: parentNode.id,
          target: newId,
          themeColor: parentNode.themeColor,
          ...(isOwnershipMode && { ownerId: 'facilitator' }),
        };

        addMindMapNode(newNode, newEdge);
      } else {
        // Theme-level node (level 1, child of root)
        const facRoot = isOwnershipMode
          ? latestNodes.find((n) => n.isRoot && n.ownerId === 'facilitator')
          : undefined;
        const rootId = facRoot?.id || "root";

        // In ownership mode, use the facilitator's root color so all nodes in
        // their map share the same participant color. In solo mode, cycle colors.
        let themeColor: (typeof THEME_COLORS)[number];
        if (isOwnershipMode && facRoot?.themeColorId) {
          themeColor = THEME_COLORS.find((c) => c.id === facRoot.themeColorId) || THEME_COLORS[0];
        } else {
          const level1Count = isOwnershipMode
            ? latestNodes.filter((n) => n.level === 1 && n.ownerId === 'facilitator').length
            : latestNodes.filter((n) => n.level === 1).length;
          themeColor = THEME_COLORS[level1Count % THEME_COLORS.length];
        }

        const position = computeNewNodePosition(
          rootId,
          latestNodes,
          latestEdges,
        );

        const newId = crypto.randomUUID();
        const newNode: MindMapNodeState = {
          id: newId,
          label: parsed.label,
          description: parsed.description,
          themeColorId: themeColor.id,
          themeColor: themeColor.color,
          themeBgColor: themeColor.bgColor,
          isRoot: false,
          level: 1,
          parentId: rootId,
          position,
          ...(isOwnershipMode && { ownerId: 'facilitator' }),
        };
        const newEdge: MindMapEdgeState = {
          id: `${rootId}-${newId}`,
          source: rootId,
          target: newId,
          themeColor: themeColor.color,
          ...(isOwnershipMode && { ownerId: 'facilitator' }),
        };

        addMindMapNode(newNode, newEdge);
      }

      setAddedMindMapLabels((prev) => new Set(prev).add(normalizedLabel));
      setPendingFitView(true);
    },
    [addedMindMapLabels, storeApi, addMindMapNode, setPendingFitView],
  );

  // Manual theme sort triggered by proactive card button
  const handleThemeSort = React.useCallback(() => {
    const latestStickyNotes = storeApi.getState().stickyNotes;
    const updates = computeThemeSortPositions(latestStickyNotes, step.id);
    if (updates.length > 0) {
      batchUpdatePositions(updates);
      setPendingFitView(true);
    }
    setHasThemeSorted(true);
    setShowSortInstructions(true);
  }, [storeApi, step.id, batchUpdatePositions, setPendingFitView]);

  // Auto-add canvas items when AI finishes streaming
  React.useEffect(() => {
    if (status !== "ready" || !isCanvasStep || messages.length === 0) return;
    // Wait for historical message initialization to complete before processing.
    // Without this guard, on the same render cycle where stickyNotes load from DB,
    // this effect could fire before addedMessageIds is populated, causing
    // historical messages to be re-processed and overwriting saved positions.
    //
    // Two gates:
    //   - hasInitializedThemeSortIds: always required — Pass A marks historical
    //     [THEME_SORT] on every mount regardless of canvas state. Closes the
    //     multiplayer-participant race where Liveblocks Storage hasn't hydrated
    //     yet but the last assistant message contains [THEME_SORT].
    //   - hasInitializedAddedIds: required once canvas already has content
    //     (existing guard for [CANVAS_ITEM]/[CLUSTER]/persona/journey/hmw/concept).
    if (!hasInitializedThemeSortIds.current) return;
    if (
      (stickyNotes.length > 0 ||
        personaTemplates.length > 0 ||
        hmwCards.length > 0 ||
        mindMapNodes.length > 0 ||
        conceptCards.length > 0) &&
      !hasInitializedAddedIds.current
    )
      return;
    const lastMsg = messages[messages.length - 1];
    if (lastMsg.role !== "assistant") return;
    if (addedMessageIds.has(lastMsg.id)) return;

    const textParts = lastMsg.parts?.filter((p) => p.type === "text") || [];
    const content = textParts.map((p) => p.text).join("\n");
    const { canvasItems } = parseCanvasItems(content);
    const { shouldSort } = parseThemeSortTrigger(content);
    const { deleteTexts } = parseCanvasDeletes(content);
    const { clusters } = parseClusterSuggestions(content);
    const { templates: personaTemplateParsed } = parsePersonaTemplates(content);
    const { plan: personaPlanParsed } = parsePersonaPlan(content);
    const { stages: journeyStages } = parseJourneyStages(content);
    const { cards: hmwCardParsed } = parseHmwCards(content);
    const { cards: conceptCardParsed } = parseConceptCards(content);

    // Process persona plan — only create skeleton cards if NONE exist yet (pre-seeding handles the rest)
    if (personaPlanParsed.length > 0 && step.id === "persona") {
      const latestTemplates = storeApi.getState().personaTemplates;
      // Skip entirely if skeleton cards were pre-seeded from Step 3 data
      if (latestTemplates.length === 0) {
        const PERSONA_CARD_WIDTH = 680;
        const PERSONA_GAP = 40;
        let createdCount = 0;
        for (const entry of personaPlanParsed) {
          const alreadyExists = latestTemplates.some(
            (t) => t.archetype === entry.archetype,
          );
          if (alreadyExists) continue;
          const cardIndex = latestTemplates.length + createdCount;
          const offsetX = cardIndex * (PERSONA_CARD_WIDTH + PERSONA_GAP);
          addPersonaTemplate({
            position: { x: offsetX, y: 0 },
            personaId: entry.personaId,
            archetype: entry.archetype,
            archetypeRole: entry.archetypeRole,
          });
          createdCount++;
        }
        if (createdCount > 0) {
          setPendingFitView(true);
        }
      }
    }

    // Process journey stage replacements — update grid columns to match template.
    // Dedupe id collisions defensively before handing to the store: the AI
    // sometimes emits placeholder stage names ("Stage 1|Stage 2|...") which
    // are visually distinct but kebab to identical IDs, or repeats the same
    // stage name twice. replaceGridColumns dedupes too, but guarding here
    // means the column count we end up with matches the unique-stage count
    // the AI actually offered.
    if (journeyStages.length >= 3 && step.id === "journey-mapping") {
      const seenIds = new Set<string>();
      const newColumns: { id: string; label: string; width: number }[] = [];
      for (const label of journeyStages) {
        const id = label
          .toLowerCase()
          .replace(/[^a-z0-9]+/g, "-")
          .replace(/(^-|-$)/g, "");
        if (!id) continue;
        if (seenIds.has(id)) continue;
        seenIds.add(id);
        newColumns.push({ id, label, width: 240 });
      }
      if (newColumns.length >= 3) {
        replaceGridColumns(newColumns);
      }
    }

    // Template-targeted items: update existing template sticky notes by key
    const templateItems = canvasItems.filter((item) => item.templateKey);
    if (templateItems.length > 0) {
      const currentStickyNotes = storeApi.getState().stickyNotes;
      console.log(
        "[template-target] Found",
        templateItems.length,
        "template items. Store has",
        currentStickyNotes.filter((p) => p.templateKey).length,
        "template sticky notes",
      );
      for (const item of templateItems) {
        const target = currentStickyNotes.find(
          (p) => p.templateKey === item.templateKey,
        );
        if (target) {
          console.log(
            "[template-target] Updating",
            item.templateKey,
            "→",
            item.text.slice(0, 40),
          );
          updateStickyNote(target.id, { text: item.text });
        } else {
          console.log(
            "[template-target] Template not found for key:",
            item.templateKey,
            "— creating regular sticky note",
          );
          // Template not found (user deleted it) — fall through to normal add
          addCanvasItemsToBoard({ stepId: step.id, items: [item], storeApi, addStickyNote, updateStickyNote });
        }
      }
    }

    // Auto-add all non-template canvas items to the board
    const nonTemplateCanvasItems = canvasItems.filter(
      (item) => !item.templateKey,
    );
    const gridItems = nonTemplateCanvasItems.filter((item) => item.isGridItem);

    // Safety net for journey-mapping: auto-derive columns from grid item metadata
    if (
      gridItems.length > 0 &&
      step.id === "journey-mapping" &&
      gridItems.some((item) => item.col)
    ) {
      const latestGridColumns = storeApi.getState().gridColumns;
      const itemColIds: string[] = [];
      for (const item of gridItems) {
        if (item.col && !itemColIds.includes(item.col))
          itemColIds.push(item.col);
      }
      const allMatch = itemColIds.every((colId) =>
        latestGridColumns.some((c) => c.id === colId),
      );
      if (!allMatch && itemColIds.length >= 3) {
        const derivedColumns = itemColIds.map((colId) => ({
          id: colId,
          label: colId
            .split("-")
            .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
            .join(" "),
          width: 240,
        }));
        replaceGridColumns(derivedColumns);
      }
    }

    // Auto-add regular (non-grid) items for all steps
    const regularItems = nonTemplateCanvasItems.filter(
      (item) => !item.isGridItem,
    );
    if (regularItems.length > 0) {
      handleAddToWhiteboard(lastMsg.id, regularItems);
    }

    // Grid items auto-add (journey mapping, etc.) — skip persona/concept as before
    if (
      gridItems.length > 0 &&
      step.id !== "persona" &&
      step.id !== "concept"
    ) {
      handleAddToWhiteboard(lastMsg.id, gridItems);
    }

    // Process persona template blocks — match by name or fill blank template
    if (personaTemplateParsed.length > 0) {
      const latestTemplates = storeApi.getState().personaTemplates;
      // Merge all parsed blocks into a single update (AI may split across blocks)
      const merged = personaTemplateParsed.reduce<Partial<PersonaTemplateData>>(
        (acc, t) => ({ ...acc, ...t }),
        {},
      );

      // Find matching template: archetype (strongest — stable from Step 3 pre-seed),
      // then personaId, then name, then first unfilled skeleton as fallback.
      const matchByArchetype = merged.archetype
        ? latestTemplates.find(
            (t) => t.archetype?.toLowerCase() === merged.archetype?.toLowerCase(),
          )
        : undefined;
      const matchByPersonaId =
        !matchByArchetype && merged.personaId
          ? latestTemplates.find((t) => t.personaId === merged.personaId)
          : undefined;
      const matchByName =
        !matchByArchetype && !matchByPersonaId && merged.name
          ? latestTemplates.find((t) => t.name === merged.name)
          : undefined;
      const unfilledSkeleton =
        !matchByArchetype && !matchByPersonaId && !matchByName
          ? latestTemplates.find((t) => !t.name && !t.narrative)
          : undefined;
      const target =
        matchByArchetype || matchByPersonaId || matchByName || unfilledSkeleton;

      if (target) {
        updatePersonaTemplate(target.id, merged);
      } else {
        // New persona — place to the right of existing templates
        const PERSONA_CARD_WIDTH = 680;
        const PERSONA_GAP = 40;
        const offsetX =
          latestTemplates.length * (PERSONA_CARD_WIDTH + PERSONA_GAP);
        addPersonaTemplate({
          position: { x: offsetX, y: 0 },
          ...merged,
        });
      }
      setPendingFitView(true);
    }

    // Process HMW card blocks — update existing cards or transition from skeleton
    if (hmwCardParsed.length > 0) {
      const latestHmwCards = storeApi.getState().hmwCards;
      // Field value keys the AI must NOT overwrite during progressive (active) mode.
      // The user owns field values via chip selections; AI only sends suggestions.
      const HMW_FIELD_VALUE_KEYS = [
        "givenThat",
        "persona",
        "immediateGoal",
        "deeperGoal",
      ];
      let createdNewHmwCard = false;

      // Detect ownership mode: if any card has ownerId set, use ownerId-based matching
      const isOwnershipMode = latestHmwCards.some((c) => c.ownerId);

      // If the facilitator interacted with a specific card (chip click / field focus),
      // prefer targeting that card so updates don't get lost on ownership mismatch.
      const activeCardId = storeApi.getState().activeHmwCardId;

      for (const parsed of hmwCardParsed) {
        const targetIndex = parsed.cardIndex ?? 0;
        // Prefer the active card (facilitator interacted with it), then fall back to ownership/index matching
        const existing = activeCardId
          ? latestHmwCards.find((c) => c.id === activeCardId)
          : isOwnershipMode
            ? latestHmwCards.filter((c) => c.ownerId === 'facilitator')[targetIndex]
            : latestHmwCards.find((c) => (c.cardIndex ?? 0) === targetIndex);

        if (existing) {
          const updates: Partial<HmwCardData> = { ...parsed };

          // During progressive mode (card is 'active'), strip field value overrides.
          // AI can send suggestions and fullStatement, but cannot set field values —
          // only chip selections set those. Once card reaches 'filled', allow full edits.
          if (existing.cardState === "active") {
            for (const key of HMW_FIELD_VALUE_KEYS) {
              delete (updates as Record<string, unknown>)[key];
            }
          }

          if (existing.cardState === "skeleton") {
            updates.cardState = "active";
            createdNewHmwCard = true; // skeleton → active is effectively a new card appearing
          }
          // Auto-detect 'filled' state (existing fields + any new updates)
          const merged = { ...existing, ...updates };
          if (
            merged.givenThat &&
            merged.persona &&
            merged.immediateGoal &&
            merged.deeperGoal
          ) {
            updates.cardState = "filled";
          }
          updateHmwCard(existing.id, updates);
        } else {
          // Create a new card (for alternative HMW statements)
          addHmwCard({
            position: { x: (targetIndex || 0) * 780, y: 0 },
            cardState: "active",
            cardIndex: targetIndex,
            ...(isOwnershipMode ? { ownerId: 'facilitator' } : {}),
            ...parsed,
          });
          createdNewHmwCard = true;
        }
      }
      // Clear active card tracking after processing
      storeApi.getState().setActiveHmwCardId(null);
      // Only re-fit viewport when a new card appears, not on suggestion/field updates
      if (createdNewHmwCard) {
        setPendingFitView(true);
      }
    }

    // Process AI-requested deletions
    if (deleteTexts.length > 0) {
      const latestStickyNotes = storeApi.getState().stickyNotes;
      for (const delText of deleteTexts) {
        const lower = delText.toLowerCase();
        const match = latestStickyNotes.find(
          (p) =>
            p.text.toLowerCase() === lower &&
            (!p.type || p.type === "stickyNote"),
        );
        if (match) deleteStickyNote(match.id);
      }
    }

    // Process AI-suggested clusters
    if (clusters.length > 0) {
      const latestStickyNotes = storeApi.getState().stickyNotes;
      const clusterUpdates: Array<{
        id: string;
        position: { x: number; y: number };
        cellAssignment?: { row: string; col: string };
      }> = [];

      for (const cluster of clusters) {
        const parentLower = cluster.parent.toLowerCase();
        const parentStickyNote = latestStickyNotes.find(
          (p) =>
            p.text.toLowerCase() === parentLower &&
            (!p.type || p.type === "stickyNote"),
        );
        const childIds: string[] = [];
        const childStickyNotes: typeof latestStickyNotes = [];
        for (const childText of cluster.children) {
          const childLower = childText.toLowerCase();
          const match = latestStickyNotes.find(
            (p) =>
              p.text.toLowerCase() === childLower &&
              (!p.type || p.type === "stickyNote"),
          );
          if (match) {
            childIds.push(match.id);
            childStickyNotes.push(match);
          }
        }
        if (childIds.length > 0) {
          setCluster(childIds, cluster.parent);

          // Rearrange children in 3-wide rows centered below parent
          if (parentStickyNote) {
            const childPositions = computeClusterChildPositions(
              parentStickyNote.position,
              parentStickyNote.width,
              parentStickyNote.height,
              childStickyNotes.length,
              childStickyNotes[0]?.width || POST_IT_WIDTH,
              childStickyNotes[0]?.height || POST_IT_HEIGHT,
            );
            for (let j = 0; j < childStickyNotes.length; j++) {
              clusterUpdates.push({
                id: childStickyNotes[j].id,
                position: childPositions[j],
                ...(parentStickyNote.cellAssignment
                  ? { cellAssignment: parentStickyNote.cellAssignment }
                  : {}),
              });
            }
          }
        }
      }

      if (clusterUpdates.length > 0) {
        // Slight delay so setCluster state updates first
        setTimeout(() => {
          batchUpdatePositions(clusterUpdates);
          setPendingFitView(true);
        }, 100);
      }
    }

    // Process concept card blocks — merge into existing skeleton cards or create new ones
    if (conceptCardParsed.length > 0 && step.id === "concept") {
      let latestConceptCards = storeApi.getState().conceptCards;

      for (const parsed of conceptCardParsed) {
        const targetIndex = parsed.cardIndex ?? 0;
        // In multiplayer: match by relative index within facilitator's own cards
        // (same indexing the canvas context uses when presenting cards to the AI)
        let existing: ConceptCardData | undefined;
        if (isMultiplayer && step.id === 'concept') {
          const ownerCards = latestConceptCards.filter((c) => c.ownerId === 'facilitator');
          existing = ownerCards[targetIndex];
        } else {
          existing = latestConceptCards.find((c) => (c.cardIndex ?? 0) === targetIndex);
        }

        if (existing) {
          // Guard: skip updates to filled cards unless AI explicitly includes cardIndex
          // (deliberate re-targeting via "tweak it" → AI sends specific cardIndex)
          if (existing.cardState === 'filled' && parsed.cardIndex === undefined) {
            continue;
          }

          const updates: Partial<ConceptCardData> = { ...parsed };

          // Transition skeleton → active on first AI update
          if (existing.cardState === "skeleton") {
            updates.cardState = "active";
          }

          // Auto-detect card state from merged fields
          const merged = { ...existing, ...updates } as ConceptCardData;
          updates.cardState = computeCardState(merged);

          updateConceptCard(existing.id, updates);
        } else {
          // No matching skeleton — create a new card from the AI data
          addConceptCard({
            ...createDefaultConceptCard({
              ...parsed,
              cardState: "active",
              cardIndex: targetIndex,
              position: { x: targetIndex * 720, y: 0 },
            }),
          });
          // Refresh reference so subsequent iterations in this loop can find newly added cards
          latestConceptCards = storeApi.getState().conceptCards;
        }
      }

      // Only center viewport when a NEW card index starts being edited
      const lastIndex = conceptCardParsed[conceptCardParsed.length - 1]?.cardIndex ?? 0;
      if (lastIndex !== lastConceptCardIndexRef.current) {
        lastConceptCardIndexRef.current = lastIndex;
        // Find the card ID for the new index and focus on it
        let focusCard: ConceptCardData | undefined;
        if (isMultiplayer && step.id === 'concept') {
          const ownerCards = storeApi.getState().conceptCards.filter((c) => c.ownerId === 'facilitator');
          focusCard = ownerCards[lastIndex];
        } else {
          focusCard = storeApi.getState().conceptCards.find((c) => (c.cardIndex ?? 0) === lastIndex);
        }
        if (focusCard) {
          setPendingFocusCardId(focusCard.id);
        }
      }
      // Otherwise: same card being updated — preserve viewport
    }

    // Detect [CONCEPT_COMPLETE] — AI signals all concepts are done or user asked to move on
    if (step.id === "concept" && content.includes("[CONCEPT_COMPLETE]")) {
      onConceptComplete?.();
    }

    // Mark as processed if we did any work (avoid re-processing non-sticky note items)
    const hasNonStickyNoteWork =
      deleteTexts.length > 0 ||
      clusters.length > 0 ||
      personaTemplateParsed.length > 0 ||
      personaPlanParsed.length > 0 ||
      journeyStages.length > 0 ||
      hmwCardParsed.length > 0 ||
      conceptCardParsed.length > 0 ||
      gridItems.length > 0 ||
      templateItems.length > 0;
    const hasRegularCanvasItems = nonTemplateCanvasItems.some(
      (item) => !item.isGridItem,
    );
    if (
      hasNonStickyNoteWork ||
      (hasRegularCanvasItems && !addedMessageIds.has(lastMsg.id))
    ) {
      setAddedMessageIds((prev) => new Set(prev).add(lastMsg.id));
      // Flush to DB so the next API request sees the items just added
      flushCanvasToDb();
    }

    // If AI triggered [THEME_SORT], reorganize after items are added
    if (shouldSort) {
      setHasThemeSorted(true);
      setShowSortInstructions(true);
      setTimeout(() => {
        const latestStickyNotes = storeApi.getState().stickyNotes;
        const updates = computeThemeSortPositions(latestStickyNotes, step.id);
        if (updates.length > 0) {
          batchUpdatePositions(updates);
          setPendingFitView(true);
        }
      }, 300); // Short delay to ensure new items are in store
    }
  }, [
    status,
    messages,
    isCanvasStep,
    addedMessageIds,
    handleAddToWhiteboard,
    batchUpdatePositions,
    storeApi,
    step.id,
    setPendingFitView,
    setPendingFocusCardId,
    deleteStickyNote,
    updateStickyNote,
    setCluster,
    addPersonaTemplate,
    updatePersonaTemplate,
    replaceGridColumns,
    addHmwCard,
    updateHmwCard,
    updateConceptCard,
    addConceptCard,
    conceptCards.length,
    flushCanvasToDb,
    onConceptComplete,
  ]);

  // Clear stream error on successful completion
  React.useEffect(() => {
    if (status === "ready") {
      setStreamError(false);
      // Don't clear rateLimitInfo here — let the countdown finish
    }
  }, [status]);

  // Stream timeout detection — resets on actual content progress, not just message count.
  // Tracks the last message's text length so the timer resets as tokens stream in.
  const streamingContentLength = React.useMemo(() => {
    if (status !== "streaming" || messages.length === 0) return 0;
    const lastMsg = messages[messages.length - 1];
    if (lastMsg.role !== "assistant") return 0;
    const textParts = lastMsg.parts?.filter((p) => p.type === "text") || [];
    return textParts.reduce((sum, p) => sum + p.text.length, 0);
  }, [status, messages]);

  React.useEffect(() => {
    if (status !== "streaming") return;
    const timeout = setTimeout(() => {
      setStreamError(true);
    }, 90000); // 90s silence timeout (server maxDuration is 60s; ideation prompts need extra headroom)
    return () => clearTimeout(timeout);
  }, [status, streamingContentLength]);

  // HMW chip selection → send message to AI
  // Wait until AI is idle before sending — prevents TypeError from calling sendMessage mid-stream.
  // If isLoading, the effect returns early without consuming. When status becomes 'ready',
  // isLoading flips false, the effect re-runs, and the pending selection is sent.
  React.useEffect(() => {
    if (!pendingHmwChipSelection || isLoading) return;
    const { field, value } = pendingHmwChipSelection;
    // Consume now that we can actually send
    setPendingHmwChipSelection(null);

    const fieldLabels: Record<string, string> = {
      givenThat: "Given that",
      persona: "how might we (help)",
      immediateGoal: "do/be/feel/achieve",
      deeperGoal: "So they can",
    };
    const fieldLabel = fieldLabels[field] || field;


    (async () => {
      try {
        await flushCanvasToDb();
        sendMessage({
          role: "user",
          parts: [{ type: "text", text: `For "${fieldLabel}": ${value}` }],
        });
      } catch (err) {
        console.error("Failed to send HMW chip selection:", err);
      }
    })();
  }, [
    pendingHmwChipSelection,
    isLoading,
    setPendingHmwChipSelection,
    flushCanvasToDb,
    sendMessage,
  ]);

  // HMW manual edit completed all 4 fields → ask AI to surface a confirm/move-on prompt
  React.useEffect(() => {
    if (!pendingHmwManualComplete || isLoading) return;
    setPendingHmwManualComplete(null);
    (async () => {
      try {
        await flushCanvasToDb();
        sendMessage({
          role: "user",
          parts: [
            {
              type: "text",
              text: "[HMW_MANUAL_COMPLETE] I've finished filling in the HMW card by hand.",
            },
          ],
        });
      } catch (err) {
        console.error("Failed to send HMW manual-complete trigger:", err);
      }
    })();
  }, [
    pendingHmwManualComplete,
    isLoading,
    setPendingHmwManualComplete,
    flushCanvasToDb,
    sendMessage,
  ]);

  // Step 1: when the user advances the board directly (confirms a setup card or
  // generates the challenge), silently clear the now-stale in-chat suggestion
  // buttons — they tend to offer steps the user has already done on the board.
  // No new message is posted; Wanda's next reply is already board-aware via the
  // CANVAS STATE injected each turn.
  React.useEffect(() => {
    if (!boardAdvancedAt) return;
    setSuggestions((prev) => (prev.length > 0 ? [] : prev));
    setSuggestionsExpanded(false);
  }, [boardAdvancedAt]);

  // HMW field focus → trigger AI suggestions for empty field
  React.useEffect(() => {
    if (!pendingHmwFieldFocus || isLoading) return;
    const { field } = pendingHmwFieldFocus;
    setPendingHmwFieldFocus(null);

    const fieldLabels: Record<string, string> = {
      givenThat: "Given that",
      persona: "how might we (help)",
      immediateGoal: "do/be/feel/achieve",
      deeperGoal: "So they can",
    };
    const fieldLabel = fieldLabels[field] || field;

    (async () => {
      try {
        await flushCanvasToDb();
        sendMessage({
          role: "user",
          parts: [{ type: "text", text: `I need suggestions for the "${fieldLabel}" field` }],
        });
      } catch (err) {
        console.error("Failed to send HMW field focus request:", err);
      }
    })();
  }, [
    pendingHmwFieldFocus,
    isLoading,
    setPendingHmwFieldFocus,
    flushCanvasToDb,
    sendMessage,
  ]);

  // Cleanup countdown on unmount
  React.useEffect(() => {
    return () => {
      if (countdownRef.current) clearInterval(countdownRef.current);
    };
  }, []);

  // Scrollbar show/hide: toggle 'is-scrolling' class on scroll container
  React.useEffect(() => {
    const container = scrollContainerRef.current;
    if (!container) return;
    const onScroll = () => {
      container.classList.add("is-scrolling");
      if (scrollIdleTimer.current) clearTimeout(scrollIdleTimer.current);
      scrollIdleTimer.current = setTimeout(() => {
        container.classList.remove("is-scrolling");
      }, 1500);
    };
    container.addEventListener("scroll", onScroll, { passive: true });
    return () => {
      container.removeEventListener("scroll", onScroll);
      if (scrollIdleTimer.current) clearTimeout(scrollIdleTimer.current);
    };
  }, []);

  // Re-focus input after AI response completes — skip for read-only participants (no input to focus)
  React.useEffect(() => {
    if (status === "ready" && !isReadOnly) {
      // Don't steal focus from interactive elements (buttons, canvas, other inputs)
      const active = document.activeElement;
      const isInteractive =
        active &&
        (active.tagName === "BUTTON" ||
          active.tagName === "INPUT" ||
          active.tagName === "CANVAS" ||
          active.tagName === "SELECT" ||
          (active.tagName === "TEXTAREA" && active !== inputRef.current));
      if (!isInteractive) {
        inputRef.current?.focus();
      }
    }
  }, [status, isReadOnly]);

  // Auto-start: send trigger message when entering a step with no prior messages
  const shouldAutoStart = !initialMessages || initialMessages.length === 0;

  // Fixed greeting shown instantly while AI generates first response
  const stepGreeting = STEP_INITIAL_GREETINGS[step.id];
  const hasAssistantMessage = messages.some((m) => m.role === "assistant");
  const showGreeting =
    shouldAutoStart && !!stepGreeting && !hasAssistantMessage;

  React.useEffect(() => {
    // Read-only participants must NOT trigger auto-start — only the facilitator does.
    // skipAutoStart prevents re-triggering when ChatPanel remounts (e.g. after chat toggle).
    // For concept step in multiplayer, block auto-start until activity is started.
    // Solo mode and all other steps are unaffected.
    //
    // Layered guards against duplicate greetings:
    //   - hasAssistantMessage: never re-trigger if any assistant reply is in state
    //   - alreadyHasStepStartTrigger: covers remounts that reset hasAutoStarted ref
    //   - server-side singleton in /api/chat replays the stored greeting if the
    //     trigger leaks through anyway, so no second AI generation is possible
    const alreadyHasStepStartTrigger = messages.some(
      (m) =>
        m.role === "user" &&
        m.parts?.some(
          (p) => p.type === "text" && p.text === "__step_start__",
        ),
    );

    if (
      shouldAutoStart &&
      messages.length === 0 &&
      !hasAssistantMessage &&
      !alreadyHasStepStartTrigger &&
      status === "ready" &&
      !hasAutoStarted.current &&
      !isReadOnly &&
      !skipAutoStart &&
      (step.id !== "concept" || !isMultiplayer || conceptActivityStarted) &&
      // Step 4: wait for the deterministic empathy-map seed to populate + flush
      // before greeting, so the AI narrates the full board (and doesn't re-add).
      (step.id !== "sense-making" || seedComplete)
    ) {
      hasAutoStarted.current = true;
      onAutoStarted?.();
      sendMessage({
        id: `step-start:${sessionId}:${step.id}:fac`,
        role: "user",
        parts: [{ type: "text", text: "__step_start__" }],
      });
    }
  }, [
    shouldAutoStart,
    messages,
    messages.length,
    hasAssistantMessage,
    status,
    sendMessage,
    isReadOnly,
    skipAutoStart,
    onAutoStarted,
    conceptActivityStarted,
    isMultiplayer,
    sessionId,
    step.id,
    seedComplete,
  ]);

  // Helper: check if user is near bottom of scroll container
  const isNearBottom = React.useCallback(() => {
    const container = scrollContainerRef.current;
    if (!container) return true;
    const threshold = 150; // px from bottom
    return (
      container.scrollHeight - container.scrollTop - container.clientHeight <
      threshold
    );
  }, []);

  // Auto-scroll during streaming when user is near bottom
  React.useEffect(() => {
    if (
      status === "streaming" &&
      streamingContentLength > 0 &&
      isNearBottom()
    ) {
      messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
    }
  }, [status, streamingContentLength, isNearBottom]);

  // Scroll to bottom on initial mount (after DOM paint)
  React.useEffect(() => {
    if (!hasScrolledOnMount.current && messages.length > 0) {
      // Use requestAnimationFrame to ensure DOM is painted before scrolling
      requestAnimationFrame(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: "instant" });
      });
      hasScrolledOnMount.current = true;
    }
  }, [messages.length]);

  // Auto-scroll on new messages (skip if user has scrolled up)
  React.useEffect(() => {
    if (messages.length > 0 && isNearBottom()) {
      messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
    }
  }, [messages, isNearBottom]);

  // Handle message send
  const handleSend = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!inputValue.trim() || isLoading) return;

    // Show instant acknowledgment while AI thinks

    // Flush canvas to DB so the AI sees the latest board state
    await flushCanvasToDb();

    try {
      await sendMessage({
        role: "user",
        parts: [{ type: "text", text: inputValue }],
      });
    } catch (err) {
      // sendMessage can throw if useChat internal state is temporarily undefined
      // (e.g. during transport recreation when subStep changes). Log and continue —
      // the message was already shown in the UI via optimistic update.
      console.error(
        "sendMessage error (transport may be reinitializing):",
        err,
      );
      setStreamError(true);
    }
    setInputValue("");
    setSuggestions([]);
    setSuggestionsExpanded(false);
  };

  // Handle Enter to send (Shift+Enter for newline)
  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      const form = e.currentTarget.closest("form");
      if (form) form.requestSubmit();
    }
  };

  // Handle adding user message to canvas as a sticky note
  const handleAddUserMessageToCanvas = React.useCallback(
    (text: string) => {
      const { position } = computeCanvasPosition(step.id, {}, stickyNotes);
      const { width, height } = computeStickyNoteSize(text);
      addStickyNote({
        text,
        position,
        width,
        height,
        color: "yellow",
      });
    },
    [addStickyNote, stickyNotes, step.id],
  );

  return (
    <div className="flex h-full flex-col">
      {/* Messages area */}
      <div className="relative flex-1 min-h-0">
        {isMountLoading ? (
          <ChatSkeleton />
        ) : (
          <>
            <div
              className="pointer-events-none absolute inset-x-0 top-0 z-10 h-12"
              style={{
                background:
                  "linear-gradient(to bottom, var(--background), transparent)",
              }}
            />
            <div
              ref={scrollContainerRef}
              className="chat-scroll h-full overflow-y-auto p-4"
            >
              {/* Centered AI avatar at top - scrolls off screen (hidden when parent renders header avatar) */}
              {!hideAvatar && (
                <div className="flex justify-center mb-6">
                  <div className="flex size-10 shrink-0 items-center justify-center rounded-full bg-primary text-primary-foreground text-sm font-medium">
                    AI
                  </div>
                </div>
              )}

              {isMultiplayer && step.id === 'concept' && !conceptActivityStarted ? (
                <ConceptPreActivity />
              ) : (() => {
                // Auto-start adds a `__step_start__` user message to `messages` immediately,
                // before Gemini begins streaming the greeting. Counting raw `messages.length`
                // here flips us out of the loading branch the instant the trigger is added —
                // so the user sees a blank panel for the full ~5-50s Gemini latency. Compute
                // visible (non-trigger) messages once and route off THAT.
                const visibleMessages = messages.filter((m) => {
                  if (m.role !== "user") return true;
                  const text =
                    m.parts
                      ?.filter((p) => p.type === "text")
                      .map((p) => p.text)
                      .join("") || "";
                  return (
                    text !== "__step_start__" &&
                    !text.startsWith("__journey_template_locked__")
                  );
                });
                if (visibleMessages.length === 0) {
                  return (
                    <div className="space-y-6">
                      {showGreeting && (
                        <div className="flex items-start">
                          <div className="flex-1">
                            <div className="text-base prose prose-base dark:prose-invert max-w-none">
                              <ReactMarkdown>{stepGreeting!}</ReactMarkdown>
                            </div>
                          </div>
                        </div>
                      )}
                      <div className="flex items-start">
                        <div className="flex-1">
                          <div className="text-base text-muted-foreground">
                            AI is thinking...
                          </div>
                        </div>
                      </div>
                    </div>
                  );
                }
                return (
                  // Render conversation messages (filter out __step_start__ trigger)
                  <div className="space-y-6">
                    {/* Fixed initial greeting while AI generates first response */}
                    {showGreeting && (
                      <div className="flex items-start">
                        <div className="flex-1">
                          <div className="text-base prose prose-base dark:prose-invert max-w-none">
                            <ReactMarkdown>{stepGreeting!}</ReactMarkdown>
                          </div>
                        </div>
                      </div>
                    )}
                    {visibleMessages.map((message, index) => {
                      const isStreamingThisMessage =
                        status === "streaming" &&
                        index === visibleMessages.length - 1 &&
                        message.role === "assistant";
                      const textParts =
                        message.parts?.filter((part) => part.type === "text") ||
                        [];
                      const content = textParts
                        .map((part) => part.text)
                        .join("\n");

                      if (message.role === "user") {
                        // Strip internal markup tags from display
                        const displayContent = content
                          .replace(/\[STEP_CONFIRMED\]\s*/g, "")
                          .replace(/\[SUGGEST_QUESTIONS\]\s*/g, "")
                          .replace(/\[CATCH_UP_EDITS\]\s*/g, "")
                          .replace(/\[HMW_MANUAL_COMPLETE\]\s*/g, "")
                          .trim();
                        return (
                          <div
                            key={`${message.id}-${index}`}
                            className="group flex items-start justify-end"
                          >
                            <div className="max-w-[80%]">
                              <div className="relative rounded-2xl bg-neutral-olive-200/60 dark:bg-olive-800/50 p-3 px-4 text-base text-foreground">
                                {displayContent}
                                {isCanvasStep && (
                                  <button
                                    onClick={() =>
                                      handleAddUserMessageToCanvas(content)
                                    }
                                    className="absolute -left-8 top-1/2 -translate-y-1/2 opacity-0 group-hover:opacity-100 transition-opacity rounded-full p-1 bg-muted text-muted-foreground hover:bg-accent hover:text-accent-foreground"
                                    aria-label="Add to canvas"
                                  >
                                    <Plus className="h-3.5 w-3.5" />
                                  </button>
                                )}
                              </div>
                            </div>
                          </div>
                        );
                      }

                      // Assistant message — strip all markup
                      const { cleanContent: noSuggestions } =
                        parseSuggestions(content);
                      const { cleanContent: noInterviewMode } =
                        parseInterviewMode(noSuggestions);
                      const { cleanContent: noResearchSource } =
                        parseResearchSource(noInterviewMode);
                      const { cleanContent: noPersonaSelect } =
                        parsePersonaSelect(noResearchSource);
                      const { cleanContent: noThemeSort } =
                        parseThemeSortTrigger(noPersonaSelect);
                      const { cleanContent: noDeletes } =
                        parseCanvasDeletes(noThemeSort);
                      const { cleanContent: noClusters } =
                        parseClusterSuggestions(noDeletes);
                      const { cleanContent: noPersonaTemplates } =
                        parsePersonaTemplates(noClusters);
                      const { cleanContent: noPersonaPlan } =
                        parsePersonaPlan(noPersonaTemplates);
                      const { cleanContent: noJourneyStages } =
                        parseJourneyStages(noPersonaPlan);
                      const { cleanContent: noJourneyPoll } =
                        parseJourneyPollOptions(noJourneyStages);
                      const { cleanContent: noHmwCards } =
                        parseHmwCards(noJourneyPoll);
                      // For ideation, replace mind map tags with inline placeholders (not strip)
                      let noMindMapContent: string;
                      let mindMapNodesParsed: MindMapNodeParsed[];
                      if (step.id === "ideation") {
                        const inlined = inlineMindMapNodes(noHmwCards);
                        noMindMapContent = inlined.content;
                        mindMapNodesParsed = inlined.nodes;
                      } else {
                        const parsed = parseMindMapNodes(noHmwCards);
                        noMindMapContent = parsed.cleanContent;
                        mindMapNodesParsed = parsed.nodes;
                      }
                      const { cleanContent: noConceptCards } =
                        parseConceptCards(noMindMapContent);
                      const { cleanContent: noLeakedTags } =
                        stripLeakedTags(noConceptCards);
                      const { cleanContent: finalContent, canvasItems } =
                        parseCanvasItems(noLeakedTags);
                      const isPersonaSelectMessage =
                        message.id === personaSelectMessageId;
                      const isInterviewModeMessage =
                        message.id === interviewModeMessageId;
                      const isResearchSourceMessage =
                        message.id === researchSourceMessageId;
                      const personaIntro = detectPersonaIntro(content);
                      // Separate "X down, Y to go" counter from persona answer body
                      const questionCountMatch = finalContent.match(
                        /(?:That's\s+)?\d+\s+down,\s+\d+\s+to\s+go\s+with\s+me\.?/i,
                      );
                      const contentAfterCount = questionCountMatch
                        ? finalContent.replace(questionCountMatch[0], "").trim()
                        : finalContent;
                      const questionCountLine = questionCountMatch
                        ? questionCountMatch[0].trim()
                        : null;

                      // Split transition messages: content before 🎭 intro vs after.
                      // This ensures the PersonaInterrupt banner appears between the
                      // outgoing persona's final answer and the incoming persona's
                      // introduction.
                      //
                      // While the message is still streaming, suppress the split so the
                      // banner / new persona only appear once the previous persona's
                      // answer has finished rendering — fixes the visual glitch where
                      // the new persona seemed to swap in before the previous reply
                      // was complete (df_uuhl0vgqeaiubzvhwncqqy6u).
                      let beforeIntro = contentAfterCount;
                      let afterIntro: string | null = null;
                      if (personaIntro && !isStreamingThisMessage) {
                        const emojiIdx = contentAfterCount.indexOf("🎭");
                        if (emojiIdx > 0) {
                          beforeIntro = contentAfterCount
                            .slice(0, emojiIdx)
                            .trim();
                          afterIntro = contentAfterCount.slice(emojiIdx).trim();
                        }
                      }

                      // Helper: render content with inline mind map buttons for ideation
                      const renderMindMapContent = (text: string) => {
                        if (
                          step.id !== "ideation" ||
                          mindMapNodesParsed.length === 0 ||
                          !text.includes("%%MMNODE_")
                        ) {
                          return <ReactMarkdown>{text}</ReactMarkdown>;
                        }
                        // Build label map once for color lookup
                        const nodeLabelMap = new Map<
                          string,
                          MindMapNodeState
                        >();
                        for (const n of mindMapNodes) {
                          nodeLabelMap.set(n.label.toLowerCase(), n);
                        }
                        // Split content at %%MMNODE_N%% placeholders
                        const parts = text.split(/(%%MMNODE_\d+%%)/);
                        return (
                          <>
                            {parts.map((part, pi) => {
                              const mmMatch = part.match(/%%MMNODE_(\d+)%%/);
                              if (mmMatch) {
                                const nodeIdx = parseInt(mmMatch[1], 10);
                                const node = mindMapNodesParsed[nodeIdx];
                                if (!node) return null;
                                const isAdded =
                                  addedMindMapLabels.has(
                                    node.label.toLowerCase(),
                                  ) ||
                                  mindMapNodes.some(
                                    (mn) =>
                                      mn.label.toLowerCase() ===
                                      node.label.toLowerCase(),
                                  );
                                if (isAdded) {
                                  return (
                                    <span
                                      key={pi}
                                      className="inline-flex items-center gap-1 rounded-md border border-muted bg-muted/50 px-2 py-0.5 text-xs text-muted-foreground my-1"
                                    >
                                      <CheckCircle2 className="h-3 w-3" />
                                      {node.label}
                                    </span>
                                  );
                                }
                                const parentNode = node.theme
                                  ? findThemeNode(
                                      node.theme,
                                      mindMapNodes,
                                      nodeLabelMap,
                                    )
                                  : undefined;
                                if (process.env.NODE_ENV === "development") {
                                  console.log(
                                    "[MindMapButton]",
                                    node.label,
                                    "| theme:",
                                    JSON.stringify(node.theme),
                                    "| matched:",
                                    parentNode?.label ?? "NONE",
                                  );
                                }
                                return (
                                  <button
                                    key={pi}
                                    onClick={() => handleAddMindMapNode(node)}
                                    title={`Theme: "${node.theme || "(none)"}" → Branch: "${parentNode?.label || "UNMATCHED"}"`}
                                    className="cursor-pointer inline-flex items-center gap-1.5 rounded-md border px-2.5 py-1 text-sm font-medium shadow-sm transition-all hover:shadow-md hover:-translate-y-0.5 active:translate-y-0 my-1"
                                    style={
                                      parentNode
                                        ? {
                                            borderColor: parentNode.themeColor,
                                            backgroundColor:
                                              parentNode.themeBgColor,
                                            color: parentNode.themeColor,
                                          }
                                        : {
                                            borderColor: "var(--mm-root)",
                                            backgroundColor:
                                              "var(--mm-root-bg)",
                                          }
                                    }
                                  >
                                    <Plus className="h-3 w-3" />
                                    {node.label}
                                  </button>
                                );
                              }
                              // Regular text segment — render as markdown
                              const trimmed = part.trim();
                              if (!trimmed) return null;
                              return (
                                <ReactMarkdown key={pi}>
                                  {trimmed}
                                </ReactMarkdown>
                              );
                            })}
                          </>
                        );
                      };

                      return (
                        <div key={`${message.id}-${index}`}>
                          {/* Pure intro message (not a transition) — show banner at top */}
                          {personaIntro && !afterIntro && (
                            <PersonaInterrupt
                              personaName={personaIntro.personaName}
                            />
                          )}
                          <div className="flex items-start">
                            <div className="flex-1">
                              <div className="text-base prose prose-base dark:prose-invert max-w-none">
                                {renderMindMapContent(beforeIntro)}
                              </div>
                              {questionCountLine && (
                                <p className="mt-4 text-sm text-muted-foreground italic">
                                  {questionCountLine}
                                </p>
                              )}
                              {/* Transition message — banner + new persona intro after the previous answer */}
                              {personaIntro && afterIntro && (
                                <>
                                  <PersonaInterrupt
                                    personaName={personaIntro.personaName}
                                  />
                                  <div className="text-base prose prose-base dark:prose-invert max-w-none">
                                    {renderMindMapContent(afterIntro)}
                                  </div>
                                </>
                              )}
                              {/* Interview mode selection (Step 3 — before persona select) */}
                              {isInterviewModeMessage &&
                                !interviewMode &&
                                (() => {
                                  const { modeOptions } =
                                    parseInterviewMode(content);
                                  if (modeOptions.length === 0) return null;
                                  return (
                                    <div className="mt-3 grid grid-cols-2 gap-3 animate-in fade-in slide-in-from-bottom-2 duration-500">
                                      {modeOptions.map((option) => (
                                        <button
                                          key={option.id}
                                          disabled={isLoading}
                                          onClick={async () => {
                                            setInterviewMode(option.id);
                                            // Persist to canvas store so the participant
                                            // hold-card gate flips; the multiplayer broadcast
                                            // below pushes the same flip to other clients.
                                            persistInterviewMode(option.id);
                                            onInterviewModeBroadcast?.(option.id);
                                            await flushCanvasToDb();
                                            sendMessage({
                                              role: "user",
                                              parts: [
                                                {
                                                  type: "text",
                                                  text: `I'd like to use ${option.label}`,
                                                },
                                              ],
                                            });
                                          }}
                                          className="cursor-pointer rounded-xl border border-olive-300 bg-card p-4 text-left shadow-sm transition-all hover:border-olive-500 hover:shadow-md hover:-translate-y-0.5 active:translate-y-0 dark:border-neutral-olive-700 dark:bg-neutral-olive-900 dark:hover:border-olive-500"
                                        >
                                          <span className="text-sm font-semibold text-foreground">
                                            {option.label}
                                          </span>
                                          {option.description && (
                                            <p className="mt-1 text-xs text-muted-foreground">
                                              {option.description}
                                            </p>
                                          )}
                                        </button>
                                      ))}
                                    </div>
                                  );
                                })()}
                              {/* Research-source fork (Step 3 — Real Interviews, before persona select) */}
                              {isResearchSourceMessage &&
                                !researchSourceChosen &&
                                !pendingResearch &&
                                (() => {
                                  const { sourceOptions } =
                                    parseResearchSource(content);
                                  if (sourceOptions.length === 0) return null;
                                  return (
                                    <div className="mt-3 grid grid-cols-2 gap-3 animate-in fade-in slide-in-from-bottom-2 duration-500">
                                      {sourceOptions.map((option) => (
                                        <button
                                          key={option.id}
                                          disabled={isLoading}
                                          onClick={async () => {
                                            if (option.id === "upload") {
                                              setUploadOpen(true);
                                              return;
                                            }
                                            // "I need to conduct my interviews" → the AI
                                            // returns a stakeholder-type interview guide (no
                                            // persona-select, no named personas). Do NOT mark
                                            // persona-select confirmed here — the compile
                                            // affordance is gated on real research actually
                                            // being on the board (see hasRealResearchInsights),
                                            // so it can't be triggered before the user has
                                            // gathered anything.
                                            setResearchSourceChosen(true);
                                            sendMessage({
                                              role: "user",
                                              parts: [
                                                {
                                                  type: "text",
                                                  text: option.label,
                                                },
                                              ],
                                            });
                                          }}
                                          className="cursor-pointer rounded-xl border border-olive-300 bg-card p-4 text-left shadow-sm transition-all hover:border-olive-500 hover:shadow-md hover:-translate-y-0.5 active:translate-y-0 dark:border-neutral-olive-700 dark:bg-neutral-olive-900 dark:hover:border-olive-500"
                                        >
                                          <span className="text-sm font-semibold text-foreground">
                                            {option.label}
                                          </span>
                                          {option.description && (
                                            <p className="mt-1 text-xs text-muted-foreground">
                                              {option.description}
                                            </p>
                                          )}
                                        </button>
                                      ))}
                                    </div>
                                  );
                                })()}
                              {/* Persona selection checkboxes (Step 3 only) */}
                              {isPersonaSelectMessage &&
                                personaOptions.length > 0 &&
                                !personaSelectConfirmed && (
                                  <div className="mt-3 rounded-xl border border-olive-200 bg-olive-50/60 p-4 dark:border-neutral-olive-700 dark:bg-neutral-olive-900/30 animate-in fade-in slide-in-from-bottom-2 duration-500">
                                    <p className="text-sm font-medium text-foreground mb-3">
                                      Select up to 3 personas to interview:
                                    </p>
                                    <div className="space-y-2">
                                      {personaOptions.map((persona, i) => {
                                        const isSelected =
                                          personaSelections.has(persona.name);
                                        const atLimit =
                                          personaSelections.size >= 3;
                                        return (
                                          <label
                                            key={i}
                                            className={cn(
                                              "flex items-start gap-3 rounded-lg border p-3 cursor-pointer transition-all",
                                              isSelected
                                                ? "border-olive-400 bg-olive-100/80 dark:border-olive-600 dark:bg-olive-900/40"
                                                : "border-transparent hover:border-olive-200 hover:bg-olive-50/40 dark:hover:border-neutral-olive-700 dark:hover:bg-neutral-olive-900/20",
                                              !isSelected &&
                                                atLimit &&
                                                "opacity-50 cursor-not-allowed",
                                            )}
                                          >
                                            <Checkbox
                                              checked={isSelected}
                                              disabled={!isSelected && atLimit}
                                              onCheckedChange={(checked) => {
                                                setPersonaSelections((prev) => {
                                                  const next = new Set(prev);
                                                  if (checked) {
                                                    if (next.size < 3)
                                                      next.add(persona.name);
                                                  } else {
                                                    next.delete(persona.name);
                                                  }
                                                  return next;
                                                });
                                              }}
                                              className="mt-0.5"
                                            />
                                            <div className="flex-1 min-w-0">
                                              <span className="text-sm font-medium text-foreground">
                                                {persona.name}
                                              </span>
                                              {persona.description && (
                                                <span className="text-sm text-muted-foreground">
                                                  {" "}
                                                  — {persona.description}
                                                </span>
                                              )}
                                            </div>
                                          </label>
                                        );
                                      })}
                                    </div>

                                    {/* Custom persona input */}
                                    <div className="mt-3 flex items-center gap-2">
                                      <UserPlus className="h-4 w-4 text-muted-foreground shrink-0" />
                                      <input
                                        type="text"
                                        value={customPersonaInput}
                                        onChange={(e) =>
                                          setCustomPersonaInput(e.target.value)
                                        }
                                        onKeyDown={(e) => {
                                          if (e.key === "Enter") {
                                            e.preventDefault();
                                            const name =
                                              customPersonaInput.trim();
                                            if (
                                              name &&
                                              !personaOptions.some(
                                                (p) =>
                                                  p.name.toLowerCase() ===
                                                  name.toLowerCase(),
                                              )
                                            ) {
                                              setPersonaOptions((prev) => [
                                                ...prev,
                                                { name, description: "" },
                                              ]);
                                              setPersonaSelections((prev) => {
                                                const next = new Set(prev);
                                                if (next.size < 3)
                                                  next.add(name);
                                                return next;
                                              });
                                              setCustomPersonaInput("");
                                            }
                                          }
                                        }}
                                        placeholder="Add your own persona..."
                                        className="flex-1 rounded-md border border-olive-200 bg-transparent px-3 py-1.5 text-sm outline-none placeholder:text-muted-foreground focus:border-olive-400 dark:border-neutral-olive-700 dark:focus:border-olive-600"
                                      />
                                      <Button
                                        type="button"
                                        variant="outline"
                                        size="sm"
                                        disabled={!customPersonaInput.trim()}
                                        onClick={() => {
                                          const name =
                                            customPersonaInput.trim();
                                          if (
                                            name &&
                                            !personaOptions.some(
                                              (p) =>
                                                p.name.toLowerCase() ===
                                                name.toLowerCase(),
                                            )
                                          ) {
                                            setPersonaOptions((prev) => [
                                              ...prev,
                                              { name, description: "" },
                                            ]);
                                            setPersonaSelections((prev) => {
                                              const next = new Set(prev);
                                              if (next.size < 3) next.add(name);
                                              return next;
                                            });
                                            setCustomPersonaInput("");
                                          }
                                        }}
                                        className="text-xs"
                                      >
                                        Add
                                      </Button>
                                    </div>

                                    {/* Confirm button */}
                                    <div className="mt-4 flex justify-center">
                                      <Button
                                        disabled={
                                          personaSelections.size === 0 ||
                                          isLoading
                                        }
                                        onClick={async () => {
                                          const selectedNames = [
                                            ...personaSelections,
                                          ];
                                          // Count existing persona cards (contain em-dash, no cluster) to continue color sequence
                                          const existingPersonaCount = storeApi.getState().stickyNotes.filter(
                                            (n) => !n.cluster && n.text.includes(" — "),
                                          ).length;
                                          // Add selected personas as canvas items with distinct colors
                                          const personaItems = selectedNames.map(
                                            (name, i) => {
                                              const persona = personaOptions.find(
                                                (p) => p.name === name,
                                              );
                                              return {
                                                text: persona?.description
                                                  ? `${name} — ${persona.description}`
                                                  : name,
                                                color:
                                                  PERSONA_CARD_COLORS[
                                                    (existingPersonaCount + i) % PERSONA_CARD_COLORS.length
                                                  ],
                                              };
                                            },
                                          );
                                          addCanvasItemsToBoard({
                                            stepId: step.id,
                                            items: personaItems,
                                            storeApi,
                                            addStickyNote,
                                            updateStickyNote,
                                          });
                                          setPersonaSelectConfirmed(true);
                                          await flushCanvasToDb();
                                          // Save structured persona candidates for Step 5 pre-seeding
                                          const candidatesToSave = selectedNames.map((personaName) => {
                                            const persona = personaOptions.find((p) => p.name === personaName);
                                            const commaIdx = personaName.indexOf(',');
                                            const firstName = commaIdx > 0 ? personaName.slice(0, commaIdx).trim() : personaName;
                                            const archetype = commaIdx > 0 ? personaName.slice(commaIdx + 1).trim() : personaName;
                                            return { name: firstName, archetype, description: persona?.description || '' };
                                          });
                                          await savePersonaCandidates(workshopId, step.id, candidatesToSave);
                                          sendMessage({
                                            role: "user",
                                            parts: [
                                              {
                                                type: "text",
                                                text: `I'd like to interview these personas: ${selectedNames.join(", ")}`,
                                              },
                                            ],
                                          });
                                        }}
                                        className="rounded-full bg-olive-700 px-5 py-2 text-sm font-medium text-white hover:bg-olive-800 dark:bg-olive-600 dark:hover:bg-olive-500"
                                      >
                                        Confirm Selection (
                                        {personaSelections.size}/3)
                                      </Button>
                                    </div>
                                  </div>
                                )}
                            </div>
                          </div>
                        </div>
                      );
                    })}

                  {/* Typing indicator — rotating sage "thinking" phrase */}
                  {status === "submitted" && <ThinkingIndicator />}

                  {/* Stream error recovery */}
                  {streamError && !isLoading && (
                    <div className="flex items-start">
                      <div className="flex-1">
                        <div className="rounded-lg border border-yellow-500/50 bg-yellow-50 dark:bg-yellow-950/20 p-3 text-base">
                          <p className="text-yellow-800 dark:text-yellow-200">
                            Response was interrupted.
                          </p>
                          <Button
                            onClick={() => {
                              setStreamError(false);
                              // Find last user message and resend it
                              const lastUserMsg = [...messages]
                                .reverse()
                                .find((m) => m.role === "user");
                              if (lastUserMsg) {
                                // Remove failed assistant response if present
                                const lastMsg = messages[messages.length - 1];
                                if (lastMsg.role === "assistant") {
                                  setMessages(messages.slice(0, -1));
                                }
                                // Resend last user message
                                sendMessage({
                                  role: "user",
                                  parts: lastUserMsg.parts || [],
                                });
                              }
                            }}
                            variant="outline"
                            size="sm"
                            className="mt-2"
                          >
                            Retry Response
                          </Button>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Synthetic interview mode: always show "your turn" prompt + suggestion buttons */}
                  {step.id === "user-research" &&
                    personaSelectConfirmed &&
                    interviewMode !== "real" &&
                    status === "ready" &&
                    messages.length > 0 &&
                    !justConfirmed && (
                      <div className="space-y-2 pt-2">
                        {/* Auto-show suggestion pills when AI provides them */}
                        {suggestions.length > 0 && (
                          <div className="flex flex-wrap gap-2">
                            {suggestions.map((suggestion, i) => (
                              <button
                                key={i}
                                disabled={isLoading}
                                onClick={async () => {
                                  setSuggestions([]);
                                  setSuggestionsExpanded(false);
                                  await flushCanvasToDb();
                                  sendMessage({
                                    role: "user",
                                    parts: [{ type: "text", text: suggestion }],
                                  });
                                }}
                                className={cn(
                                  "cursor-pointer rounded-full border border-olive-300 bg-card px-3 py-1.5 text-sm text-foreground shadow-sm hover:bg-olive-100 hover:border-olive-400 dark:border-neutral-olive-700 dark:bg-neutral-olive-900 dark:hover:bg-neutral-olive-800 dark:hover:border-neutral-olive-600 transition-colors",
                                  "disabled:cursor-not-allowed disabled:opacity-50",
                                )}
                              >
                                {suggestion}
                              </button>
                            ))}
                          </div>
                        )}
                        {/* Fallback: "Give me a suggestion" button only when no suggestions available */}
                        {suggestions.length === 0 && (
                          <div>
                            <button
                              disabled={isLoading}
                              onClick={async () => {
                                await flushCanvasToDb();
                                sendMessage({
                                  role: "user",
                                  parts: [
                                    {
                                      type: "text",
                                      text: "[SUGGEST_QUESTIONS] Give me some question ideas for this persona.",
                                    },
                                  ],
                                });
                              }}
                              className={cn(
                                "cursor-pointer inline-flex items-center gap-1.5 rounded-full border border-olive-300 bg-card px-3 py-1.5 text-sm text-foreground shadow-sm hover:bg-olive-100 hover:border-olive-400 dark:border-neutral-olive-700 dark:bg-neutral-olive-900 dark:hover:bg-neutral-olive-800 dark:hover:border-neutral-olive-600 transition-colors",
                                "disabled:cursor-not-allowed disabled:opacity-50",
                              )}
                            >
                              <Sparkles className="h-3.5 w-3.5" />
                              Give me a suggestion
                            </button>
                          </div>
                        )}
                        <p className="text-sm font-medium text-foreground pl-1">
                          Your turn — use one of the questions above or write your next question.
                        </p>
                      </div>
                    )}

                  {/* "Catch up on my edits" — concept step sync button */}
                  {step.id === "concept" &&
                    status === "ready" &&
                    !isLoading && (
                      <div className="flex justify-center pt-1">
                        <button
                          onClick={async () => {
                            await flushCanvasToDb();
                            sendMessage({
                              role: "user",
                              parts: [
                                {
                                  type: "text",
                                  text: "[CATCH_UP_EDITS] I've been editing the concept cards directly — catch up on my changes and pick up where we left off.",
                                },
                              ],
                            });
                          }}
                          className={cn(
                            "cursor-pointer inline-flex items-center gap-1.5 rounded-full border border-olive-300 bg-card px-3 py-1.5 text-xs text-muted-foreground shadow-sm hover:bg-olive-100 hover:border-olive-400 dark:border-neutral-olive-700 dark:bg-neutral-olive-900 dark:hover:bg-neutral-olive-800 dark:hover:border-neutral-olive-600 transition-colors",
                          )}
                        >
                          <RefreshCw className="h-3 w-3" />
                          Catch up on my edits
                        </button>
                      </div>
                    )}

                  {/* Suggestion pills — inline after last AI response (non-interview mode) */}
                  {suggestions.length > 0 &&
                    !(step.id === "user-research" && personaSelectConfirmed) &&
                    // While the interview-mode or research-source fork cards are
                    // on screen and unanswered, those cards ARE the choices —
                    // suppress duplicate suggestion pills if the AI also emitted a
                    // [SUGGESTIONS] block.
                    !(interviewModeMessageId && !interviewMode) &&
                    !(researchSourceMessageId && !researchSourceChosen) &&
                    (() => {
                      // Separate "Next" suggestion from others for journey mapping
                      const isNextSuggestion = (s: string) =>
                        /^next\b/i.test(s.trim());
                      const nextSuggestion =
                        step.id === "journey-mapping"
                          ? suggestions.find(isNextSuggestion)
                          : undefined;

                      // Detect "Looks good" during stage confirmation (no grid items yet)
                      const isLooksGoodSuggestion = (s: string) =>
                        /^looks good/i.test(s.trim());
                      const hasGridItems = stickyNotes.some(
                        (n) => n.cellAssignment?.row,
                      );
                      const looksGoodSuggestion =
                        step.id === "journey-mapping" && !hasGridItems
                          ? suggestions.find(isLooksGoodSuggestion)
                          : undefined;

                      const otherSuggestions = suggestions.filter(
                        (s) =>
                          s !== nextSuggestion && s !== looksGoodSuggestion,
                      );

                      // Compute next row label for journey mapping
                      let nextRowLabel = "";
                      if (nextSuggestion && step.id === "journey-mapping") {
                        const gridConfig =
                          getStepCanvasConfig("journey-mapping").gridConfig;
                        if (gridConfig) {
                          const filledRows = new Set(
                            stickyNotes
                              .filter((n) => n.cellAssignment?.row)
                              .map((n) => n.cellAssignment!.row),
                          );
                          const nextRow = gridConfig.rows.find(
                            (r) => !filledRows.has(r.id),
                          );
                          if (nextRow) nextRowLabel = nextRow.label;
                        }
                      }

                      return (
                        <div className="space-y-2 pt-1">
                          {otherSuggestions.length > 0 && (
                            <div className="flex flex-wrap gap-2">
                              {otherSuggestions.map((suggestion, i) => (
                                <button
                                  key={i}
                                  disabled={isLoading}
                                  onClick={async () => {
                                    setSuggestions([]);
                                    await flushCanvasToDb();
                                    sendMessage({
                                      role: "user",
                                      parts: [
                                        { type: "text", text: suggestion },
                                      ],
                                    });
                                  }}
                                  className={cn(
                                    "cursor-pointer rounded-full border border-olive-300 bg-card px-3 py-1.5 text-sm text-foreground shadow-sm hover:bg-olive-100 hover:border-olive-400 dark:border-neutral-olive-700 dark:bg-neutral-olive-900 dark:hover:bg-neutral-olive-800 dark:hover:border-neutral-olive-600 transition-colors",
                                    "disabled:cursor-not-allowed disabled:opacity-50",
                                  )}
                                >
                                  {suggestion}
                                </button>
                              ))}
                            </div>
                          )}
                          {looksGoodSuggestion ? (
                            <button
                              disabled={isLoading}
                              onClick={async () => {
                                setSuggestions([]);
                                await flushCanvasToDb();
                                sendMessage({
                                  role: "user",
                                  parts: [
                                    { type: "text", text: "Looks good!" },
                                  ],
                                });
                              }}
                              className={cn(
                                "cursor-pointer inline-flex items-center gap-2 rounded-full border border-olive-500 bg-olive-600 px-4 py-2 text-sm font-medium text-white shadow-sm hover:bg-olive-700 dark:bg-olive-700 dark:border-olive-600 dark:hover:bg-olive-600 transition-colors",
                                "disabled:cursor-not-allowed disabled:opacity-50",
                              )}
                            >
                              Looks good — Add these stages
                              <ArrowRight className="h-3.5 w-3.5" />
                            </button>
                          ) : null}
                          {nextSuggestion ? (
                            <button
                              disabled={isLoading}
                              onClick={async () => {
                                setSuggestions([]);
                                await flushCanvasToDb();
                                sendMessage({
                                  role: "user",
                                  parts: [{ type: "text", text: "Next" }],
                                });
                              }}
                              className={cn(
                                "cursor-pointer inline-flex items-center gap-2 rounded-full border border-olive-500 bg-olive-600 px-4 py-2 text-sm font-medium text-white shadow-sm hover:bg-olive-700 dark:bg-olive-700 dark:border-olive-600 dark:hover:bg-olive-600 transition-colors",
                                "disabled:cursor-not-allowed disabled:opacity-50",
                              )}
                            >
                              {nextRowLabel
                                ? `Move on to ${nextRowLabel}`
                                : "Next"}
                              <ArrowRight className="h-3.5 w-3.5" />
                            </button>
                          ) : null}
                          <p className="text-xs text-muted-foreground pl-1">
                            Use the suggestions above or type your own below.
                          </p>
                        </div>
                      );
                    })()}

                  {/* Persistent "Pains & Gains" action button — sense-making Phase 1 → Phase 2 transition */}
                  {step.id === "sense-making" &&
                    stickyNotes.some((n) =>
                      ["says", "thinks", "feels", "does"].includes(
                        n.cellAssignment?.row || "",
                      ),
                    ) &&
                    !stickyNotes.some(
                      (n) =>
                        n.cellAssignment?.row === "pains" ||
                        n.cellAssignment?.row === "gains",
                    ) && (
                      <div className="flex justify-center pt-2">
                        <button
                          disabled={isLoading}
                          onClick={async () => {
                            await flushCanvasToDb();
                            sendMessage({
                              role: "user",
                              parts: [
                                {
                                  type: "text",
                                  text: "This looks great, let's move to pains and gains",
                                },
                              ],
                            });
                          }}
                          className={cn(
                            "inline-flex items-center gap-2 rounded-full border border-olive-400 bg-card px-4 py-2 text-sm font-medium text-olive-800 shadow-sm transition-all hover:bg-olive-100 hover:shadow-md dark:border-olive-600 dark:bg-neutral-olive-800 dark:text-olive-300 dark:hover:bg-neutral-olive-700",
                            "disabled:cursor-not-allowed disabled:opacity-50",
                          )}
                        >
                          <Sparkles className="h-3.5 w-3.5" />
                          Let&apos;s move on to pains and gains
                        </button>
                      </div>
                    )}

                  {/* Research upload: review-and-confirm batch bar */}
                  {step.id === "user-research" && pendingResearch && (
                    <div className="mx-auto max-w-sm rounded-xl border border-olive-200 bg-olive-50/60 p-4 text-center dark:border-neutral-olive-700 dark:bg-neutral-olive-900/30 animate-in fade-in slide-in-from-bottom-2 duration-500">
                      <p className="text-sm text-foreground mb-1">
                        I read your research and pulled out{" "}
                        <strong>
                          {pendingResearch.insightCount} insight
                          {pendingResearch.insightCount === 1 ? "" : "s"}
                        </strong>
                        {pendingResearch.personaCount > 0 && (
                          <>
                            {" "}across{" "}
                            <strong>
                              {pendingResearch.personaCount} new{" "}
                              {pendingResearch.personaCount === 1
                                ? "person"
                                : "people"}
                            </strong>
                          </>
                        )}
                        .
                      </p>
                      <p className="text-xs text-muted-foreground mb-3">
                        They&apos;re on the canvas as previews — reject any that
                        don&apos;t fit, then add them to the board.
                      </p>
                      <div className="flex justify-center gap-2">
                        <button
                          onClick={handleConfirmResearch}
                          className="inline-flex items-center gap-2 rounded-full bg-olive-700 px-4 py-2 text-sm font-medium text-white shadow-sm transition-all hover:bg-olive-800 dark:bg-olive-600 dark:hover:bg-olive-500"
                        >
                          <CheckCircle2 className="h-3.5 w-3.5" />
                          Add to board
                        </button>
                        <button
                          onClick={handleDiscardResearch}
                          className="inline-flex items-center gap-2 rounded-full border border-olive-300 bg-card px-4 py-2 text-sm font-medium text-muted-foreground transition-all hover:bg-olive-50 hover:text-foreground dark:border-neutral-olive-700 dark:bg-neutral-olive-800 dark:hover:bg-neutral-olive-700"
                        >
                          Discard
                        </button>
                      </div>
                    </div>
                  )}

                  {/* Multiplayer Fieldwork: open an async research window, watch the
                      roster, then close & synthesize. Replaces the solo compile button.
                      Hidden until a research source is chosen from the fork, so it
                      doesn't compete with the "upload vs conduct" choice. */}
                  {step.id === "user-research" &&
                    isMultiplayer &&
                    interviewMode === "real" &&
                    researchSourceChosen &&
                    !readyToCompile &&
                    !pendingResearch &&
                    status === "ready" &&
                    (!fieldworkOpen ? (
                      <div className="mx-auto max-w-sm rounded-xl border border-olive-200 bg-olive-50/60 p-4 text-center dark:border-neutral-olive-700 dark:bg-neutral-olive-900/30 animate-in fade-in slide-in-from-bottom-2 duration-500">
                        <p className="text-sm text-muted-foreground mb-3">
                          Ready for the team to go interview? Open fieldwork so
                          everyone can add their research on their own time — even
                          across days.
                        </p>
                        <button
                          onClick={async () => {
                            setFieldworkOpen(true);
                            await flushCanvasToDb();
                          }}
                          className="inline-flex items-center gap-2 rounded-full bg-olive-700 px-4 py-2 text-sm font-medium text-white shadow-sm transition-all hover:bg-olive-800 dark:bg-olive-600 dark:hover:bg-olive-500"
                        >
                          <Users className="h-3.5 w-3.5" />
                          Open fieldwork
                        </button>
                      </div>
                    ) : (
                      <div className="mx-auto max-w-sm space-y-3 animate-in fade-in slide-in-from-bottom-2 duration-500">
                        <FieldworkRoster submissions={fieldworkSubmissions} />
                        <div className="flex flex-wrap justify-center gap-2">
                          <button
                            onClick={async () => {
                              const res = await sendResearchReminders(workshopId);
                              if (res.success) {
                                toast.success(
                                  res.sent
                                    ? `Reminder sent to ${res.sent} ${res.sent === 1 ? "person" : "people"}.`
                                    : "Everyone's already submitted — no reminders needed.",
                                );
                              } else {
                                toast.error(res.error || "Couldn't send reminders.");
                              }
                            }}
                            className="inline-flex items-center gap-2 rounded-full border border-olive-300 bg-card px-4 py-2 text-sm font-medium text-muted-foreground shadow-sm transition-all hover:bg-olive-50 hover:text-foreground dark:border-neutral-olive-700 dark:bg-neutral-olive-800 dark:hover:bg-neutral-olive-700"
                          >
                            Remind stragglers
                          </button>
                          {(hasRealResearchInsights ||
                            Object.keys(fieldworkSubmissions).length > 0) && (
                            <button
                              onClick={async () => {
                                setFieldworkOpen(false);
                                setReadyToCompile(true);
                                await flushCanvasToDb();
                                sendMessage({
                                  role: "user",
                                  parts: [
                                    {
                                      type: "text",
                                      text: "[COMPILE_READY] Fieldwork is closed — please compile everyone's research insights.",
                                    },
                                  ],
                                });
                              }}
                              className="inline-flex items-center gap-2 rounded-full border border-olive-400 bg-card px-4 py-2 text-sm font-medium text-olive-800 shadow-sm transition-all hover:bg-olive-100 dark:border-olive-600 dark:bg-neutral-olive-800 dark:text-olive-300 dark:hover:bg-neutral-olive-700"
                            >
                              <Sparkles className="h-3.5 w-3.5" />
                              Close fieldwork &amp; synthesize
                            </button>
                          )}
                        </div>
                        {!hasRealResearchInsights &&
                          Object.keys(fieldworkSubmissions).length === 0 && (
                            <p className="text-center text-xs text-muted-foreground">
                              Add your own research below, or wait for the team — the
                              synthesize button appears once findings are in.
                            </p>
                          )}
                      </div>
                    ))}

                  {/* Solo real interviews: "I'm ready to compile" button — only once
                      actual research is on the board, so it can't be triggered
                      while the user is still out conducting interviews. */}
                  {step.id === "user-research" &&
                    !isMultiplayer &&
                    interviewMode === "real" &&
                    hasRealResearchInsights &&
                    !readyToCompile &&
                    !pendingResearch &&
                    status === "ready" && (
                      <div className="mx-auto max-w-sm rounded-xl border border-olive-200 bg-olive-50/60 p-4 text-center dark:border-neutral-olive-700 dark:bg-neutral-olive-900/30 animate-in fade-in slide-in-from-bottom-2 duration-500">
                        <p className="text-sm text-muted-foreground mb-3">
                          Added your interview insights and grouped them by
                          persona? Let me compile and organize them.
                        </p>
                        <button
                          disabled={isLoading}
                          onClick={async () => {
                            setReadyToCompile(true);
                            await flushCanvasToDb();
                            sendMessage({
                              role: "user",
                              parts: [
                                {
                                  type: "text",
                                  text: "[COMPILE_READY] I'm ready for you to compile my research insights.",
                                },
                              ],
                            });
                          }}
                          className="inline-flex items-center gap-2 rounded-full border border-olive-400 bg-card px-4 py-2 text-sm font-medium text-olive-800 shadow-sm transition-all hover:bg-olive-100 hover:shadow-md dark:border-olive-600 dark:bg-neutral-olive-800 dark:text-olive-300 dark:hover:bg-neutral-olive-700 disabled:cursor-not-allowed disabled:opacity-50"
                        >
                          <Sparkles className="h-3.5 w-3.5" />
                          I&apos;m ready to compile
                        </button>
                      </div>
                    )}

                  {/* Proactive theme sort card — stakeholder mapping, 5+ items, not yet sorted */}
                  {step.id === "stakeholder-mapping" &&
                    status === "ready" &&
                    !hasThemeSorted &&
                    stickyNotes.filter(
                      (p) =>
                        (!p.type || p.type === "stickyNote") && !p.isPreview,
                    ).length >= 5 &&
                    messages.some((m) => m.role === "assistant") && (
                      <div className="mx-auto max-w-sm rounded-xl border border-olive-200 bg-olive-50/60 p-4 text-center dark:border-neutral-olive-700 dark:bg-neutral-olive-900/30">
                        <p className="text-sm text-muted-foreground mb-3">
                          You&apos;ve got a solid collection! Want me to
                          organize them into groups?
                        </p>
                        <button
                          onClick={handleThemeSort}
                          className="inline-flex items-center gap-2 rounded-full border border-olive-400 bg-card px-4 py-2 text-sm font-medium text-olive-800 shadow-sm transition-all hover:bg-olive-100 hover:shadow-md dark:border-olive-600 dark:bg-neutral-olive-800 dark:text-olive-300 dark:hover:bg-neutral-olive-700"
                        >
                          <Sparkles className="h-3.5 w-3.5" />
                          Sort cards into themes
                        </button>
                      </div>
                    )}

                  {/* Post-sort instructions */}
                  {showSortInstructions && (
                    <div className="mx-auto max-w-sm rounded-xl border border-olive-200 bg-olive-50/60 p-4 dark:border-neutral-olive-700 dark:bg-neutral-olive-900/30 animate-in fade-in slide-in-from-bottom-2 duration-500">
                      <p className="text-sm font-medium text-foreground mb-2">
                        Cards sorted into themes!
                      </p>
                      <ul className="text-sm text-muted-foreground space-y-1.5">
                        <li>
                          Drag items toward the{" "}
                          <strong className="text-foreground">center</strong> if
                          they&apos;re more important
                        </li>
                        <li>
                          Drag items{" "}
                          <strong className="text-foreground">
                            between groups
                          </strong>{" "}
                          to reorganize
                        </li>
                        <li>
                          Double-click any card to{" "}
                          <strong className="text-foreground">edit</strong> its
                          label
                        </li>
                      </ul>
                      {/* Show confirm button after sort — use relaxed condition (any items on board) since theme sort signals user is done */}
                      {stepConfirmLabel &&
                        !justConfirmed &&
                        status === "ready" &&
                        stickyNotes.length > 0 &&
                        !stepAlreadyConfirmed &&
                        !isReadOnly && (
                          <div className="mt-3 pt-3 border-t border-olive-200 dark:border-neutral-olive-700 flex justify-center">
                            <button
                              onClick={() => {
                                if (stepConfirmDisabled) return;
                                onStepConfirm?.();
                                if (stepConfirmIsTransition) return;
                                setJustConfirmed(true);
                                sendMessage({
                                  role: "user",
                                  parts: [
                                    {
                                      type: "text",
                                      text: "[STEP_CONFIRMED] I'm happy with this — wrap it up!",
                                    },
                                  ],
                                });
                              }}
                              disabled={stepConfirmDisabled}
                              className="inline-flex items-center gap-2 rounded-full border border-olive-400 bg-card px-4 py-2 text-sm font-medium text-olive-800 shadow-sm transition-all hover:bg-olive-100 hover:shadow-md dark:border-olive-600 dark:bg-neutral-olive-800 dark:text-olive-300 dark:hover:bg-neutral-olive-700"
                            >
                              <CheckCircle2 className="h-4 w-4" />
                              {stepConfirmLabel}
                            </button>
                          </div>
                        )}
                    </div>
                  )}

                  {/* In-chat accept / edit buttons — hidden when sort instructions card already shows the confirm button, and hidden for read-only participants */}
                  {showStepConfirm &&
                    status === "ready" &&
                    !justConfirmed &&
                    !(step.id === "persona" && !personasDone) &&
                    !showSortInstructions &&
                    !isReadOnly && (
                      <div className="flex flex-col items-center gap-2 pt-2">
                        {step.id === "persona" && (
                          <p className="text-sm text-muted-foreground text-center max-w-xs">
                            You can edit any field on the persona cards — name,
                            age, job, insights, narrative, and quote — directly
                            on the canvas.
                          </p>
                        )}
                        <button
                          onClick={() => {
                            if (stepConfirmDisabled) return;
                            onStepConfirm?.();
                            if (stepConfirmIsTransition) return; // Sub-step transition — no AI message or revise flow
                            setJustConfirmed(true);
                            // Trigger AI congratulatory close by sending a hidden confirm message
                            sendMessage({
                              role: "user",
                              parts: [
                                {
                                  type: "text",
                                  text: "[STEP_CONFIRMED] I'm happy with this — wrap it up!",
                                },
                              ],
                            });
                          }}
                          disabled={stepConfirmDisabled}
                          className="inline-flex items-center gap-2 rounded-full border border-olive-400 bg-olive-50 px-4 py-2 text-sm font-medium text-olive-800 transition-colors hover:bg-olive-100 disabled:opacity-50 disabled:cursor-not-allowed dark:border-olive-700 dark:bg-olive-950/30 dark:text-olive-300 dark:hover:bg-olive-900/40"
                        >
                          <CheckCircle2 className="h-4 w-4" />
                          {stepConfirmLabel}
                        </button>
                      </div>
                    )}
                  {justConfirmed && !isReadOnly && (
                    <div className="flex justify-center pt-2 animate-in fade-in duration-500">
                      <button
                        onClick={async () => {
                          setJustConfirmed(false);
                          onStepRevise?.();
                          // Clear existing canvas items so the revised version replaces them
                          const state = storeApi.getState();
                          state.setStickyNotes([]);
                          if (state.personaTemplates.length > 0) {
                            state.setPersonaTemplates([]);
                          }
                          if (state.hmwCards.length > 0) {
                            state.setHmwCards([]);
                          }
                          // Save cleared state directly to DB (bypass stale flushCanvasToDb closure)
                          await saveCanvasState(workshopId, step.id, {
                            stickyNotes: [],
                          });
                          state.markClean();
                          sendMessage({
                            role: "user",
                            parts: [
                              {
                                type: "text",
                                text: "I'd like to revise and improve the current output. Please suggest a better version.",
                              },
                            ],
                          });
                        }}
                        className="inline-flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground transition-colors"
                      >
                        <Pencil className="h-3 w-3" />
                        Edit
                      </button>
                    </div>
                  )}

                  {/* Auto-scroll target */}
                  <div ref={messagesEndRef} />
                </div>
                );
              })()}
            </div>
          </>
        )}
      </div>

      {/* Rate limit banner — hidden for read-only participants */}
      {rateLimitInfo && !isReadOnly && (
        <div className="mx-4 mb-2 flex items-center gap-2 rounded-md border border-yellow-500/50 bg-yellow-50 dark:bg-yellow-950/20 px-3 py-2 text-base text-yellow-800 dark:text-yellow-200">
          <Loader2 className="h-4 w-4 animate-spin shrink-0" />
          <span>AI is busy. Try again in {rateLimitInfo.retryAfter}s...</span>
        </div>
      )}

      {/* Input area — hidden for read-only participants and during concept pre-activity */}
      {!isReadOnly && !(isMultiplayer && step.id === 'concept' && !conceptActivityStarted) && (
        <div className="border-t bg-background/20 p-4">
          {/* Persistent bulk-research entry point (Step 3, facilitator) */}
          {step.id === "user-research" && (
            <div className="mb-2 flex justify-start">
              <button
                type="button"
                onClick={() => setUploadOpen(true)}
                className="inline-flex items-center gap-1.5 rounded-full border border-olive-300 bg-card px-3 py-1.5 text-xs font-medium text-olive-800 shadow-sm transition-all hover:bg-olive-100 dark:border-neutral-olive-700 dark:bg-neutral-olive-800 dark:text-olive-300 dark:hover:bg-neutral-olive-700"
              >
                <FileText className="h-3.5 w-3.5" />
                Add research
              </button>
            </div>
          )}
          <form onSubmit={handleSend} className="flex gap-2">
            <TextareaAutosize
              ref={inputRef}
              minRows={1}
              maxRows={6}
              value={inputValue}
              onChange={(e) => setInputValue(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder={
                rateLimitInfo
                  ? "Waiting for AI to become available..."
                  : "Type your message..."
              }
              disabled={isLoading || !!rateLimitInfo}
              className={cn(
                "flex-1 resize-none rounded-md border border-input bg-transparent px-3 py-2 text-base shadow-xs outline-none transition-[color,box-shadow]",
                "placeholder:text-muted-foreground",
                "disabled:cursor-not-allowed disabled:opacity-50",
                "focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/50",
              )}
            />
            <Button
              type="submit"
              disabled={isLoading || !inputValue.trim() || !!rateLimitInfo}
              size="icon"
              variant="default"
              aria-label="Send message"
            >
              <Send />
            </Button>
          </form>
        </div>
      )}

      {step.id === "user-research" && (
        <ResearchUploadDialog
          open={uploadOpen}
          onOpenChange={setUploadOpen}
          onAnalyze={handleAnalyzeResearch}
          analyzing={analyzingResearch}
        />
      )}
    </div>
  );
}
