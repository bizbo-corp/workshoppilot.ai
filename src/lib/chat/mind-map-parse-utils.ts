/**
 * Shared [MIND_MAP_NODE] parsing utilities
 * Used by both facilitator (chat-panel.tsx) and participant (participant-chat-panel.tsx) chat panels.
 */

import type { MindMapNodeState } from '@/stores/canvas-store';

export type MindMapNodeParsed = {
  label: string;
  theme?: string; // Parent theme label (omitted for theme-level nodes)
  isWildCard?: boolean;
};

/**
 * Parse [MIND_MAP_NODE: Label] and [MIND_MAP_NODE: Label, Theme: Parent] markup.
 * Also supports tag format: [MIND_MAP_NODE theme="Parent" wildcard]Label[/MIND_MAP_NODE]
 * Returns clean content and extracted mind map node data.
 */
export function parseMindMapNodes(content: string): {
  cleanContent: string;
  nodes: MindMapNodeParsed[];
} {
  const nodes: MindMapNodeParsed[] = [];

  // Format 1: Tag pairs [MIND_MAP_NODE theme="..." wildcard?]Label[/MIND_MAP_NODE]
  const tagRegex = /\[MIND_MAP_NODE(?:\s+([^\]]*))?\](.*?)\[\/MIND_MAP_NODE\]/g;
  let match;
  while ((match = tagRegex.exec(content)) !== null) {
    const attrs = match[1] || "";
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
  const contentWithoutTags = content.replace(
    /\[MIND_MAP_NODE(?:\s+[^\]]*?)?\].*?\[\/MIND_MAP_NODE\]/g,
    "",
  );
  const shorthandRegex = /\[MIND_MAP_NODE:\s*([^\]]+)\]/g;
  while ((match = shorthandRegex.exec(contentWithoutTags)) !== null) {
    const inner = match[1].trim();
    // Parse comma-separated attributes
    const parts = inner.split(",").map((s) => s.trim());
    const label = parts[0];
    if (!label) continue;

    let theme: string | undefined;
    let isWildCard = false;

    for (let i = 1; i < parts.length; i++) {
      const part = parts[i];
      if (theme !== undefined) {
        if (/^wild\s*card$/i.test(part)) {
          isWildCard = true;
        } else {
          theme += ", " + part;
        }
        continue;
      }
      const themeMatch2 = part.match(/^Theme:\s*(.+)/i);
      if (themeMatch2) theme = themeMatch2[1].trim();
      if (/wild\s*card/i.test(part)) isWildCard = true;
    }

    // Handle "Wildcard:" prefix in label (e.g. "Wildcard: Some Idea")
    let cleanLabel = label;
    if (/^wildcard:\s*/i.test(cleanLabel)) {
      cleanLabel = cleanLabel.replace(/^wildcard:\s*/i, "").trim();
      isWildCard = true;
    }

    nodes.push({ label: cleanLabel, theme, isWildCard });
  }

  // Clean markup from content
  let cleanContent = content
    .replace(
      /\s*\[MIND_MAP_NODE(?:\s+[^\]]*?)?\].*?\[\/MIND_MAP_NODE\]\s*/g,
      " ",
    )
    .replace(/\s*\[MIND_MAP_NODE:\s*[^\]]+\]\s*/g, " ")
    .trim();

  // Strip incomplete tags mid-stream
  if (cleanContent.includes("[MIND_MAP_NODE")) {
    cleanContent = cleanContent.replace(/\[MIND_MAP_NODE[^\]]*$/, "").trim();
  }

  return { cleanContent, nodes };
}

/**
 * Replace [MIND_MAP_NODE] markup with numbered placeholders for inline rendering.
 * Returns content with %%MMNODE_N%% placeholders and the parsed nodes array.
 * Placeholder indices correspond 1:1 to the returned nodes array.
 */
export function inlineMindMapNodes(content: string): {
  content: string;
  nodes: MindMapNodeParsed[];
} {
  const nodes: MindMapNodeParsed[] = [];
  let nodeIndex = 0;

  // Replace tag format: [MIND_MAP_NODE ...]...[/MIND_MAP_NODE]
  let result = content.replace(
    /\[MIND_MAP_NODE(?:\s+([^\]]*))?\](.*?)\[\/MIND_MAP_NODE\]/g,
    (_match, attrs, label) => {
      const attrStr = attrs || "";
      const trimmedLabel = (label as string).trim();
      if (!trimmedLabel) return "";

      const themeMatch = attrStr.match(/theme\s*=\s*"([^"]+)"/i);
      const isWildCard = /wildcard/i.test(attrStr);

      nodes.push({ label: trimmedLabel, theme: themeMatch?.[1], isWildCard });
      return `\n%%MMNODE_${nodeIndex++}%%\n`;
    },
  );

  // Replace shorthand format: [MIND_MAP_NODE: ...]
  result = result.replace(/\[MIND_MAP_NODE:\s*([^\]]+)\]/g, (_match, inner) => {
    const parts = (inner as string)
      .trim()
      .split(",")
      .map((s: string) => s.trim());
    const label = parts[0];
    if (!label) return "";

    let theme: string | undefined;
    let isWildCard = false;

    for (let i = 1; i < parts.length; i++) {
      const part = parts[i];
      if (theme !== undefined) {
        if (/^wild\s*card$/i.test(part)) {
          isWildCard = true;
        } else {
          theme += ", " + part;
        }
        continue;
      }
      const themeMatch = part.match(/^Theme:\s*(.+)/i);
      if (themeMatch) theme = themeMatch[1].trim();
      if (/wild\s*card/i.test(part)) isWildCard = true;
    }

    let cleanLabel = label;
    if (/^wildcard:\s*/i.test(cleanLabel)) {
      cleanLabel = cleanLabel.replace(/^wildcard:\s*/i, "").trim();
      isWildCard = true;
    }

    nodes.push({ label: cleanLabel, theme, isWildCard });
    return `\n%%MMNODE_${nodeIndex++}%%\n`;
  });

  // Strip incomplete tags mid-stream
  if (result.includes("[MIND_MAP_NODE")) {
    result = result.replace(/\[MIND_MAP_NODE[^\]]*$/, "");
  }

  return { content: result, nodes };
}

/**
 * Fuzzy theme matcher for mind map nodes.
 * Exact match first, then bidirectional substring match against level-1 nodes.
 */
const MATCH_STOP_WORDS = new Set([
  "the", "a", "an", "to", "for", "and", "or", "of", "in", "on", "with",
  "their", "his", "her", "its", "who", "that", "which", "how", "might",
  "we", "can", "more", "into", "is", "are", "be", "so", "they", "he", "she",
]);

export function findThemeNode(
  theme: string,
  nodes: MindMapNodeState[],
  nodeLabelMap: Map<string, MindMapNodeState>,
): MindMapNodeState | undefined {
  // 1. Exact match (case-insensitive)
  const exact = nodeLabelMap.get(theme.toLowerCase());
  if (exact) return exact;

  const themeLower = theme.toLowerCase();
  const level1Nodes = nodes.filter((n) => n.level === 1);

  // 2. Bidirectional substring — one string fully contains the other
  for (const n of level1Nodes) {
    const labelLower = n.label.toLowerCase();
    if (themeLower.includes(labelLower) || labelLower.includes(themeLower))
      return n;
  }

  // 3. Word-overlap scoring — pick the branch sharing the most significant words
  const themeWords = new Set(
    themeLower
      .split(/\s+/)
      .filter((w) => w.length > 2 && !MATCH_STOP_WORDS.has(w)),
  );
  if (themeWords.size === 0) return undefined;

  let bestNode: MindMapNodeState | undefined;
  let bestScore = 0;

  for (const n of level1Nodes) {
    const labelWords = n.label
      .toLowerCase()
      .split(/\s+/)
      .filter((w) => w.length > 2 && !MATCH_STOP_WORDS.has(w));
    const overlap = labelWords.filter((w) => themeWords.has(w)).length;
    if (overlap > bestScore) {
      bestScore = overlap;
      bestNode = n;
    }
  }

  // Require at least 2 shared words to avoid false positives
  return bestScore >= 2 ? bestNode : undefined;
}
