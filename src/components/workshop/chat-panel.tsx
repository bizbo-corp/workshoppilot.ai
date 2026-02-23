'use client';

import * as React from 'react';
import { useChat } from '@ai-sdk/react';
import { DefaultChatTransport, type UIMessage } from 'ai';
import TextareaAutosize from 'react-textarea-autosize';
import ReactMarkdown from 'react-markdown';
import { Send, Loader2, Plus, CheckCircle2, Pencil, Sparkles, UserPlus } from 'lucide-react';
import { PersonaInterrupt } from './persona-interrupt';
import { getStepByOrder } from '@/lib/workshop/step-metadata';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { cn } from '@/lib/utils';
import { useAutoSave } from '@/hooks/use-auto-save';
import { useCanvasStore, useCanvasStoreApi } from '@/providers/canvas-store-provider';
import { computeCanvasPosition, computeStickyNoteSize, computeThemeSortPositions, computeClusterChildPositions, POST_IT_WIDTH, POST_IT_HEIGHT, CATEGORY_COLORS, ZONE_COLORS } from '@/lib/canvas/canvas-position';
import type { StickyNoteColor, MindMapNodeState, MindMapEdgeState } from '@/stores/canvas-store';
import type { PersonaTemplateData } from '@/lib/canvas/persona-template-types';
import type { HmwCardData } from '@/lib/canvas/hmw-card-types';
import type { ConceptCardData } from '@/lib/canvas/concept-card-types';
import { THEME_COLORS, ROOT_COLOR } from '@/lib/canvas/mind-map-theme-colors';
import { getStepCanvasConfig } from '@/lib/canvas/step-canvas-config';
import { saveCanvasState } from '@/actions/canvas-actions';

/** Steps that support canvas item auto-add */
const CANVAS_ENABLED_STEPS = ['challenge', 'stakeholder-mapping', 'user-research', 'sense-making', 'persona', 'journey-mapping', 'reframe', 'ideation', 'concept'];

/** Distinct colors assigned to persona cards in user-research step (one per persona) */
const PERSONA_CARD_COLORS: StickyNoteColor[] = ['pink', 'blue', 'green'];

/** Suggestion button color classes per sticky note color */
const SUGGESTION_BUTTON_STYLES: Record<StickyNoteColor, string> = {
  yellow: 'border-amber-300 bg-[var(--sticky-note-yellow)] dark:border-amber-600/50 dark:bg-amber-900/30 dark:text-amber-200',
  red: 'border-red-300 bg-[var(--sticky-note-red)] dark:border-red-600/50 dark:bg-red-900/30 dark:text-red-200',
  green: 'border-emerald-300 bg-[var(--sticky-note-green)] dark:border-emerald-600/50 dark:bg-emerald-900/30 dark:text-emerald-200',
  pink: 'border-pink-300 bg-[var(--sticky-note-pink)] dark:border-pink-600/50 dark:bg-pink-900/30 dark:text-pink-200',
  blue: 'border-blue-300 bg-[var(--sticky-note-blue)] dark:border-blue-600/50 dark:bg-blue-900/30 dark:text-blue-200',
  orange: 'border-orange-300 bg-[var(--sticky-note-orange)] dark:border-orange-600/50 dark:bg-orange-900/30 dark:text-orange-200',
};

/** Compute the display color for a canvas suggestion item */
function getSuggestionItemColor(item: CanvasItemParsed): StickyNoteColor {
  const VALID_COLORS = new Set(['yellow', 'pink', 'blue', 'green', 'orange', 'red']);
  return (item.color && VALID_COLORS.has(item.color) ? item.color as StickyNoteColor : null)
    || (item.category && CATEGORY_COLORS[item.category])
    || (item.quadrant && ZONE_COLORS[item.quadrant])
    || 'yellow';
}

/** Fixed initial greetings shown instantly while AI generates first response */
const STEP_INITIAL_GREETINGS: Record<string, string> = {
  'journey-mapping': "Time to map the journey! 🗺️ We're going to walk in your persona's shoes and trace their current experience — every action, emotion, and friction point. I'm pulling together what we've learned so far to recommend the best journey template...",
};

/** Client-side quick acknowledgments shown instantly while AI thinks (before streaming begins) */
const QUICK_ACKS = [
  "On it! 🚀",
  "Love it, let me work with that. 💡",
  "Great pick! 🔥",
  "Give me a sec to pull this together. 🧠",
  "Roger that! 🫡",
  "Perfect, let me build this out. 🏗️",
  "Nice — working on it... 💡",
  "Got it — let me think about this. 🧠",
  "Ooh, good one. Let me dig in. 🔍",
];

function getRandomAck() {
  return QUICK_ACKS[Math.floor(Math.random() * QUICK_ACKS.length)];
}

/**
 * Parse [SUGGESTIONS]...[/SUGGESTIONS] block from AI content.
 * Returns clean content (block removed) and extracted suggestion strings.
 */
function parseSuggestions(content: string): { cleanContent: string; suggestions: string[] } {
  // Complete block: extract suggestions and strip
  const match = content.match(/\[SUGGESTIONS\]([\s\S]*?)\[\/SUGGESTIONS\]/);
  if (match) {
    const cleanContent = content.replace(/\[SUGGESTIONS\][\s\S]*?\[\/SUGGESTIONS\]/, '').trim();
    const suggestions = match[1]
      .split('\n')
      .map((line) => line.replace(/^[-*•]\s*/, '').trim())
      .filter((line) => line.length > 0);
    return { cleanContent, suggestions };
  }

  // Incomplete block (mid-stream): strip from [SUGGESTIONS] to end of string
  // Prevents raw suggestion text from flickering in the chat bubble during streaming
  if (content.includes('[SUGGESTIONS]')) {
    const cleanContent = content.replace(/\[SUGGESTIONS\][\s\S]*$/, '').trim();
    return { cleanContent, suggestions: [] };
  }

  return { cleanContent: content, suggestions: [] };
}

/**
 * Parse [PERSONA_SELECT]...[/PERSONA_SELECT] block from AI content.
 * Returns clean content (block removed) and extracted persona options.
 */
function parsePersonaSelect(content: string): { cleanContent: string; personaOptions: { name: string; description: string }[] } {
  // Complete block: extract persona options and strip
  const match = content.match(/\[PERSONA_SELECT\]([\s\S]*?)\[\/PERSONA_SELECT\]/);
  if (match) {
    const cleanContent = content.replace(/\[PERSONA_SELECT\][\s\S]*?\[\/PERSONA_SELECT\]/, '').trim();
    const personaOptions = match[1]
      .split('\n')
      .map((line) => line.replace(/^[-*•\d.]\s*/, '').trim())
      .filter((line) => line.length > 0)
      .map((line) => {
        // Parse "Name — description" or "Name - description"
        const dashMatch = line.match(/^(.+?)\s*[—–-]\s*(.+)$/);
        if (dashMatch) {
          return { name: dashMatch[1].trim(), description: dashMatch[2].trim() };
        }
        return { name: line, description: '' };
      });
    return { cleanContent, personaOptions };
  }

  // Incomplete block (mid-stream): strip from [PERSONA_SELECT] to end
  if (content.includes('[PERSONA_SELECT]')) {
    const cleanContent = content.replace(/\[PERSONA_SELECT\][\s\S]*$/, '').trim();
    return { cleanContent, personaOptions: [] };
  }

  return { cleanContent: content, personaOptions: [] };
}

/**
 * Parse [INTERVIEW_MODE]...[/INTERVIEW_MODE] block from AI content.
 * Returns clean content (block removed) and extracted mode options.
 */
function parseInterviewMode(content: string): { cleanContent: string; modeOptions: { id: 'synthetic' | 'real'; label: string; description: string }[] } {
  // Complete block: extract mode options and strip
  const match = content.match(/\[INTERVIEW_MODE\]([\s\S]*?)\[\/INTERVIEW_MODE\]/);
  if (match) {
    const cleanContent = content.replace(/\[INTERVIEW_MODE\][\s\S]*?\[\/INTERVIEW_MODE\]/, '').trim();
    const modeOptions = match[1]
      .split('\n')
      .map((line) => line.replace(/^[-*•\d.]\s*/, '').trim())
      .filter((line) => line.length > 0)
      .map((line) => {
        const dashMatch = line.match(/^(.+?)\s*[—–-]\s*(.+)$/);
        const label = dashMatch ? dashMatch[1].trim() : line;
        const description = dashMatch ? dashMatch[2].trim() : '';
        const id: 'synthetic' | 'real' = /real/i.test(label) ? 'real' : 'synthetic';
        return { id, label, description };
      });
    return { cleanContent, modeOptions };
  }

  // Incomplete block (mid-stream): strip from [INTERVIEW_MODE] to end
  if (content.includes('[INTERVIEW_MODE]')) {
    const cleanContent = content.replace(/\[INTERVIEW_MODE\][\s\S]*$/, '').trim();
    return { cleanContent, modeOptions: [] };
  }

  return { cleanContent: content, modeOptions: [] };
}

/**
 * Detect persona introduction messages (🎭 + "I'm [Name]" pattern).
 * Returns the persona name if found, null otherwise.
 */
function detectPersonaIntro(content: string): { personaName: string } | null {
  if (!content.includes('🎭')) return null;
  const match = content.match(/🎭[\s\S]*?(?:I'm|Hey,?\s*I'm|I am)\s+([A-Z][a-z]+)/);
  return match ? { personaName: match[1] } : null;
}

/**
 * Strip hallucinated system/tool tags from AI content.
 * Gemini sometimes leaks internal markers (`tool_code`, `artifact`, etc.)
 * that are not part of our markup format.
 */
function stripLeakedTags(content: string): { cleanContent: string } {
  const cleanContent = content
    // [artifact ...] or [/artifact] tags
    .replace(/\s*\[artifact[^\]]*\]\s*/gi, ' ')
    .replace(/\s*\[\/artifact\]\s*/gi, ' ')
    // `tool_code` backtick-wrapped markers (Gemini internal leak)
    .replace(/`tool_code`/gi, '')
    // ```tool_code fenced blocks
    .replace(/```tool_code[\s\S]*?```/gi, '')
    .trim();
  return { cleanContent };
}

/**
 * Detect and strip [THEME_SORT] markup from AI content.
 * Returns whether the trigger was found and the content with the trigger removed.
 */
function parseThemeSortTrigger(content: string): { cleanContent: string; shouldSort: boolean } {
  const shouldSort = content.includes('[THEME_SORT]');
  const cleanContent = content.replace(/\s*\[THEME_SORT\]\s*/g, ' ').trim();
  return { cleanContent, shouldSort };
}

/**
 * Parsed canvas item with optional position metadata
 */
type CanvasItemParsed = {
  text: string;
  quadrant?: string;
  ring?: string;     // Ring ID for concentric ring layout (inner/middle/outer)
  row?: string;
  col?: string;
  category?: string;
  cluster?: string;  // Parent label for hierarchical clustering (stakeholder mapping)
  isGridItem?: boolean;
  color?: string;    // Explicit color override (e.g. emotion traffic light: red/green/orange)
  templateKey?: string;  // Template targeting key (e.g., 'idea', 'problem')
};

/** Known quadrant/category values that can appear in shorthand Quad: syntax */
const EMPATHY_ZONE_IDS = new Set(['says', 'thinks', 'feels', 'does', 'pains', 'gains']);
const SENSE_MAKING_QUADRANTS = new Set(['said', 'thought', 'felt', 'experienced']);
const PERSONA_CATEGORIES = new Set(['goals', 'motivations', 'frustrations', 'behaviors']);
const RING_IDS = new Set(['inner', 'middle', 'outer']);

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
function parseQuadLabel(label: string): { quadrant?: string; category?: string; ring?: string } {
  const lower = label.toLowerCase().trim();

  // Ring IDs (inner/middle/outer) for concentric ring layout
  if (RING_IDS.has(lower)) return { ring: lower };

  // Empathy zone IDs (says/thinks/feels/does/pains/gains) — canonical zone names
  // Pains/gains return both quadrant AND category so they work for
  // empathy zone placement (via quadrant) and persona placement (via category)
  if (EMPATHY_ZONE_IDS.has(lower)) {
    if (lower === 'pains' || lower === 'gains') {
      return { quadrant: lower, category: lower };
    }
    return { quadrant: lower };
  }

  // Legacy sense-making quadrants (said/thought/felt/experienced)
  if (SENSE_MAKING_QUADRANTS.has(lower)) return { quadrant: lower };

  // Persona categories (goals/motivations/frustrations/behaviors)
  if (PERSONA_CATEGORIES.has(lower)) return { category: lower };

  // Stakeholder power/interest quadrants — natural language
  const stripped = lower.replace(/[^a-z]/g, '');
  if (stripped.includes('highpower') && stripped.includes('highinterest')) return { quadrant: 'high-power-high-interest' };
  if (stripped.includes('highpower') && stripped.includes('lowinterest')) return { quadrant: 'high-power-low-interest' };
  if (stripped.includes('lowpower') && stripped.includes('highinterest')) return { quadrant: 'low-power-high-interest' };
  if (stripped.includes('lowpower') && stripped.includes('lowinterest')) return { quadrant: 'low-power-low-interest' };

  // Already in kebab-case stakeholder format
  if (label.startsWith('high-') || label.startsWith('low-')) return { quadrant: label };

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
function parseCanvasItems(content: string): { cleanContent: string; canvasItems: CanvasItemParsed[] } {
  const items: CanvasItemParsed[] = [];

  // --- Format 1: Tag pairs  [CANVAS_ITEM ...]...[/CANVAS_ITEM] ---
  const tagRegex = /\[(CANVAS_ITEM|GRID_ITEM)(?:\s+([^\]]*))?\](.*?)\[\/(CANVAS_ITEM|GRID_ITEM)\]/g;
  let match;

  while ((match = tagRegex.exec(content)) !== null) {
    const tagType = match[1];
    const attrString = match[2] || '';
    const text = match[3].trim();
    if (text.length === 0) continue;

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
      isGridItem: tagType === 'GRID_ITEM',
      color: attrs.color,
      templateKey: attrs.key,
    });
  }

  // --- Format 2: Shorthand  [CANVAS_ITEM: Text] or [CANVAS_ITEM: Text, Quad: ...] ---
  // Run on content with tag-format already stripped to avoid double-parsing
  const contentWithoutTags = content.replace(/\[(CANVAS_ITEM|GRID_ITEM)(?:\s+[^\]]*?)?\].*?\[\/(CANVAS_ITEM|GRID_ITEM)\]/g, '');
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
    const clusterMatch = remaining.match(/,\s*Cluster:\s*([^,]+)$/i);
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
    if (text.length > 0) {
      items.push({ text, quadrant, ring, category, cluster, color, templateKey });
    }
  }

  // Remove both markup formats from content for clean markdown rendering.
  // Use '\n\n' as replacement to preserve paragraph breaks when tags sit between paragraphs.
  let cleanContent = content
    // Tag format
    .replace(/\s*\[(CANVAS_ITEM|GRID_ITEM)(?:\s+[^\]]*?)?\].*?\[\/(CANVAS_ITEM|GRID_ITEM)\]\s*/g, '\n\n')
    // Shorthand format
    .replace(/\s*\[CANVAS_ITEM:\s*[^\]]+\]\s*/g, '\n\n')
    .trim();

  return { cleanContent, canvasItems: items };
}

/**
 * Parse [CANVAS_DELETE: text] markup from AI content.
 * Returns clean content and texts to delete.
 */
function parseCanvasDeletes(content: string): { cleanContent: string; deleteTexts: string[] } {
  const deleteTexts: string[] = [];
  const regex = /\[CANVAS_DELETE:\s*([^\]]+)\]/g;
  let match;
  while ((match = regex.exec(content)) !== null) {
    const text = match[1].trim();
    if (text.length > 0) deleteTexts.push(text);
  }
  const cleanContent = content.replace(/\s*\[CANVAS_DELETE:\s*[^\]]+\]\s*/g, ' ').trim();
  return { cleanContent, deleteTexts };
}

/**
 * Parse [CLUSTER: Parent | child1 | child2 | child3] markup from AI content.
 * Returns clean content and cluster suggestions.
 */
function parseClusterSuggestions(content: string): { cleanContent: string; clusters: Array<{ parent: string; children: string[] }> } {
  const clusters: Array<{ parent: string; children: string[] }> = [];
  const regex = /\[CLUSTER:\s*([^\]]+)\]/g;
  let match;
  while ((match = regex.exec(content)) !== null) {
    const parts = match[1].split('|').map(s => s.trim()).filter(s => s.length > 0);
    if (parts.length >= 2) {
      clusters.push({ parent: parts[0], children: parts.slice(1) });
    }
  }
  const cleanContent = content.replace(/\s*\[CLUSTER:\s*[^\]]+\]\s*/g, ' ').trim();
  return { cleanContent, clusters };
}

/**
 * Parse [PERSONA_TEMPLATE]{...JSON...}[/PERSONA_TEMPLATE] blocks from AI content.
 * Returns clean content (markup removed) and extracted persona template data.
 */
function parsePersonaTemplates(content: string): { cleanContent: string; templates: Partial<PersonaTemplateData>[] } {
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
    .replace(/\s*\[PERSONA_TEMPLATE\][\s\S]*?\[\/PERSONA_TEMPLATE\]\s*/g, ' ')
    .trim();

  // Strip incomplete blocks mid-stream
  if (cleanContent.includes('[PERSONA_TEMPLATE]')) {
    cleanContent = cleanContent.replace(/\[PERSONA_TEMPLATE\][\s\S]*$/, '').trim();
  }

  return { cleanContent, templates };
}

/**
 * Parse [PERSONA_PLAN][...JSON array...][/PERSONA_PLAN] block from AI content.
 * Returns clean content (markup removed) and extracted persona plan entries.
 */
function parsePersonaPlan(content: string): { cleanContent: string; plan: Array<{ personaId?: string; archetype: string; archetypeRole: string }> } {
  const match = content.match(/\[PERSONA_PLAN\]([\s\S]*?)\[\/PERSONA_PLAN\]/);
  if (match) {
    const cleanContent = content.replace(/\[PERSONA_PLAN\][\s\S]*?\[\/PERSONA_PLAN\]/, '').trim();
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
  if (content.includes('[PERSONA_PLAN]')) {
    const cleanContent = content.replace(/\[PERSONA_PLAN\][\s\S]*$/, '').trim();
    return { cleanContent, plan: [] };
  }

  return { cleanContent: content, plan: [] };
}

/**
 * Parse [JOURNEY_STAGES]stage1|stage2|stage3[/JOURNEY_STAGES] markup from AI content.
 * Returns clean content and an array of stage labels to replace the grid columns.
 */
function parseJourneyStages(content: string): { cleanContent: string; stages: string[] } {
  const stages: string[] = [];
  const regex = /\[JOURNEY_STAGES\]([\s\S]*?)\[\/JOURNEY_STAGES\]/g;
  let match;
  while ((match = regex.exec(content)) !== null) {
    const inner = match[1].trim();
    const parsed = inner.split('|').map(s => s.trim()).filter(s => s.length > 0);
    if (parsed.length >= 3) {
      stages.push(...parsed);
    }
  }
  let cleanContent = content
    .replace(/\s*\[JOURNEY_STAGES\][\s\S]*?\[\/JOURNEY_STAGES\]\s*/g, ' ')
    .trim();
  // Strip incomplete blocks mid-stream
  if (cleanContent.includes('[JOURNEY_STAGES]')) {
    cleanContent = cleanContent.replace(/\[JOURNEY_STAGES\][\s\S]*$/, '').trim();
  }
  return { cleanContent, stages };
}

/**
 * Parse [HMW_CARD]{...JSON...}[/HMW_CARD] blocks from AI content.
 * Returns clean content (markup removed) and extracted HMW card data.
 */
function parseHmwCards(content: string): { cleanContent: string; cards: Partial<HmwCardData>[] } {
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
    .replace(/\s*\[HMW_CARD\][\s\S]*?\[\/HMW_CARD\]\s*/g, ' ')
    .trim();

  // Strip incomplete blocks mid-stream
  if (cleanContent.includes('[HMW_CARD]')) {
    cleanContent = cleanContent.replace(/\[HMW_CARD\][\s\S]*$/, '').trim();
  }

  return { cleanContent, cards };
}

/**
 * Parse [CONCEPT_CARD]{...JSON...}[/CONCEPT_CARD] blocks from AI content.
 * Returns clean content (markup removed) and extracted concept card data.
 */
function parseConceptCards(content: string): { cleanContent: string; cards: (Partial<ConceptCardData> & { cardIndex?: number })[] } {
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
    .replace(/\s*\[CONCEPT_CARD\][\s\S]*?\[\/CONCEPT_CARD\]\s*/g, ' ')
    .trim();

  // Strip incomplete blocks mid-stream
  if (cleanContent.includes('[CONCEPT_CARD]')) {
    cleanContent = cleanContent.replace(/\[CONCEPT_CARD\][\s\S]*$/, '').trim();
  }

  return { cleanContent, cards };
}

type MindMapNodeParsed = {
  label: string;
  theme?: string;    // Parent theme label (omitted for theme-level nodes)
  isWildCard?: boolean;
};

/**
 * Parse [MIND_MAP_NODE: Label] and [MIND_MAP_NODE: Label, Theme: Parent] markup.
 * Also supports tag format: [MIND_MAP_NODE theme="Parent" wildcard]Label[/MIND_MAP_NODE]
 * Returns clean content and extracted mind map node data.
 */
function parseMindMapNodes(content: string): { cleanContent: string; nodes: MindMapNodeParsed[] } {
  const nodes: MindMapNodeParsed[] = [];

  // Format 1: Tag pairs [MIND_MAP_NODE theme="..." wildcard?]Label[/MIND_MAP_NODE]
  const tagRegex = /\[MIND_MAP_NODE(?:\s+([^\]]*))?\](.*?)\[\/MIND_MAP_NODE\]/g;
  let match;
  while ((match = tagRegex.exec(content)) !== null) {
    const attrs = match[1] || '';
    const label = match[2].trim();
    if (!label) continue;

    const themeMatch = attrs.match(/theme\s*=\s*"([^"]+)"/i);
    const isWildCard = /wildcard/i.test(attrs);

    nodes.push({
      label,
      theme: themeMatch?.[1],
      isWildCard,
    });
  }

  // Format 2: Shorthand [MIND_MAP_NODE: Label] or [MIND_MAP_NODE: Label, Theme: Parent]
  const contentWithoutTags = content.replace(/\[MIND_MAP_NODE(?:\s+[^\]]*?)?\].*?\[\/MIND_MAP_NODE\]/g, '');
  const shorthandRegex = /\[MIND_MAP_NODE:\s*([^\]]+)\]/g;
  while ((match = shorthandRegex.exec(contentWithoutTags)) !== null) {
    const inner = match[1].trim();
    // Parse comma-separated attributes
    const parts = inner.split(',').map(s => s.trim());
    const label = parts[0];
    if (!label) continue;

    let theme: string | undefined;
    let isWildCard = false;

    for (let i = 1; i < parts.length; i++) {
      const part = parts[i];
      const themeMatch = part.match(/^Theme:\s*(.+)/i);
      if (themeMatch) theme = themeMatch[1].trim();
      if (/wild\s*card/i.test(part)) isWildCard = true;
    }

    nodes.push({ label, theme, isWildCard });
  }

  // Clean markup from content
  let cleanContent = content
    .replace(/\s*\[MIND_MAP_NODE(?:\s+[^\]]*?)?\].*?\[\/MIND_MAP_NODE\]\s*/g, ' ')
    .replace(/\s*\[MIND_MAP_NODE:\s*[^\]]+\]\s*/g, ' ')
    .trim();

  // Strip incomplete tags mid-stream
  if (cleanContent.includes('[MIND_MAP_NODE')) {
    cleanContent = cleanContent.replace(/\[MIND_MAP_NODE[^\]]*$/, '').trim();
  }

  return { cleanContent, nodes };
}

interface ChatPanelProps {
  stepOrder: number;
  sessionId: string;
  workshopId: string;
  initialMessages?: UIMessage[];
  onMessageCountChange?: (count: number) => void;
  subStep?: 'mind-mapping' | 'crazy-eights' | 'idea-selection' | 'brain-rewriting';
  showStepConfirm?: boolean;
  onStepConfirm?: () => void;
  onStepRevise?: () => void;
  stepConfirmLabel?: string;
}

export function ChatPanel({ stepOrder, sessionId, workshopId, initialMessages, onMessageCountChange, subStep, showStepConfirm, onStepConfirm, onStepRevise, stepConfirmLabel }: ChatPanelProps) {
  const step = getStepByOrder(stepOrder);
  const storeApi = useCanvasStoreApi();
  const addStickyNote = useCanvasStore((state) => state.addStickyNote);
  const updateStickyNote = useCanvasStore((state) => state.updateStickyNote);
  const deleteStickyNote = useCanvasStore((state) => state.deleteStickyNote);
  const setCluster = useCanvasStore((state) => state.setCluster);
  const batchUpdatePositions = useCanvasStore((state) => state.batchUpdatePositions);
  const stickyNotes = useCanvasStore((state) => state.stickyNotes);
  const gridColumns = useCanvasStore((state) => state.gridColumns);
  const replaceGridColumns = useCanvasStore((state) => state.replaceGridColumns);
  const drawingNodes = useCanvasStore((state) => state.drawingNodes);
  const mindMapNodes = useCanvasStore((state) => state.mindMapNodes);
  const mindMapEdges = useCanvasStore((state) => state.mindMapEdges);
  const addMindMapNode = useCanvasStore((state) => state.addMindMapNode);
  const crazy8sSlots = useCanvasStore((state) => state.crazy8sSlots);
  const conceptCards = useCanvasStore((state) => state.conceptCards);
  const updateConceptCard = useCanvasStore((state) => state.updateConceptCard);
  const personaTemplates = useCanvasStore((state) => state.personaTemplates);
  const addPersonaTemplate = useCanvasStore((state) => state.addPersonaTemplate);
  const updatePersonaTemplate = useCanvasStore((state) => state.updatePersonaTemplate);
  const hmwCards = useCanvasStore((state) => state.hmwCards);
  const addHmwCard = useCanvasStore((state) => state.addHmwCard);
  const updateHmwCard = useCanvasStore((state) => state.updateHmwCard);
  const isDirty = useCanvasStore((state) => state.isDirty);
  const markClean = useCanvasStore((state) => state.markClean);
  const setHighlightedCell = useCanvasStore((state) => state.setHighlightedCell);
  const setPendingFitView = useCanvasStore((state) => state.setPendingFitView);
  const pendingHmwChipSelection = useCanvasStore((state) => state.pendingHmwChipSelection);
  const setPendingHmwChipSelection = useCanvasStore((state) => state.setPendingHmwChipSelection);
  const selectedStickyNoteIds = useCanvasStore((state) => state.selectedStickyNoteIds);
  const messagesEndRef = React.useRef<HTMLDivElement>(null);
  const scrollContainerRef = React.useRef<HTMLDivElement>(null);
  const inputRef = React.useRef<HTMLTextAreaElement>(null);
  const hasAutoStarted = React.useRef(false);
  const hasScrolledOnMount = React.useRef(false);
  const countdownRef = React.useRef<NodeJS.Timeout | null>(null);
  const scrollIdleTimer = React.useRef<NodeJS.Timeout | null>(null);
  const [inputValue, setInputValue] = React.useState('');
  const [suggestions, setSuggestions] = React.useState<string[]>([]);
  const [justConfirmed, setJustConfirmed] = React.useState(false);
  const [rateLimitInfo, setRateLimitInfo] = React.useState<{ retryAfter: number } | null>(null);
  const [streamError, setStreamError] = React.useState(false);
  const [quickAck, setQuickAck] = React.useState<string | null>(null);
  const [addedMessageIds, setAddedMessageIds] = React.useState<Set<string>>(() => new Set());
  const [addedItemTexts, setAddedItemTexts] = React.useState<Set<string>>(() => new Set());
  const [hasThemeSorted, setHasThemeSorted] = React.useState(false);
  const [showSortInstructions, setShowSortInstructions] = React.useState(false);
  const [personaOptions, setPersonaOptions] = React.useState<{ name: string; description: string }[]>([]);
  const [personaSelections, setPersonaSelections] = React.useState<Set<string>>(() => new Set());
  const [personaSelectConfirmed, setPersonaSelectConfirmed] = React.useState(false);
  const [suggestionsExpanded, setSuggestionsExpanded] = React.useState(false);
  const [customPersonaInput, setCustomPersonaInput] = React.useState('');
  const [personaSelectMessageId, setPersonaSelectMessageId] = React.useState<string | null>(null);
  const [interviewMode, setInterviewMode] = React.useState<'synthetic' | 'real' | null>(null);
  const [interviewModeMessageId, setInterviewModeMessageId] = React.useState<string | null>(null);
  const [readyToCompile, setReadyToCompile] = React.useState(false);
  const [personasDone, setPersonasDone] = React.useState(false);

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
    if (!s.isDirty) return;
    await saveCanvasState(workshopId, step.id, {
      stickyNotes: s.stickyNotes,
      ...(s.gridColumns.length > 0 ? { gridColumns: s.gridColumns } : {}),
      ...(s.drawingNodes.length > 0 ? { drawingNodes: s.drawingNodes } : {}),
      ...(s.mindMapNodes.length > 0 ? { mindMapNodes: s.mindMapNodes } : {}),
      ...(s.mindMapEdges.length > 0 ? { mindMapEdges: s.mindMapEdges } : {}),
      ...(s.crazy8sSlots.length > 0 ? { crazy8sSlots: s.crazy8sSlots } : {}),
      ...(s.conceptCards.length > 0 ? { conceptCards: s.conceptCards } : {}),
      ...(s.personaTemplates.length > 0 ? { personaTemplates: s.personaTemplates } : {}),
      ...(s.hmwCards.length > 0 ? { hmwCards: s.hmwCards } : {}),
    });
    s.markClean();
  }, [isCanvasStep, workshopId, step.id, storeApi]);

  // One-shot flush: persist skeleton cards to DB immediately on mount
  // (before user sends any message). Fires once when isDirty first becomes true
  // after mount — triggered by the skeleton sync in canvas-store-provider.
  const hasInitialFlushed = React.useRef(false);
  React.useEffect(() => {
    if (!hasInitialFlushed.current && isDirty && isCanvasStep) {
      hasInitialFlushed.current = true;
      flushCanvasToDb();
    }
  }, [isDirty, isCanvasStep, flushCanvasToDb]);

  const transport = React.useMemo(
    () =>
      new DefaultChatTransport({
        api: '/api/chat',
        body: { sessionId, stepId: step.id, workshopId, subStep, selectedStickyNoteIds },
      }),
    [sessionId, step.id, workshopId, subStep, selectedStickyNoteIds]
  );

  const { messages, sendMessage, status, setMessages } = useChat({
    transport,
    messages: initialMessages,
    onError: (error) => {
      // Check if this is a rate limit error from our API
      const errorStr = error?.message || '';
      if (errorStr.includes('rate_limit_exceeded') || errorStr.includes('429')) {
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
      }
    },
  });

  const isLoading = status === 'streaming' || status === 'submitted';

  // Auto-save messages every 2 seconds (debounced) with 10s maxWait
  useAutoSave(sessionId, step.id, messages);

  // Report live message count to parent
  React.useEffect(() => {
    onMessageCountChange?.(messages.length);
  }, [messages.length, onMessageCountChange]);

  // Fire arc phase transition after each AI response completes
  React.useEffect(() => {
    // Only trigger after ready state with at least one message
    if (status === 'ready' && messages.length > 0) {
      // Fire-and-forget arc phase transition based on message count
      fetch('/api/chat/arc-transition', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
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
    if (status === 'ready' && messages.length > 0) {
      const lastMsg = messages[messages.length - 1];
      if (lastMsg.role === 'assistant') {
        const textParts = lastMsg.parts?.filter((p) => p.type === 'text') || [];
        const content = textParts.map((p) => p.text).join('\n');
        const { suggestions: parsed } = parseSuggestions(content);
        setSuggestions(parsed);
        setSuggestionsExpanded(false);
      }
    }
    // Clear suggestions while AI is responding
    if (status === 'streaming' || status === 'submitted') {
      setSuggestions(prev => prev.length > 0 ? [] : prev);
    }
  }, [status, messages]);

  // Extract persona select options from last assistant message (Step 3 only)
  React.useEffect(() => {
    if (step.id !== 'user-research' || personaSelectConfirmed) return;

    if (status === 'ready' && messages.length > 0) {
      const lastMsg = messages[messages.length - 1];
      if (lastMsg.role === 'assistant') {
        const textParts = lastMsg.parts?.filter((p) => p.type === 'text') || [];
        const content = textParts.map((p) => p.text).join('\n');
        const { personaOptions: parsed } = parsePersonaSelect(content);
        if (parsed.length > 0) {
          setPersonaOptions(parsed);
          setPersonaSelectMessageId(lastMsg.id);
        }
      }
    }
    // Clear persona options while AI is responding
    if (status === 'streaming' || status === 'submitted') {
      setPersonaOptions(prev => prev.length > 0 ? [] : prev);
    }
  }, [status, messages, step.id, personaSelectConfirmed]);

  // Extract interview mode options from last assistant message (Step 3 only, before mode is chosen)
  React.useEffect(() => {
    if (step.id !== 'user-research' || interviewMode !== null) return;

    if (status === 'ready' && messages.length > 0) {
      const lastMsg = messages[messages.length - 1];
      if (lastMsg.role === 'assistant') {
        const textParts = lastMsg.parts?.filter((p) => p.type === 'text') || [];
        const content = textParts.map((p) => p.text).join('\n');
        const { modeOptions } = parseInterviewMode(content);
        if (modeOptions.length > 0) {
          setInterviewModeMessageId(lastMsg.id);
        }
      }
    }
  }, [status, messages, step.id, interviewMode]);

  // Detect confirmed persona selection + interview mode from historical messages (persistence across refresh)
  const hasCheckedPersonaHistory = React.useRef(false);
  React.useEffect(() => {
    if (hasCheckedPersonaHistory.current || step.id !== 'user-research') return;
    hasCheckedPersonaHistory.current = true;

    for (const msg of messages) {
      if (msg.role !== 'user') continue;
      const textParts = msg.parts?.filter((p) => p.type === 'text') || [];
      const content = textParts.map((p) => p.text).join('');
      if (content.startsWith("I'd like to interview these personas:")) {
        setPersonaSelectConfirmed(true);
      }
      if (content.includes("I'd like to use AI Interviews")) {
        setInterviewMode('synthetic');
      }
      if (content.includes("I'd like to use Real Interviews")) {
        setInterviewMode('real');
      }
      if (content.includes('[COMPILE_READY]')) {
        setReadyToCompile(true);
      }
    }
  }, [messages, step.id]);

  // Detect "All personas look good — let's move on" from user messages (persona step only)
  const hasCheckedPersonaDoneHistory = React.useRef(false);
  React.useEffect(() => {
    if (step.id !== 'persona' || personasDone) return;

    // Check historical messages on first load
    if (!hasCheckedPersonaDoneHistory.current) {
      hasCheckedPersonaDoneHistory.current = true;
      for (const msg of messages) {
        if (msg.role !== 'user') continue;
        const textParts = msg.parts?.filter((p) => p.type === 'text') || [];
        const content = textParts.map((p) => p.text).join('');
        if (/personas look good|let'?s move on|I'm done with personas/i.test(content)) {
          setPersonasDone(true);
          return;
        }
      }
    }

    // Also detect live messages as they come in
    if (status === 'ready' && messages.length > 0) {
      const lastUserMsg = [...messages].reverse().find(m => m.role === 'user');
      if (lastUserMsg) {
        const textParts = lastUserMsg.parts?.filter((p) => p.type === 'text') || [];
        const content = textParts.map((p) => p.text).join('');
        if (/personas look good|let'?s move on|I'm done with personas/i.test(content)) {
          setPersonasDone(true);
        }
      }
    }
  }, [messages, step.id, status, personasDone]);

  // Initialize addedMessageIds from history — mark ALL historical assistant messages as processed
  // when canvas already has sticky notes (restored from DB). The saved canvas state is the source
  // of truth — we must NOT re-process historical [CANVAS_ITEM], [CLUSTER], or [THEME_SORT]
  // markers, as that would overwrite user-arranged positions with recalculated layouts.
  const hasInitializedAddedIds = React.useRef(false);
  React.useEffect(() => {
    if (hasInitializedAddedIds.current || !isCanvasStep || (stickyNotes.length === 0 && personaTemplates.length === 0 && hmwCards.length === 0 && mindMapNodes.length === 0 && conceptCards.length === 0)) return;
    hasInitializedAddedIds.current = true;

    const ids = new Set<string>();
    let hadHistoricalSort = false;
    for (const msg of messages) {
      if (msg.role !== 'assistant') continue;
      const textParts = msg.parts?.filter((p) => p.type === 'text') || [];
      const content = textParts.map((p) => p.text).join('\n');
      const { canvasItems } = parseCanvasItems(content);
      const { clusters } = parseClusterSuggestions(content);
      const { shouldSort } = parseThemeSortTrigger(content);
      const { deleteTexts } = parseCanvasDeletes(content);
      const { templates: personaTemplateParsed } = parsePersonaTemplates(content);
      const { plan: personaPlanParsed } = parsePersonaPlan(content);
      const { stages: journeyStages } = parseJourneyStages(content);
      const { cards: hmwCardParsed } = parseHmwCards(content);
      const { nodes: mindMapNodesParsed } = parseMindMapNodes(content);
      const { cards: conceptCardParsed } = parseConceptCards(content);
      if (shouldSort) hadHistoricalSort = true;
      // Mark any message that contains canvas-modifying markup as already processed
      if (canvasItems.length > 0 || clusters.length > 0 || shouldSort || deleteTexts.length > 0 || personaTemplateParsed.length > 0 || personaPlanParsed.length > 0 || journeyStages.length > 0 || hmwCardParsed.length > 0 || mindMapNodesParsed.length > 0 || conceptCardParsed.length > 0) {
        ids.add(msg.id);
      }
    }
    if (hadHistoricalSort) setHasThemeSorted(true);
    if (ids.size > 0) {
      setAddedMessageIds(ids);
    }
    // Pre-populate addedItemTexts from existing board content so historical chips show as green
    const existingTexts = new Set<string>();
    for (const p of stickyNotes) {
      if (!p.type || p.type === 'stickyNote') {
        existingTexts.add(p.text.trim().toLowerCase());
      }
    }
    if (existingTexts.size > 0) {
      setAddedItemTexts(existingTexts);
    }
  }, [messages, isCanvasStep, stickyNotes.length, personaTemplates.length, hmwCards.length, mindMapNodes.length, conceptCards.length]);

  // Handle adding AI-suggested canvas items to the whiteboard
  const handleAddToWhiteboard = React.useCallback((messageId: string, canvasItems: CanvasItemParsed[]) => {
    if (addedMessageIds.has(messageId)) return; // Guard against double-click

    // Read latest state directly from Zustand store (not stale React closure).
    // Critical when replaceGridColumns() runs in the same effect cycle as this
    // callback — the React hook value would be stale, but Zustand set() is synchronous.
    const latestGridColumns = storeApi.getState().gridColumns;
    const latestStickyNotes = storeApi.getState().stickyNotes;

    // Build dynamic gridConfig from store columns for journey-mapping
    const stepConfig = getStepCanvasConfig(step.id);
    const baseGridConfig = stepConfig.gridConfig;
    const dynamicGridConfig = baseGridConfig && latestGridColumns.length > 0
      ? { ...baseGridConfig, columns: latestGridColumns }
      : baseGridConfig;

    // Add each item to canvas with computed position, skipping duplicates
    let currentStickyNotes = [...latestStickyNotes];
    for (const item of canvasItems) {
      // Duplicate guard: skip if an item with the same text (case-insensitive) already exists
      const normalizedText = item.text.trim().toLowerCase();
      const alreadyExists = currentStickyNotes.some(
        (p) => (!p.type || p.type === 'stickyNote') && p.text.trim().toLowerCase() === normalizedText
      );
      if (alreadyExists) continue;

      const { position, quadrant, cellAssignment } = computeCanvasPosition(
        step.id,
        { quadrant: item.quadrant, ring: item.ring, row: item.row, col: item.col, category: item.category, cluster: item.cluster },
        currentStickyNotes,
        dynamicGridConfig,
      );

      // Color priority: explicit color attr > category-specific > zone-specific > grid green > default yellow
      const VALID_COLORS = new Set(['yellow', 'pink', 'blue', 'green', 'orange', 'red']);
      const color = (item.color && VALID_COLORS.has(item.color) ? item.color as StickyNoteColor : null)
        || (item.category && CATEGORY_COLORS[item.category])
        || (item.quadrant && ZONE_COLORS[item.quadrant])
        || (item.isGridItem ? 'green' : 'yellow');

      const { width: itemWidth, height: itemHeight } = computeStickyNoteSize(item.text);
      const newStickyNote = {
        text: item.text,
        position,
        width: itemWidth,
        height: itemHeight,
        color,
        quadrant,
        cellAssignment,
        cluster: item.cluster,
      };

      addStickyNote(newStickyNote);

      // Highlight target cell for grid items
      if (item.isGridItem && cellAssignment && dynamicGridConfig) {
        const rowIndex = dynamicGridConfig.rows.findIndex(r => r.id === cellAssignment.row);
        const colIndex = dynamicGridConfig.columns.findIndex(c => c.id === cellAssignment.col);
        if (rowIndex !== -1 && colIndex !== -1) {
          setHighlightedCell({ row: rowIndex, col: colIndex });
        }
      }

      currentStickyNotes = [...currentStickyNotes, { ...newStickyNote, id: 'pending' }];
    }

    setAddedMessageIds(prev => new Set(prev).add(messageId));
    // Don't shift viewport for ring-based canvases — preserve admin default viewport
    const stepConfigForFitView = getStepCanvasConfig(step.id);
    if (!stepConfigForFitView.hasRings) {
      setPendingFitView(true);
    }
  }, [addedMessageIds, step.id, storeApi, addStickyNote, setHighlightedCell, setPendingFitView]);

  // Add a single canvas item to the board (click-to-add from chat chip)
  const handleAddSingleItem = React.useCallback((item: CanvasItemParsed) => {
    const normalizedText = item.text.trim().toLowerCase();
    if (addedItemTexts.has(normalizedText)) return;

    const latestStickyNotes = storeApi.getState().stickyNotes;
    // Duplicate guard
    const alreadyExists = latestStickyNotes.some(
      (p) => (!p.type || p.type === 'stickyNote') && p.text.trim().toLowerCase() === normalizedText
    );
    if (alreadyExists) {
      setAddedItemTexts(prev => new Set(prev).add(normalizedText));
      return;
    }

    const stepConfig = getStepCanvasConfig(step.id);
    const baseGridConfig = stepConfig.gridConfig;
    const latestGridColumns = storeApi.getState().gridColumns;
    const dynamicGridConfig = baseGridConfig && latestGridColumns.length > 0
      ? { ...baseGridConfig, columns: latestGridColumns }
      : baseGridConfig;

    const { position, quadrant, cellAssignment } = computeCanvasPosition(
      step.id,
      { quadrant: item.quadrant, ring: item.ring, row: item.row, col: item.col, category: item.category, cluster: item.cluster },
      latestStickyNotes,
      dynamicGridConfig,
    );

    const VALID_COLORS = new Set(['yellow', 'pink', 'blue', 'green', 'orange', 'red']);
    const color = (item.color && VALID_COLORS.has(item.color) ? item.color as StickyNoteColor : null)
      || (item.category && CATEGORY_COLORS[item.category])
      || (item.quadrant && ZONE_COLORS[item.quadrant])
      || (item.isGridItem ? 'green' : 'yellow');

    const { width: itemWidth, height: itemHeight } = computeStickyNoteSize(item.text);
    addStickyNote({
      text: item.text,
      position,
      width: itemWidth,
      height: itemHeight,
      color,
      quadrant,
      cellAssignment,
      cluster: item.cluster,
    });

    setAddedItemTexts(prev => new Set(prev).add(normalizedText));
    // Don't shift viewport for ring-based canvases — items land within the rings
    // which are already visible in the admin-configured default viewport
    if (!stepConfig.hasRings) {
      setPendingFitView(true);
    }
  }, [addedItemTexts, step.id, storeApi, addStickyNote, setPendingFitView]);

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
    if (status !== 'ready' || !isCanvasStep || messages.length === 0) return;
    // Wait for historical message initialization to complete before processing.
    // Without this guard, on the same render cycle where stickyNotes load from DB,
    // this effect could fire before addedMessageIds is populated, causing
    // historical messages to be re-processed and overwriting saved positions.
    if ((stickyNotes.length > 0 || personaTemplates.length > 0 || hmwCards.length > 0 || mindMapNodes.length > 0 || conceptCards.length > 0) && !hasInitializedAddedIds.current) return;
    const lastMsg = messages[messages.length - 1];
    if (lastMsg.role !== 'assistant') return;
    if (addedMessageIds.has(lastMsg.id)) return;

    const textParts = lastMsg.parts?.filter((p) => p.type === 'text') || [];
    const content = textParts.map((p) => p.text).join('\n');
    const { canvasItems } = parseCanvasItems(content);
    const { shouldSort } = parseThemeSortTrigger(content);
    const { deleteTexts } = parseCanvasDeletes(content);
    const { clusters } = parseClusterSuggestions(content);
    const { templates: personaTemplateParsed } = parsePersonaTemplates(content);
    const { plan: personaPlanParsed } = parsePersonaPlan(content);
    const { stages: journeyStages } = parseJourneyStages(content);
    const { cards: hmwCardParsed } = parseHmwCards(content);
    const { nodes: mindMapNodesParsed } = parseMindMapNodes(content);
    const { cards: conceptCardParsed } = parseConceptCards(content);

    // Process persona plan — create skeleton cards for each archetype
    if (personaPlanParsed.length > 0 && step.id === 'persona') {
      const latestTemplates = storeApi.getState().personaTemplates;
      const PERSONA_CARD_WIDTH = 680;
      const PERSONA_GAP = 40;
      let createdCount = 0;
      for (const entry of personaPlanParsed) {
        // Guard: don't create if an existing card already has this personaId or archetype
        const alreadyExists = latestTemplates.some(t =>
          (entry.personaId && t.personaId === entry.personaId) || t.archetype === entry.archetype
        );
        if (alreadyExists) continue;
        const offsetX = (latestTemplates.length + createdCount) * (PERSONA_CARD_WIDTH + PERSONA_GAP);
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

    // Process journey stage replacements — update grid columns to match template
    if (journeyStages.length >= 3 && step.id === 'journey-mapping') {
      const newColumns = journeyStages.map((label) => ({
        id: label.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, ''),
        label,
        width: 240,
      }));
      replaceGridColumns(newColumns);
    }

    // Template-targeted items: update existing template sticky notes by key
    const templateItems = canvasItems.filter(item => item.templateKey);
    if (templateItems.length > 0) {
      const currentStickyNotes = storeApi.getState().stickyNotes;
      console.log('[template-target] Found', templateItems.length, 'template items. Store has', currentStickyNotes.filter(p => p.templateKey).length, 'template sticky notes');
      for (const item of templateItems) {
        const target = currentStickyNotes.find(p => p.templateKey === item.templateKey);
        if (target) {
          console.log('[template-target] Updating', item.templateKey, '→', item.text.slice(0, 40));
          updateStickyNote(target.id, { text: item.text });
        } else {
          console.log('[template-target] Template not found for key:', item.templateKey, '— creating regular sticky note');
          // Template not found (user deleted it) — fall through to normal add
          handleAddSingleItem(item);
        }
      }
    }

    // Grid items (journey mapping) auto-add immediately; regular sticky notes use click-to-add
    const nonTemplateCanvasItems = canvasItems.filter(item => !item.templateKey);
    const gridItems = nonTemplateCanvasItems.filter(item => item.isGridItem);
    if (gridItems.length > 0 && step.id !== 'persona' && step.id !== 'concept') {
      handleAddToWhiteboard(lastMsg.id, gridItems);
    }

    // User-research: auto-add all canvas items (persona cards + interview insights)
    if (step.id === 'user-research' && nonTemplateCanvasItems.length > 0) {
      handleAddToWhiteboard(lastMsg.id, nonTemplateCanvasItems);
    }

    // Process persona template blocks — match by name or fill blank template
    if (personaTemplateParsed.length > 0) {
      const latestTemplates = storeApi.getState().personaTemplates;
      // Merge all parsed blocks into a single update (AI may split across blocks)
      const merged = personaTemplateParsed.reduce<Partial<PersonaTemplateData>>(
        (acc, t) => ({ ...acc, ...t }),
        {}
      );

      // Find matching template: personaId (strongest), name, archetype, or blank fallback
      const matchByPersonaId = merged.personaId
        ? latestTemplates.find(t => t.personaId === merged.personaId)
        : undefined;
      const matchByName = !matchByPersonaId && merged.name
        ? latestTemplates.find(t => t.name === merged.name)
        : undefined;
      const matchByArchetype = !matchByPersonaId && !matchByName && merged.archetype
        ? latestTemplates.find(t => t.archetype === merged.archetype)
        : undefined;
      const blankTemplate = !matchByPersonaId && !matchByName && !matchByArchetype
        ? latestTemplates.find(t => !t.name && !t.archetype)
        : undefined;
      const target = matchByPersonaId || matchByName || matchByArchetype || blankTemplate;

      if (target) {
        updatePersonaTemplate(target.id, merged);
      } else {
        // New persona — place to the right of existing templates
        const PERSONA_CARD_WIDTH = 680;
        const PERSONA_GAP = 40;
        const offsetX = latestTemplates.length * (PERSONA_CARD_WIDTH + PERSONA_GAP);
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
      const HMW_FIELD_VALUE_KEYS = ['givenThat', 'persona', 'immediateGoal', 'deeperGoal'];

      for (const parsed of hmwCardParsed) {
        const targetIndex = parsed.cardIndex ?? 0;
        const existing = latestHmwCards.find(c => (c.cardIndex ?? 0) === targetIndex);

        if (existing) {
          const updates: Partial<HmwCardData> = { ...parsed };

          // During progressive mode (card is 'active'), strip field value overrides.
          // AI can send suggestions and fullStatement, but cannot set field values —
          // only chip selections set those. Once card reaches 'filled', allow full edits.
          if (existing.cardState === 'active') {
            for (const key of HMW_FIELD_VALUE_KEYS) {
              delete (updates as Record<string, unknown>)[key];
            }
          }

          if (existing.cardState === 'skeleton') {
            updates.cardState = 'active';
          }
          // Auto-detect 'filled' state (existing fields + any new updates)
          const merged = { ...existing, ...updates };
          if (merged.givenThat && merged.persona && merged.immediateGoal && merged.deeperGoal) {
            updates.cardState = 'filled';
          }
          updateHmwCard(existing.id, updates);
        } else {
          // Create a new card (for alternative HMW statements)
          addHmwCard({
            position: { x: (targetIndex || 0) * 780, y: 0 },
            cardState: 'active',
            cardIndex: targetIndex,
            ...parsed,
          });
        }
      }
      setPendingFitView(true);
    }

    // Process AI-requested deletions
    if (deleteTexts.length > 0) {
      const latestStickyNotes = storeApi.getState().stickyNotes;
      for (const delText of deleteTexts) {
        const lower = delText.toLowerCase();
        const match = latestStickyNotes.find(p =>
          p.text.toLowerCase() === lower && (!p.type || p.type === 'stickyNote')
        );
        if (match) deleteStickyNote(match.id);
      }
    }

    // Process AI-suggested clusters
    if (clusters.length > 0) {
      const latestStickyNotes = storeApi.getState().stickyNotes;
      const clusterUpdates: Array<{ id: string; position: { x: number; y: number }; cellAssignment?: { row: string; col: string } }> = [];

      for (const cluster of clusters) {
        const parentLower = cluster.parent.toLowerCase();
        const parentStickyNote = latestStickyNotes.find(p =>
          p.text.toLowerCase() === parentLower && (!p.type || p.type === 'stickyNote')
        );
        const childIds: string[] = [];
        const childStickyNotes: typeof latestStickyNotes = [];
        for (const childText of cluster.children) {
          const childLower = childText.toLowerCase();
          const match = latestStickyNotes.find(p =>
            p.text.toLowerCase() === childLower && (!p.type || p.type === 'stickyNote')
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
                ...(parentStickyNote.cellAssignment ? { cellAssignment: parentStickyNote.cellAssignment } : {}),
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

    // Process mind map nodes — add themes and ideas to mind map canvas
    if (mindMapNodesParsed.length > 0 && step.id === 'ideation') {
      const latestNodes = storeApi.getState().mindMapNodes;
      const latestEdges = storeApi.getState().mindMapEdges;
      const rootNode = latestNodes.find((n) => n.isRoot);
      const rootPos = rootNode?.position || { x: 0, y: 0 };

      // Build a label→node map for theme matching
      const nodeLabelMap = new Map<string, MindMapNodeState>();
      for (const n of latestNodes) {
        nodeLabelMap.set(n.label.toLowerCase(), n);
      }

      const SNAP = 20;
      const snap = (v: number) => Math.round(v / SNAP) * SNAP;

      for (const parsed of mindMapNodesParsed) {
        // Skip duplicate labels
        if (nodeLabelMap.has(parsed.label.toLowerCase())) continue;

        if (parsed.theme) {
          // This is a child idea under a theme
          const parentNode = nodeLabelMap.get(parsed.theme.toLowerCase());
          if (!parentNode) continue; // Theme doesn't exist yet, skip

          const parentPos = parentNode.position || { x: 0, y: 0 };
          const siblingCount = latestEdges.filter((e) => e.source === parentNode.id).length;

          // Fan children around parent's direction from root
          const dirAngle = Math.atan2(parentPos.y - rootPos.y, parentPos.x - rootPos.x);
          const spread = Math.PI / 3;
          const startAngle = dirAngle - spread / 2;
          const angleStep = siblingCount > 0 ? spread / siblingCount : 0;
          const childAngle = siblingCount === 0 ? dirAngle : startAngle + angleStep * siblingCount;
          const CHILD_DIST = 220;

          const newId = crypto.randomUUID();
          const newNode: MindMapNodeState = {
            id: newId,
            label: parsed.label,
            themeColorId: parentNode.themeColorId,
            themeColor: parentNode.themeColor,
            themeBgColor: parentNode.themeBgColor,
            isRoot: false,
            level: parentNode.level + 1,
            parentId: parentNode.id,
            position: {
              x: snap(parentPos.x + CHILD_DIST * Math.cos(childAngle)),
              y: snap(parentPos.y + CHILD_DIST * Math.sin(childAngle)),
            },
          };
          const newEdge: MindMapEdgeState = {
            id: `${parentNode.id}-${newId}`,
            source: parentNode.id,
            target: newId,
            themeColor: parentNode.themeColor,
          };

          addMindMapNode(newNode, newEdge);
          nodeLabelMap.set(parsed.label.toLowerCase(), newNode);
          // Update latestEdges for sibling count accuracy
          latestEdges.push(newEdge);
        } else {
          // This is a theme-level node (level 1, child of root)
          const existingLevel1 = latestNodes.filter((n) => n.level === 1).length +
            [...nodeLabelMap.values()].filter((n) => n.level === 1 && !latestNodes.includes(n)).length;
          const colorIndex = existingLevel1 % THEME_COLORS.length;
          const themeColor = THEME_COLORS[colorIndex];

          // Place radially around root
          const totalThemes = existingLevel1 + 1;
          const angle = (2 * Math.PI * existingLevel1) / totalThemes - Math.PI / 2;
          const RADIUS = 350;

          const newId = crypto.randomUUID();
          const newNode: MindMapNodeState = {
            id: newId,
            label: parsed.label,
            themeColorId: themeColor.id,
            themeColor: themeColor.color,
            themeBgColor: themeColor.bgColor,
            isRoot: false,
            level: 1,
            parentId: 'root',
            position: {
              x: snap(rootPos.x + RADIUS * Math.cos(angle)),
              y: snap(rootPos.y + RADIUS * Math.sin(angle)),
            },
          };
          const newEdge: MindMapEdgeState = {
            id: `root-${newId}`,
            source: 'root',
            target: newId,
            themeColor: themeColor.color,
          };

          addMindMapNode(newNode, newEdge);
          nodeLabelMap.set(parsed.label.toLowerCase(), newNode);
          latestEdges.push(newEdge);
        }
      }
      setPendingFitView(true);
    }

    // Process concept card blocks — merge into existing skeleton cards
    if (conceptCardParsed.length > 0 && step.id === 'concept') {
      const latestConceptCards = storeApi.getState().conceptCards;

      for (const parsed of conceptCardParsed) {
        const targetIndex = parsed.cardIndex ?? 0;
        const existing = latestConceptCards.find(c => (c.cardIndex ?? 0) === targetIndex);

        if (existing) {
          const updates: Partial<ConceptCardData> = { ...parsed };

          // Transition skeleton → active on first AI update
          if (existing.cardState === 'skeleton') {
            updates.cardState = 'active';
          }

          // Auto-detect 'filled' state: check if all major sections have content
          const merged = { ...existing, ...updates };
          const hasPitch = !!merged.elevatorPitch;
          const hasUsp = !!merged.usp;
          const hasSwot = merged.swot?.strengths?.some(s => !!s);
          const hasFeasibility = merged.feasibility?.technical?.score > 0;
          const hasBillboard = !!merged.billboardHero?.headline;
          if (hasPitch && hasUsp && hasSwot && hasFeasibility && hasBillboard) {
            updates.cardState = 'filled';
          }

          updateConceptCard(existing.id, updates);
        }
      }
      setPendingFitView(true);
    }

    // Mark as processed if we did any work (avoid re-processing non-sticky note items)
    const hasNonStickyNoteWork = deleteTexts.length > 0 || clusters.length > 0 || personaTemplateParsed.length > 0 || personaPlanParsed.length > 0 || journeyStages.length > 0 || hmwCardParsed.length > 0 || mindMapNodesParsed.length > 0 || conceptCardParsed.length > 0 || gridItems.length > 0 || templateItems.length > 0;
    const hasRegularCanvasItems = nonTemplateCanvasItems.some(item => !item.isGridItem);
    if (hasNonStickyNoteWork || (hasRegularCanvasItems && !addedMessageIds.has(lastMsg.id))) {
      setAddedMessageIds(prev => new Set(prev).add(lastMsg.id));
      // Flush to DB so the next API request sees the items just added
      flushCanvasToDb();
    }

    // If AI triggered [THEME_SORT], reorganize after items are added
    if (shouldSort) {
      setHasThemeSorted(true);
      setTimeout(() => {
        const latestStickyNotes = storeApi.getState().stickyNotes;
        const updates = computeThemeSortPositions(latestStickyNotes, step.id);
        if (updates.length > 0) {
          batchUpdatePositions(updates);
          setPendingFitView(true);
        }
      }, 300); // Short delay to ensure new items are in store
    }
  }, [status, messages, isCanvasStep, addedMessageIds, handleAddToWhiteboard, handleAddSingleItem, batchUpdatePositions, storeApi, step.id, setPendingFitView, deleteStickyNote, updateStickyNote, setCluster, addPersonaTemplate, updatePersonaTemplate, replaceGridColumns, addHmwCard, updateHmwCard, addMindMapNode, updateConceptCard, conceptCards.length, flushCanvasToDb]);

  // Clear stream error on successful completion
  React.useEffect(() => {
    if (status === 'ready') {
      setStreamError(false);
      // Don't clear rateLimitInfo here — let the countdown finish
    }
  }, [status]);

  // Stream timeout detection — resets on actual content progress, not just message count.
  // Tracks the last message's text length so the timer resets as tokens stream in.
  const streamingContentLength = React.useMemo(() => {
    if (status !== 'streaming' || messages.length === 0) return 0;
    const lastMsg = messages[messages.length - 1];
    if (lastMsg.role !== 'assistant') return 0;
    const textParts = lastMsg.parts?.filter((p) => p.type === 'text') || [];
    return textParts.reduce((sum, p) => sum + p.text.length, 0);
  }, [status, messages]);

  React.useEffect(() => {
    if (status !== 'streaming') return;
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
      givenThat: 'Given that',
      persona: 'how might we (help)',
      immediateGoal: 'do/be/feel/achieve',
      deeperGoal: 'So they can',
    };
    const fieldLabel = fieldLabels[field] || field;

    setQuickAck(getRandomAck());

    (async () => {
      try {
        await flushCanvasToDb();
        sendMessage({
          role: 'user',
          parts: [{ type: 'text', text: `For "${fieldLabel}": ${value}` }],
        });
      } catch (err) {
        console.error('Failed to send HMW chip selection:', err);
      }
    })();
  }, [pendingHmwChipSelection, isLoading, setPendingHmwChipSelection, flushCanvasToDb, sendMessage]);

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
      container.classList.add('is-scrolling');
      if (scrollIdleTimer.current) clearTimeout(scrollIdleTimer.current);
      scrollIdleTimer.current = setTimeout(() => {
        container.classList.remove('is-scrolling');
      }, 1500);
    };
    container.addEventListener('scroll', onScroll, { passive: true });
    return () => {
      container.removeEventListener('scroll', onScroll);
      if (scrollIdleTimer.current) clearTimeout(scrollIdleTimer.current);
    };
  }, []);

  // Re-focus input after AI response completes
  React.useEffect(() => {
    if (status === 'ready') {
      // Don't steal focus from interactive elements (buttons, canvas, other inputs)
      const active = document.activeElement;
      const isInteractive = active && (
        active.tagName === 'BUTTON' ||
        active.tagName === 'INPUT' ||
        active.tagName === 'CANVAS' ||
        active.tagName === 'SELECT' ||
        (active.tagName === 'TEXTAREA' && active !== inputRef.current)
      );
      if (!isInteractive) {
        inputRef.current?.focus();
      }
    }
  }, [status]);

  // Auto-start: send trigger message when entering a step with no prior messages
  const shouldAutoStart = !initialMessages || initialMessages.length === 0;

  // Fixed greeting shown instantly while AI generates first response
  const stepGreeting = STEP_INITIAL_GREETINGS[step.id];
  const hasAssistantMessage = messages.some(m => m.role === 'assistant');
  const showGreeting = shouldAutoStart && !!stepGreeting && !hasAssistantMessage;

  React.useEffect(() => {
    if (shouldAutoStart && messages.length === 0 && status === 'ready' && !hasAutoStarted.current) {
      hasAutoStarted.current = true;
      sendMessage({
        role: 'user',
        parts: [{ type: 'text', text: '__step_start__' }],
      });
    }
  }, [shouldAutoStart, messages.length, status, sendMessage]);

  // Helper: check if user is near bottom of scroll container
  const isNearBottom = React.useCallback(() => {
    const container = scrollContainerRef.current;
    if (!container) return true;
    const threshold = 150; // px from bottom
    return container.scrollHeight - container.scrollTop - container.clientHeight < threshold;
  }, []);

  // Auto-scroll during streaming when user is near bottom
  React.useEffect(() => {
    if (status === 'streaming' && streamingContentLength > 0 && isNearBottom()) {
      messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }
  }, [status, streamingContentLength, isNearBottom]);

  // Scroll to bottom on initial mount (after DOM paint)
  React.useEffect(() => {
    if (!hasScrolledOnMount.current && messages.length > 0) {
      // Use requestAnimationFrame to ensure DOM is painted before scrolling
      requestAnimationFrame(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'instant' });
      });
      hasScrolledOnMount.current = true;
    }
  }, [messages.length]);

  // Auto-scroll on new messages (skip if user has scrolled up)
  React.useEffect(() => {
    if (messages.length > 0 && isNearBottom()) {
      messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }
  }, [messages, isNearBottom]);

  // Handle message send
  const handleSend = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!inputValue.trim() || isLoading) return;

    // Show instant acknowledgment while AI thinks
    setQuickAck(getRandomAck());

    // Flush canvas to DB so the AI sees the latest board state
    await flushCanvasToDb();

    try {
      await sendMessage({
        role: 'user',
        parts: [{ type: 'text', text: inputValue }],
      });
    } catch (err) {
      // sendMessage can throw if useChat internal state is temporarily undefined
      // (e.g. during transport recreation when subStep changes). Log and continue —
      // the message was already shown in the UI via optimistic update.
      console.error('sendMessage error (transport may be reinitializing):', err);
      setStreamError(true);
    }
    setInputValue('');
    setSuggestions([]);
    setSuggestionsExpanded(false);
  };

  // Handle Enter to send (Shift+Enter for newline)
  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      const form = e.currentTarget.closest('form');
      if (form) form.requestSubmit();
    }
  };

  // Handle adding user message to canvas as a sticky note
  const handleAddUserMessageToCanvas = React.useCallback((text: string) => {
    const { position } = computeCanvasPosition(step.id, {}, stickyNotes);
    const { width, height } = computeStickyNoteSize(text);
    addStickyNote({
      text,
      position,
      width,
      height,
      color: 'yellow',
    });
  }, [addStickyNote, stickyNotes, step.id]);

  return (
    <div className="flex h-full flex-col">
      {/* Messages area */}
      <div className="relative flex-1 min-h-0">
        <div
          className="pointer-events-none absolute inset-x-0 top-0 z-10 h-12"
          style={{ background: 'linear-gradient(to bottom, var(--background), transparent)' }}
        />
        <div ref={scrollContainerRef} className="chat-scroll h-full overflow-y-auto p-4">
        {/* Centered AI avatar at top - scrolls off screen */}
        <div className="flex justify-center mb-6">
          <div className="flex size-10 shrink-0 items-center justify-center rounded-full bg-primary text-primary-foreground text-sm font-medium">
            AI
          </div>
        </div>

        {messages.length === 0 ? (
          // Show greeting + loading indicator while AI auto-starts
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
        ) : (
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
            {messages.filter((m) => {
              if (m.role !== 'user') return true;
              const text = m.parts?.filter((p) => p.type === 'text').map((p) => p.text).join('') || '';
              return text !== '__step_start__';
            }).map((message, index) => {
              const textParts = message.parts?.filter((part) => part.type === 'text') || [];
              const content = textParts.map((part) => part.text).join('\n');

              if (message.role === 'user') {
                // Strip internal markup tags from display
                const displayContent = content.replace(/\[STEP_CONFIRMED\]\s*/g, '').trim();
                return (
                  <div key={`${message.id}-${index}`} className="group flex items-start justify-end">
                    <div className="max-w-[80%]">
                      <div className="relative rounded-2xl bg-muted p-3 px-4 text-base text-foreground">
                        {displayContent}
                        {isCanvasStep && (
                          <button
                            onClick={() => handleAddUserMessageToCanvas(content)}
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
              const { cleanContent: noSuggestions } = parseSuggestions(content);
              const { cleanContent: noInterviewMode } = parseInterviewMode(noSuggestions);
              const { cleanContent: noPersonaSelect } = parsePersonaSelect(noInterviewMode);
              const { cleanContent: noThemeSort } = parseThemeSortTrigger(noPersonaSelect);
              const { cleanContent: noDeletes } = parseCanvasDeletes(noThemeSort);
              const { cleanContent: noClusters } = parseClusterSuggestions(noDeletes);
              const { cleanContent: noPersonaTemplates } = parsePersonaTemplates(noClusters);
              const { cleanContent: noPersonaPlan } = parsePersonaPlan(noPersonaTemplates);
              const { cleanContent: noJourneyStages } = parseJourneyStages(noPersonaPlan);
              const { cleanContent: noHmwCards } = parseHmwCards(noJourneyStages);
              const { cleanContent: noMindMapNodes } = parseMindMapNodes(noHmwCards);
              const { cleanContent: noConceptCards } = parseConceptCards(noMindMapNodes);
              const { cleanContent: noLeakedTags } = stripLeakedTags(noConceptCards);
              const { cleanContent: finalContent, canvasItems } = parseCanvasItems(noLeakedTags);
              const isPersonaSelectMessage = message.id === personaSelectMessageId;
              const isInterviewModeMessage = message.id === interviewModeMessageId;
              const personaIntro = detectPersonaIntro(content);
              // Separate "X down, Y to go" counter from persona answer body
              const questionCountMatch = finalContent.match(/(?:That's\s+)?\d+\s+down,\s+\d+\s+to\s+go\s+with\s+me\.?/i);
              const contentAfterCount = questionCountMatch
                ? finalContent.replace(questionCountMatch[0], '').trim()
                : finalContent;
              const questionCountLine = questionCountMatch ? questionCountMatch[0].trim() : null;

              // Split transition messages: content before 🎭 intro vs after
              // This ensures the PersonaInterrupt banner appears between the outgoing
              // persona's final answer and the incoming persona's introduction
              let beforeIntro = contentAfterCount;
              let afterIntro: string | null = null;
              if (personaIntro) {
                const emojiIdx = contentAfterCount.indexOf('🎭');
                if (emojiIdx > 0) {
                  beforeIntro = contentAfterCount.slice(0, emojiIdx).trim();
                  afterIntro = contentAfterCount.slice(emojiIdx).trim();
                }
              }

              return (
                <div key={`${message.id}-${index}`}>
                  {/* Pure intro message (not a transition) — show banner at top */}
                  {personaIntro && !afterIntro && <PersonaInterrupt personaName={personaIntro.personaName} />}
                  <div className="flex items-start">
                  <div className="flex-1">
                    <div className="text-base prose prose-base dark:prose-invert max-w-none">
                      <ReactMarkdown>{beforeIntro}</ReactMarkdown>
                    </div>
                    {questionCountLine && (
                      <p className="mt-4 text-sm text-muted-foreground italic">{questionCountLine}</p>
                    )}
                    {/* Transition message — banner + new persona intro after the previous answer */}
                    {personaIntro && afterIntro && (
                      <>
                        <PersonaInterrupt personaName={personaIntro.personaName} />
                        <div className="text-base prose prose-base dark:prose-invert max-w-none">
                          <ReactMarkdown>{afterIntro}</ReactMarkdown>
                        </div>
                      </>
                    )}
                    {isCanvasStep && (() => {
                      const nonGridItems = canvasItems.filter(item => !item.isGridItem);
                      // Filter out items already on the board — hide duplicates entirely
                      const newItems = nonGridItems.filter(item => {
                        const normalizedText = item.text.trim().toLowerCase();
                        return !addedItemTexts.has(normalizedText) && !stickyNotes.some(p => (!p.type || p.type === 'stickyNote') && p.text.trim().toLowerCase() === normalizedText);
                      });
                      if (newItems.length === 0) return null;
                      return (
                        <div className="mt-2">
                          <div className="flex flex-wrap gap-2">
                            {newItems.map((item, i) => (
                              <button
                                key={i}
                                onClick={() => handleAddSingleItem(item)}
                                className={cn(
                                  "cursor-pointer inline-flex items-center gap-1.5 rounded-md border px-2.5 py-1.5 text-sm font-medium text-neutral-olive-800 shadow-sm transition-all hover:shadow-md hover:-translate-y-0.5 active:translate-y-0",
                                  SUGGESTION_BUTTON_STYLES[getSuggestionItemColor(item)]
                                )}
                              >
                                <Plus className="h-3 w-3" />
                                {item.text}
                              </button>
                            ))}
                          </div>
                        </div>
                      );
                    })()}
                    {/* Interview mode selection (Step 3 — before persona select) */}
                    {isInterviewModeMessage && !interviewMode && (() => {
                      const { modeOptions } = parseInterviewMode(content);
                      if (modeOptions.length === 0) return null;
                      return (
                        <div className="mt-3 grid grid-cols-2 gap-3 animate-in fade-in slide-in-from-bottom-2 duration-500">
                          {modeOptions.map((option) => (
                            <button
                              key={option.id}
                              disabled={isLoading}
                              onClick={async () => {
                                setInterviewMode(option.id);
                                setQuickAck(getRandomAck());
                                await flushCanvasToDb();
                                sendMessage({
                                  role: 'user',
                                  parts: [{ type: 'text', text: `I'd like to use ${option.label}` }],
                                });
                              }}
                              className="cursor-pointer rounded-xl border border-olive-300 bg-card p-4 text-left shadow-sm transition-all hover:border-olive-500 hover:shadow-md hover:-translate-y-0.5 active:translate-y-0 dark:border-neutral-olive-700 dark:bg-neutral-olive-900 dark:hover:border-olive-500"
                            >
                              <span className="text-sm font-semibold text-foreground">{option.label}</span>
                              {option.description && (
                                <p className="mt-1 text-xs text-muted-foreground">{option.description}</p>
                              )}
                            </button>
                          ))}
                        </div>
                      );
                    })()}
                    {/* Persona selection checkboxes (Step 3 only) */}
                    {isPersonaSelectMessage && personaOptions.length > 0 && !personaSelectConfirmed && (
                      <div className="mt-3 rounded-xl border border-olive-200 bg-olive-50/60 p-4 dark:border-neutral-olive-700 dark:bg-neutral-olive-900/30 animate-in fade-in slide-in-from-bottom-2 duration-500">
                        <p className="text-sm font-medium text-foreground mb-3">Select up to 3 personas to interview:</p>
                        <div className="space-y-2">
                          {personaOptions.map((persona, i) => {
                            const isSelected = personaSelections.has(persona.name);
                            const atLimit = personaSelections.size >= 3;
                            return (
                              <label
                                key={i}
                                className={cn(
                                  'flex items-start gap-3 rounded-lg border p-3 cursor-pointer transition-all',
                                  isSelected
                                    ? 'border-olive-400 bg-olive-100/80 dark:border-olive-600 dark:bg-olive-900/40'
                                    : 'border-transparent hover:border-olive-200 hover:bg-olive-50/40 dark:hover:border-neutral-olive-700 dark:hover:bg-neutral-olive-900/20',
                                  !isSelected && atLimit && 'opacity-50 cursor-not-allowed'
                                )}
                              >
                                <Checkbox
                                  checked={isSelected}
                                  disabled={!isSelected && atLimit}
                                  onCheckedChange={(checked) => {
                                    setPersonaSelections(prev => {
                                      const next = new Set(prev);
                                      if (checked) {
                                        if (next.size < 3) next.add(persona.name);
                                      } else {
                                        next.delete(persona.name);
                                      }
                                      return next;
                                    });
                                  }}
                                  className="mt-0.5"
                                />
                                <div className="flex-1 min-w-0">
                                  <span className="text-sm font-medium text-foreground">{persona.name}</span>
                                  {persona.description && (
                                    <span className="text-sm text-muted-foreground"> — {persona.description}</span>
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
                            onChange={(e) => setCustomPersonaInput(e.target.value)}
                            onKeyDown={(e) => {
                              if (e.key === 'Enter') {
                                e.preventDefault();
                                const name = customPersonaInput.trim();
                                if (name && !personaOptions.some(p => p.name.toLowerCase() === name.toLowerCase())) {
                                  setPersonaOptions(prev => [...prev, { name, description: '' }]);
                                  setPersonaSelections(prev => {
                                    const next = new Set(prev);
                                    if (next.size < 3) next.add(name);
                                    return next;
                                  });
                                  setCustomPersonaInput('');
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
                              const name = customPersonaInput.trim();
                              if (name && !personaOptions.some(p => p.name.toLowerCase() === name.toLowerCase())) {
                                setPersonaOptions(prev => [...prev, { name, description: '' }]);
                                setPersonaSelections(prev => {
                                  const next = new Set(prev);
                                  if (next.size < 3) next.add(name);
                                  return next;
                                });
                                setCustomPersonaInput('');
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
                            disabled={personaSelections.size === 0 || isLoading}
                            onClick={async () => {
                              const selectedNames = [...personaSelections];
                              // Add selected personas as canvas items with distinct colors
                              for (let i = 0; i < selectedNames.length; i++) {
                                const name = selectedNames[i];
                                const persona = personaOptions.find(p => p.name === name);
                                const text = persona?.description
                                  ? `${name} — ${persona.description}`
                                  : name;
                                handleAddSingleItem({ text, color: PERSONA_CARD_COLORS[i % PERSONA_CARD_COLORS.length] });
                              }
                              setPersonaSelectConfirmed(true);
                              setQuickAck(getRandomAck());
                              await flushCanvasToDb();
                              sendMessage({
                                role: 'user',
                                parts: [{ type: 'text', text: `I'd like to interview these personas: ${selectedNames.join(', ')}` }],
                              });
                            }}
                            className="rounded-full bg-olive-700 px-5 py-2 text-sm font-medium text-white hover:bg-olive-800 dark:bg-olive-600 dark:hover:bg-olive-500"
                          >
                            Confirm Selection ({personaSelections.size}/3)
                          </Button>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
                </div>
              );
            })}

            {/* Typing indicator — quick ack + thinking status */}
            {status === 'submitted' && (
              <>
                {quickAck && (
                  <div className="flex items-start">
                    <div className="flex-1">
                      <div className="text-base">
                        {quickAck}
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
              </>
            )}

            {/* Stream error recovery */}
            {streamError && !isLoading && (
              <div className="flex items-start">
                <div className="flex-1">
                  <div className="rounded-lg border border-yellow-500/50 bg-yellow-50 dark:bg-yellow-950/20 p-3 text-base">
                    <p className="text-yellow-800 dark:text-yellow-200">Response was interrupted.</p>
                    <Button
                      onClick={() => {
                        setStreamError(false);
                        // Find last user message and resend it
                        const lastUserMsg = [...messages].reverse().find((m) => m.role === 'user');
                        if (lastUserMsg) {
                          // Remove failed assistant response if present
                          const lastMsg = messages[messages.length - 1];
                          if (lastMsg.role === 'assistant') {
                            setMessages(messages.slice(0, -1));
                          }
                          // Resend last user message
                          setQuickAck(getRandomAck());
                          sendMessage({
                            role: 'user',
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

            {/* Synthetic interview mode: always show "your turn" prompt + suggestion button */}
            {step.id === 'user-research' && personaSelectConfirmed && interviewMode !== 'real' && status === 'ready' && messages.length > 0 && !justConfirmed && (
              <div className="space-y-2 pt-2">
                {/* Expanded suggestions (when available and user clicked the button) */}
                {suggestionsExpanded && suggestions.length > 0 && (
                  <div className="flex flex-wrap gap-2">
                    {suggestions.map((suggestion, i) => (
                      <button
                        key={i}
                        disabled={isLoading}
                        onClick={async () => {
                          setSuggestions([]);
                          setSuggestionsExpanded(false);
                          setQuickAck(getRandomAck());
                          await flushCanvasToDb();
                          sendMessage({
                            role: 'user',
                            parts: [{ type: 'text', text: suggestion }],
                          });
                        }}
                        className={cn(
                          'cursor-pointer rounded-full border border-olive-300 bg-card px-3 py-1.5 text-sm text-foreground shadow-sm hover:bg-olive-100 hover:border-olive-400 dark:border-neutral-olive-700 dark:bg-neutral-olive-900 dark:hover:bg-neutral-olive-800 dark:hover:border-neutral-olive-600 transition-colors',
                          'disabled:cursor-not-allowed disabled:opacity-50'
                        )}
                      >
                        {suggestion}
                      </button>
                    ))}
                  </div>
                )}
                {/* Always-visible suggestion button — expands instantly if suggestions exist, asks AI if not */}
                {!suggestionsExpanded && (
                  <div>
                    <button
                      disabled={isLoading}
                      onClick={async () => {
                        if (suggestions.length > 0) {
                          setSuggestionsExpanded(true);
                        } else {
                          setQuickAck(getRandomAck());
                          await flushCanvasToDb();
                          sendMessage({
                            role: 'user',
                            parts: [{ type: 'text', text: '[SUGGEST_QUESTIONS] Give me some question ideas for this persona.' }],
                          });
                        }
                      }}
                      className={cn(
                        'cursor-pointer inline-flex items-center gap-1.5 rounded-full border border-olive-300 bg-card px-3 py-1.5 text-sm text-foreground shadow-sm hover:bg-olive-100 hover:border-olive-400 dark:border-neutral-olive-700 dark:bg-neutral-olive-900 dark:hover:bg-neutral-olive-800 dark:hover:border-neutral-olive-600 transition-colors',
                        'disabled:cursor-not-allowed disabled:opacity-50'
                      )}
                    >
                      <Sparkles className="h-3.5 w-3.5" />
                      Give me a suggestion
                    </button>
                  </div>
                )}
                <p className="text-sm font-medium text-foreground pl-1">Your turn — give me your next question.</p>
              </div>
            )}

            {/* Suggestion pills — inline after last AI response (non-interview mode) */}
            {suggestions.length > 0 && !(step.id === 'user-research' && personaSelectConfirmed) && (
              <div className="space-y-1.5 pt-1">
                <div className="flex flex-wrap gap-2">
                  {suggestions.map((suggestion, i) => (
                    <button
                      key={i}
                      disabled={isLoading}
                      onClick={async () => {
                        setSuggestions([]);
                        setQuickAck(getRandomAck());
                        await flushCanvasToDb();
                        sendMessage({
                          role: 'user',
                          parts: [{ type: 'text', text: suggestion }],
                        });
                      }}
                      className={cn(
                        'cursor-pointer rounded-full border border-olive-300 bg-card px-3 py-1.5 text-sm text-foreground shadow-sm hover:bg-olive-100 hover:border-olive-400 dark:border-neutral-olive-700 dark:bg-neutral-olive-900 dark:hover:bg-neutral-olive-800 dark:hover:border-neutral-olive-600 transition-colors',
                        'disabled:cursor-not-allowed disabled:opacity-50'
                      )}
                    >
                      {suggestion}
                    </button>
                  ))}
                </div>
                <p className="text-xs text-muted-foreground pl-1">Use the suggested questions above or type your own below.</p>
              </div>
            )}

            {/* Persistent "Pains & Gains" action button — sense-making Phase 1 → Phase 2 transition */}
            {step.id === 'sense-making' &&
             stickyNotes.some(n => ['says', 'thinks', 'feels', 'does'].includes(n.cellAssignment?.row || '')) &&
             !stickyNotes.some(n => n.cellAssignment?.row === 'pains' || n.cellAssignment?.row === 'gains') && (
              <div className="flex justify-center pt-2">
                <button
                  disabled={isLoading}
                  onClick={async () => {
                    setQuickAck(getRandomAck());
                    await flushCanvasToDb();
                    sendMessage({
                      role: 'user',
                      parts: [{ type: 'text', text: "This looks great, let's move to pains and gains" }],
                    });
                  }}
                  className={cn(
                    'inline-flex items-center gap-2 rounded-full border border-olive-400 bg-white px-4 py-2 text-sm font-medium text-olive-800 shadow-sm transition-all hover:bg-olive-100 hover:shadow-md dark:border-olive-600 dark:bg-neutral-olive-800 dark:text-olive-300 dark:hover:bg-neutral-olive-700',
                    'disabled:cursor-not-allowed disabled:opacity-50'
                  )}
                >
                  <Sparkles className="h-3.5 w-3.5" />
                  Let&apos;s move on to pains and gains
                </button>
              </div>
            )}

            {/* Real interviews: "I'm ready to compile" button */}
            {step.id === 'user-research' && interviewMode === 'real' && personaSelectConfirmed && !readyToCompile && status === 'ready' && (
              <div className="mx-auto max-w-sm rounded-xl border border-olive-200 bg-olive-50/60 p-4 text-center dark:border-neutral-olive-700 dark:bg-neutral-olive-900/30 animate-in fade-in slide-in-from-bottom-2 duration-500">
                <p className="text-sm text-muted-foreground mb-3">
                  Added your interview insights and grouped them by persona? Let me compile and organize them.
                </p>
                <button
                  disabled={isLoading}
                  onClick={async () => {
                    setReadyToCompile(true);
                    setQuickAck(getRandomAck());
                    await flushCanvasToDb();
                    sendMessage({
                      role: 'user',
                      parts: [{ type: 'text', text: "[COMPILE_READY] I'm ready for you to compile my research insights." }],
                    });
                  }}
                  className="inline-flex items-center gap-2 rounded-full border border-olive-400 bg-white px-4 py-2 text-sm font-medium text-olive-800 shadow-sm transition-all hover:bg-olive-100 hover:shadow-md dark:border-olive-600 dark:bg-neutral-olive-800 dark:text-olive-300 dark:hover:bg-neutral-olive-700 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  <Sparkles className="h-3.5 w-3.5" />
                  I&apos;m ready to compile
                </button>
              </div>
            )}

            {/* Proactive theme sort card — stakeholder mapping, 5+ items, not yet sorted */}
            {step.id === 'stakeholder-mapping' && status === 'ready' && !hasThemeSorted &&
             stickyNotes.filter(p => (!p.type || p.type === 'stickyNote') && !p.isPreview).length >= 5 &&
             messages.some(m => m.role === 'assistant') && (
              <div className="mx-auto max-w-sm rounded-xl border border-olive-200 bg-olive-50/60 p-4 text-center dark:border-neutral-olive-700 dark:bg-neutral-olive-900/30">
                <p className="text-sm text-muted-foreground mb-3">
                  You&apos;ve got a solid collection! Want me to organize them into groups?
                </p>
                <button
                  onClick={handleThemeSort}
                  className="inline-flex items-center gap-2 rounded-full border border-olive-400 bg-white px-4 py-2 text-sm font-medium text-olive-800 shadow-sm transition-all hover:bg-olive-100 hover:shadow-md dark:border-olive-600 dark:bg-neutral-olive-800 dark:text-olive-300 dark:hover:bg-neutral-olive-700"
                >
                  <Sparkles className="h-3.5 w-3.5" />
                  Sort cards into themes
                </button>
              </div>
            )}

            {/* Post-sort instructions */}
            {showSortInstructions && (
              <div className="mx-auto max-w-sm rounded-xl border border-olive-200 bg-olive-50/60 p-4 dark:border-neutral-olive-700 dark:bg-neutral-olive-900/30 animate-in fade-in slide-in-from-bottom-2 duration-500">
                <p className="text-sm font-medium text-foreground mb-2">Cards sorted into themes!</p>
                <ul className="text-sm text-muted-foreground space-y-1.5">
                  <li>Drag items toward the <strong className="text-foreground">center</strong> if they&apos;re more important</li>
                  <li>Drag items <strong className="text-foreground">between groups</strong> to reorganize</li>
                  <li>Double-click any card to <strong className="text-foreground">edit</strong> its label</li>
                </ul>
              </div>
            )}

            {/* In-chat accept / edit buttons */}
            {showStepConfirm && status === 'ready' && !justConfirmed && !(step.id === 'persona' && !personasDone) && (
              <div className="flex flex-col items-center gap-2 pt-2">
                {step.id === 'persona' && (
                  <p className="text-sm text-muted-foreground text-center max-w-xs">
                    You can edit any field on the persona cards — name, age, job, insights, narrative, and quote — directly on the canvas.
                  </p>
                )}
                <button
                  onClick={() => {
                    setJustConfirmed(true);
                    onStepConfirm?.();
                    // Trigger AI congratulatory close by sending a hidden confirm message
                    sendMessage({
                      role: 'user',
                      parts: [{ type: 'text', text: '[STEP_CONFIRMED] I\'m happy with this — wrap it up!' }],
                    });
                  }}
                  className="inline-flex items-center gap-2 rounded-full border border-olive-400 bg-olive-50 px-4 py-2 text-sm font-medium text-olive-800 transition-colors hover:bg-olive-100 dark:border-olive-700 dark:bg-olive-950/30 dark:text-olive-300 dark:hover:bg-olive-900/40"
                >
                  <CheckCircle2 className="h-4 w-4" />
                  {stepConfirmLabel}
                </button>
              </div>
            )}
            {justConfirmed && (
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
                    await saveCanvasState(workshopId, step.id, { stickyNotes: [] });
                    state.markClean();
                    setQuickAck(getRandomAck());
                    sendMessage({
                      role: 'user',
                      parts: [{ type: 'text', text: 'I\'d like to revise and improve the current output. Please suggest a better version.' }],
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
        )}
        </div>
      </div>

      {/* Rate limit banner */}
      {rateLimitInfo && (
        <div className="mx-4 mb-2 flex items-center gap-2 rounded-md border border-yellow-500/50 bg-yellow-50 dark:bg-yellow-950/20 px-3 py-2 text-base text-yellow-800 dark:text-yellow-200">
          <Loader2 className="h-4 w-4 animate-spin shrink-0" />
          <span>AI is busy. Try again in {rateLimitInfo.retryAfter}s...</span>
        </div>
      )}

      {/* Input area */}
      <div className="border-t bg-background p-4">
        <form onSubmit={handleSend} className="flex gap-2">
          <TextareaAutosize
            ref={inputRef}
            minRows={1}
            maxRows={6}
            value={inputValue}
            onChange={(e) => setInputValue(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder={rateLimitInfo ? 'Waiting for AI to become available...' : 'Type your message...'}
            disabled={isLoading || !!rateLimitInfo}
            className={cn(
              'flex-1 resize-none rounded-md border border-input bg-transparent px-3 py-2 text-base shadow-xs outline-none transition-[color,box-shadow]',
              'placeholder:text-muted-foreground',
              'disabled:cursor-not-allowed disabled:opacity-50',
              'focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/50'
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
    </div>
  );
}
