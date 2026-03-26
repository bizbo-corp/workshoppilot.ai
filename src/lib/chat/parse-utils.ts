/**
 * Shared chat parsing utilities — pure string parsers with no React dependencies.
 * Used by both ChatPanel (facilitator) and ParticipantChatPanel (participant).
 */

export const QUICK_ACKS = [
  "Give me a sec to pull this together. 🧠",
  "Roger that! 🫡",
  "Let me dig in. 🔍",
  "Hmm, let me think on that... 💭",
  "One moment — gears turning. ⚙️",
  "Processing... this is a good one. ✨",
];

export function getRandomAck() {
  return QUICK_ACKS[Math.floor(Math.random() * QUICK_ACKS.length)];
}

/**
 * Parse [SUGGESTIONS]...[/SUGGESTIONS] block from AI content.
 * Returns clean content (block removed) and extracted suggestion strings.
 */
export function parseSuggestions(content: string): {
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
  if (content.includes("[SUGGESTIONS]")) {
    const cleanContent = content.replace(/\[SUGGESTIONS\][\s\S]*$/, "").trim();
    return { cleanContent, suggestions: [] };
  }

  return { cleanContent: content, suggestions: [] };
}

/**
 * Strip hallucinated system/tool tags from AI content.
 */
/**
 * Detect persona introduction messages (🎭 + "I'm [Name]" pattern).
 * Returns the persona name if found, null otherwise.
 */
export function detectPersonaIntro(content: string): { personaName: string } | null {
  if (!content.includes("🎭")) return null;
  const match = content.match(
    /🎭[\s\S]*?(?:I'm|Hey,?\s*I'm|I am)\s+([A-Z][a-z]+)/,
  );
  return match ? { personaName: match[1] } : null;
}

export function stripLeakedTags(content: string): { cleanContent: string } {
  const cleanContent = content
    .replace(/\s*\[artifact[^\]]*\]\s*/gi, " ")
    .replace(/\s*\[\/artifact\]\s*/gi, " ")
    .replace(/`tool_code`/gi, "")
    .replace(/```tool_code[\s\S]*?```/gi, "")
    .trim();
  return { cleanContent };
}

/**
 * Parse [PERSONA_SELECT]...[/PERSONA_SELECT] block from AI content.
 * Returns clean content (block removed) and extracted persona options.
 */
export function parsePersonaSelect(content: string): {
  cleanContent: string;
  personaOptions: { name: string; description: string }[];
} {
  // Complete block: extract persona options and strip
  const match = content.match(
    /\[PERSONA_SELECT\]([\s\S]*?)\[\/PERSONA_SELECT\]/,
  );
  if (match) {
    const cleanContent = content
      .replace(/\[PERSONA_SELECT\][\s\S]*?\[\/PERSONA_SELECT\]/, "")
      .trim();
    const personaOptions = match[1]
      .split("\n")
      .map((line) => line.replace(/^[-*•\d.]\s*/, "").trim())
      .filter((line) => line.length > 0)
      .map((line) => {
        // Parse "Name — description" or "Name - description"
        const dashMatch = line.match(/^(.+?)\s*[—–-]\s*(.+)$/);
        if (dashMatch) {
          return {
            name: dashMatch[1].trim(),
            description: dashMatch[2].trim(),
          };
        }
        return { name: line, description: "" };
      });
    return { cleanContent, personaOptions };
  }

  // Incomplete block (mid-stream): strip from [PERSONA_SELECT] to end
  if (content.includes("[PERSONA_SELECT]")) {
    const cleanContent = content
      .replace(/\[PERSONA_SELECT\][\s\S]*$/, "")
      .trim();
    return { cleanContent, personaOptions: [] };
  }

  return { cleanContent: content, personaOptions: [] };
}

/**
 * Parsed canvas item with optional position metadata
 */
export type CanvasItemParsed = {
  text: string;
  quadrant?: string;
  ring?: string;
  row?: string;
  col?: string;
  category?: string;
  cluster?: string;
  isGridItem?: boolean;
  color?: string;
  templateKey?: string;
};

/** Known zone/category sets for parseQuadLabel */
const EMPATHY_ZONE_IDS = new Set(["says", "thinks", "feels", "does", "pains", "gains"]);
const SENSE_MAKING_QUADRANTS = new Set(["said", "thought", "felt", "experienced"]);
const PERSONA_CATEGORIES = new Set(["goals", "motivations", "frustrations", "behaviors"]);
const RING_IDS = new Set(["inner", "middle", "outer"]);

function parseQuadLabel(label: string): {
  quadrant?: string;
  category?: string;
  ring?: string;
} {
  const lower = label.toLowerCase().trim();
  if (RING_IDS.has(lower)) return { ring: lower };
  if (EMPATHY_ZONE_IDS.has(lower)) {
    if (lower === "pains" || lower === "gains") {
      return { quadrant: lower, category: lower };
    }
    return { quadrant: lower };
  }
  if (SENSE_MAKING_QUADRANTS.has(lower)) return { quadrant: lower };
  if (PERSONA_CATEGORIES.has(lower)) return { category: lower };
  const stripped = lower.replace(/[^a-z]/g, "");
  if (stripped.includes("highpower") && stripped.includes("highinterest"))
    return { quadrant: "high-power-high-interest" };
  if (stripped.includes("highpower") && stripped.includes("lowinterest"))
    return { quadrant: "high-power-low-interest" };
  if (stripped.includes("lowpower") && stripped.includes("highinterest"))
    return { quadrant: "low-power-high-interest" };
  if (stripped.includes("lowpower") && stripped.includes("lowinterest"))
    return { quadrant: "low-power-low-interest" };
  if (label.startsWith("high-") || label.startsWith("low-"))
    return { quadrant: label };
  return {};
}

/**
 * Parse canvas item markup from AI content.
 * Supports tag format and shorthand format.
 */
export function parseCanvasItems(content: string): {
  cleanContent: string;
  canvasItems: CanvasItemParsed[];
} {
  const items: CanvasItemParsed[] = [];

  // Format 1: Tag pairs
  const tagRegex =
    /\[(CANVAS_ITEM|GRID_ITEM)(?:\s+([^\]]*))?\](.*?)\[\/(CANVAS_ITEM|GRID_ITEM)\]/g;
  let match;

  while ((match = tagRegex.exec(content)) !== null) {
    const tagType = match[1];
    const attrString = match[2] || "";
    const text = match[3].trim();
    if (text.length === 0) continue;

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

  // Format 2: Shorthand
  const contentWithoutTags = content.replace(
    /\[(CANVAS_ITEM|GRID_ITEM)(?:\s+[^\]]*?)?\].*?\[\/(CANVAS_ITEM|GRID_ITEM)\]/g,
    "",
  );
  const shorthandRegex = /\[CANVAS_ITEM:\s*([^\]]+)\]/g;

  while ((match = shorthandRegex.exec(contentWithoutTags)) !== null) {
    const inner = match[1].trim();
    if (inner.length === 0) continue;

    let remaining = inner;
    let quadrant: string | undefined;
    let ring: string | undefined;
    let category: string | undefined;
    let cluster: string | undefined;
    let color: string | undefined;
    let templateKey: string | undefined;

    const keyMatch = remaining.match(/,\s*Key:\s*([^,]+)$/i);
    if (keyMatch) {
      templateKey = keyMatch[1].trim().toLowerCase();
      remaining = remaining.slice(0, keyMatch.index).trim();
    }
    const colorMatch = remaining.match(/,\s*Color:\s*([^,]+)$/i);
    if (colorMatch) {
      color = colorMatch[1].trim().toLowerCase();
      remaining = remaining.slice(0, colorMatch.index).trim();
    }
    const clusterMatch = remaining.match(/,\s*Cluster:\s*(.+)$/i);
    if (clusterMatch) {
      cluster = clusterMatch[1].trim();
      remaining = remaining.slice(0, clusterMatch.index).trim();
    }
    const ringMatch = remaining.match(/,\s*Ring:\s*([^,]+)$/i);
    if (ringMatch) {
      ring = ringMatch[1].trim().toLowerCase();
      remaining = remaining.slice(0, ringMatch.index).trim();
    }
    const quadMatch = remaining.match(/,\s*Quad:\s*(.+)$/i);
    if (quadMatch) {
      const parsed = parseQuadLabel(quadMatch[1].trim());
      quadrant = parsed.quadrant;
      category = parsed.category;
      if (parsed.ring) ring = parsed.ring;
      remaining = remaining.slice(0, quadMatch.index).trim();
    }

    const text = remaining.trim();
    if (text.length > 0) {
      items.push({ text, quadrant, ring, category, cluster, color, templateKey });
    }
  }

  let cleanContent = content
    .replace(
      /\s*\[(CANVAS_ITEM|GRID_ITEM)(?:\s+[^\]]*?)?\].*?\[\/(CANVAS_ITEM|GRID_ITEM)\]\s*/g,
      "\n\n",
    )
    .replace(/\s*\[CANVAS_ITEM:\s*[^\]]+\]\s*/g, "\n\n")
    .trim();

  return { cleanContent, canvasItems: items };
}
