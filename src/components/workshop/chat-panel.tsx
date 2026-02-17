'use client';

import * as React from 'react';
import { useChat } from '@ai-sdk/react';
import { DefaultChatTransport, type UIMessage } from 'ai';
import TextareaAutosize from 'react-textarea-autosize';
import ReactMarkdown from 'react-markdown';
import { Send, Loader2, Plus, Check } from 'lucide-react';
import { getStepByOrder } from '@/lib/workshop/step-metadata';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { useAutoSave } from '@/hooks/use-auto-save';
import { useCanvasStore, useCanvasStoreApi } from '@/providers/canvas-store-provider';
import { computeCanvasPosition, computeThemeSortPositions, computeClusterChildPositions, POST_IT_WIDTH, POST_IT_HEIGHT, CATEGORY_COLORS, ZONE_COLORS } from '@/lib/canvas/canvas-position';
import { getStepCanvasConfig } from '@/lib/canvas/step-canvas-config';
import { saveCanvasState } from '@/actions/canvas-actions';

/** Steps that support canvas item auto-add */
const CANVAS_ENABLED_STEPS = ['challenge', 'stakeholder-mapping', 'sense-making', 'persona', 'journey-mapping'];

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
};

/** Known quadrant/category values that can appear in shorthand Quad: syntax */
const SENSE_MAKING_QUADRANTS = new Set(['said', 'thought', 'felt', 'experienced']);
const PERSONA_CATEGORIES = new Set(['goals', 'pains', 'gains', 'motivations', 'frustrations', 'behaviors']);
const RING_IDS = new Set(['inner', 'middle', 'outer']);

/**
 * Parse a shorthand "Quad:" value into a quadrant, category, or ring.
 * Returns { quadrant, category, ring } — one or neither will be set.
 *
 * Handles:
 * - Ring IDs: "inner" → ring: "inner"
 * - Stakeholder quadrants: "High Power/High Interest" → quadrant: "high-power-high-interest"
 * - Sense-making quadrants: "felt" → quadrant: "felt"
 * - Persona categories: "goals" → category: "goals"
 */
function parseQuadLabel(label: string): { quadrant?: string; category?: string; ring?: string } {
  const lower = label.toLowerCase().trim();

  // Ring IDs (inner/middle/outer) for concentric ring layout
  if (RING_IDS.has(lower)) return { ring: lower };

  // Sense-making quadrants (said/thought/felt/experienced)
  if (SENSE_MAKING_QUADRANTS.has(lower)) return { quadrant: lower };

  // Persona categories (goals/pains/gains/motivations/frustrations/behaviors)
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
    });
  }

  // --- Format 2: Shorthand  [CANVAS_ITEM: Text] or [CANVAS_ITEM: Text, Quad: ...] ---
  // Run on content with tag-format already stripped to avoid double-parsing
  const contentWithoutTags = content.replace(/\[(CANVAS_ITEM|GRID_ITEM)(?:\s+[^\]]*?)?\].*?\[\/(CANVAS_ITEM|GRID_ITEM)\]/g, '');
  const shorthandRegex = /\[CANVAS_ITEM:\s*([^\]]+)\]/g;

  while ((match = shorthandRegex.exec(contentWithoutTags)) !== null) {
    const inner = match[1].trim();
    if (inner.length === 0) continue;

    // Parse comma-separated attributes: "Text, Ring: value, Quad: value, Cluster: value"
    // Extract known attributes from the end, remainder is the text
    let remaining = inner;
    let quadrant: string | undefined;
    let ring: string | undefined;
    let category: string | undefined;
    let cluster: string | undefined;

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
      items.push({ text, quadrant, ring, category, cluster });
    }
  }

  // Remove both markup formats from content for clean markdown rendering
  let cleanContent = content
    // Tag format
    .replace(/\s*\[(CANVAS_ITEM|GRID_ITEM)(?:\s+[^\]]*?)?\].*?\[\/(CANVAS_ITEM|GRID_ITEM)\]\s*/g, ' ')
    // Shorthand format
    .replace(/\s*\[CANVAS_ITEM:\s*[^\]]+\]\s*/g, ' ')
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

interface ChatPanelProps {
  stepOrder: number;
  sessionId: string;
  workshopId: string;
  initialMessages?: UIMessage[];
  onMessageCountChange?: (count: number) => void;
  subStep?: 'mind-mapping' | 'crazy-eights' | 'idea-selection';
}

export function ChatPanel({ stepOrder, sessionId, workshopId, initialMessages, onMessageCountChange, subStep }: ChatPanelProps) {
  const step = getStepByOrder(stepOrder);
  const storeApi = useCanvasStoreApi();
  const addPostIt = useCanvasStore((state) => state.addPostIt);
  const deletePostIt = useCanvasStore((state) => state.deletePostIt);
  const setCluster = useCanvasStore((state) => state.setCluster);
  const batchUpdatePositions = useCanvasStore((state) => state.batchUpdatePositions);
  const postIts = useCanvasStore((state) => state.postIts);
  const gridColumns = useCanvasStore((state) => state.gridColumns);
  const drawingNodes = useCanvasStore((state) => state.drawingNodes);
  const mindMapNodes = useCanvasStore((state) => state.mindMapNodes);
  const mindMapEdges = useCanvasStore((state) => state.mindMapEdges);
  const crazy8sSlots = useCanvasStore((state) => state.crazy8sSlots);
  const conceptCards = useCanvasStore((state) => state.conceptCards);
  const isDirty = useCanvasStore((state) => state.isDirty);
  const markClean = useCanvasStore((state) => state.markClean);
  const setHighlightedCell = useCanvasStore((state) => state.setHighlightedCell);
  const setPendingFitView = useCanvasStore((state) => state.setPendingFitView);
  const selectedPostItIds = useCanvasStore((state) => state.selectedPostItIds);
  const messagesEndRef = React.useRef<HTMLDivElement>(null);
  const scrollContainerRef = React.useRef<HTMLDivElement>(null);
  const hasAutoStarted = React.useRef(false);
  const hasScrolledOnMount = React.useRef(false);
  const countdownRef = React.useRef<NodeJS.Timeout | null>(null);
  const [inputValue, setInputValue] = React.useState('');
  const [suggestions, setSuggestions] = React.useState<string[]>([]);
  const [rateLimitInfo, setRateLimitInfo] = React.useState<{ retryAfter: number } | null>(null);
  const [streamError, setStreamError] = React.useState(false);
  const [addedMessageIds, setAddedMessageIds] = React.useState<Set<string>>(() => new Set());

  if (!step) {
    return (
      <div className="flex h-full items-center justify-center">
        <p className="text-muted-foreground">Step not found</p>
      </div>
    );
  }

  const isCanvasStep = CANVAS_ENABLED_STEPS.includes(step.id);

  // Force-flush canvas state to DB before sending a chat message
  // Ensures the AI sees the latest board state (not stale DB from before debounced auto-save)
  const flushCanvasToDb = React.useCallback(async () => {
    if (!isCanvasStep || !isDirty) return;
    await saveCanvasState(workshopId, step.id, {
      postIts,
      ...(gridColumns.length > 0 ? { gridColumns } : {}),
      ...(drawingNodes.length > 0 ? { drawingNodes } : {}),
      ...(mindMapNodes.length > 0 ? { mindMapNodes } : {}),
      ...(mindMapEdges.length > 0 ? { mindMapEdges } : {}),
      ...(crazy8sSlots.length > 0 ? { crazy8sSlots } : {}),
      ...(conceptCards.length > 0 ? { conceptCards } : {}),
    });
    markClean();
  }, [isCanvasStep, isDirty, workshopId, step.id, postIts, gridColumns, drawingNodes, mindMapNodes, mindMapEdges, crazy8sSlots, conceptCards, markClean]);

  const transport = React.useMemo(
    () =>
      new DefaultChatTransport({
        api: '/api/chat',
        body: { sessionId, stepId: step.id, workshopId, subStep, selectedPostItIds },
      }),
    [sessionId, step.id, workshopId, subStep, selectedPostItIds]
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
      }
    }
    // Clear suggestions while AI is responding
    if (status === 'streaming' || status === 'submitted') {
      setSuggestions([]);
    }
  }, [status, messages]);

  // Initialize addedMessageIds from history — messages that have canvas items AND canvas already has post-its
  // This ensures reloaded pages show green badges, not "Add to Whiteboard" buttons
  const hasInitializedAddedIds = React.useRef(false);
  React.useEffect(() => {
    if (hasInitializedAddedIds.current || !isCanvasStep || postIts.length === 0) return;
    hasInitializedAddedIds.current = true;

    const ids = new Set<string>();
    for (const msg of messages) {
      if (msg.role !== 'assistant') continue;
      const textParts = msg.parts?.filter((p) => p.type === 'text') || [];
      const content = textParts.map((p) => p.text).join('\n');
      const { canvasItems } = parseCanvasItems(content);
      if (canvasItems.length > 0) {
        ids.add(msg.id);
      }
    }
    if (ids.size > 0) {
      setAddedMessageIds(ids);
    }
  }, [messages, isCanvasStep, postIts.length]);

  // Handle adding AI-suggested canvas items to the whiteboard
  const handleAddToWhiteboard = React.useCallback((messageId: string, canvasItems: CanvasItemParsed[]) => {
    if (addedMessageIds.has(messageId)) return; // Guard against double-click

    // Build dynamic gridConfig from store columns for journey-mapping
    const stepConfig = getStepCanvasConfig(step.id);
    const baseGridConfig = stepConfig.gridConfig;
    const dynamicGridConfig = baseGridConfig && gridColumns.length > 0
      ? { ...baseGridConfig, columns: gridColumns }
      : baseGridConfig;

    // Add each item to canvas with computed position
    let currentPostIts = [...postIts];
    for (const item of canvasItems) {
      const { position, quadrant, cellAssignment } = computeCanvasPosition(
        step.id,
        { quadrant: item.quadrant, ring: item.ring, row: item.row, col: item.col, category: item.category, cluster: item.cluster },
        currentPostIts,
        dynamicGridConfig,
      );

      // Color priority: category-specific > zone-specific > default yellow
      const color = (item.category && CATEGORY_COLORS[item.category])
        || (item.quadrant && ZONE_COLORS[item.quadrant])
        || 'yellow';

      const newPostIt = {
        text: item.text,
        position,
        width: POST_IT_WIDTH,
        height: POST_IT_HEIGHT,
        color,
        quadrant,
        cellAssignment,
        cluster: item.cluster,
      };

      addPostIt(newPostIt);

      // Highlight target cell for grid items
      if (item.isGridItem && cellAssignment && dynamicGridConfig) {
        const rowIndex = dynamicGridConfig.rows.findIndex(r => r.id === cellAssignment.row);
        const colIndex = dynamicGridConfig.columns.findIndex(c => c.id === cellAssignment.col);
        if (rowIndex !== -1 && colIndex !== -1) {
          setHighlightedCell({ row: rowIndex, col: colIndex });
        }
      }

      currentPostIts = [...currentPostIts, { ...newPostIt, id: 'pending' }];
    }

    setAddedMessageIds(prev => new Set(prev).add(messageId));
    setPendingFitView(true);
  }, [addedMessageIds, step.id, gridColumns, postIts, addPostIt, setHighlightedCell, setPendingFitView]);

  // Auto-add canvas items when AI finishes streaming (no manual click needed)
  React.useEffect(() => {
    if (status !== 'ready' || !isCanvasStep || messages.length === 0) return;
    const lastMsg = messages[messages.length - 1];
    if (lastMsg.role !== 'assistant') return;
    if (addedMessageIds.has(lastMsg.id)) return;

    const textParts = lastMsg.parts?.filter((p) => p.type === 'text') || [];
    const content = textParts.map((p) => p.text).join('\n');
    const { canvasItems } = parseCanvasItems(content);
    const { shouldSort } = parseThemeSortTrigger(content);
    const { deleteTexts } = parseCanvasDeletes(content);
    const { clusters } = parseClusterSuggestions(content);

    if (canvasItems.length > 0) {
      handleAddToWhiteboard(lastMsg.id, canvasItems);
    }

    // Process AI-requested deletions
    if (deleteTexts.length > 0) {
      const latestPostIts = storeApi.getState().postIts;
      for (const delText of deleteTexts) {
        const lower = delText.toLowerCase();
        const match = latestPostIts.find(p =>
          p.text.toLowerCase() === lower && (!p.type || p.type === 'postIt')
        );
        if (match) deletePostIt(match.id);
      }
    }

    // Process AI-suggested clusters
    if (clusters.length > 0) {
      const latestPostIts = storeApi.getState().postIts;
      const clusterUpdates: Array<{ id: string; position: { x: number; y: number }; cellAssignment?: { row: string; col: string } }> = [];

      for (const cluster of clusters) {
        const parentLower = cluster.parent.toLowerCase();
        const parentPostIt = latestPostIts.find(p =>
          p.text.toLowerCase() === parentLower && (!p.type || p.type === 'postIt')
        );
        const childIds: string[] = [];
        const childPostIts: typeof latestPostIts = [];
        for (const childText of cluster.children) {
          const childLower = childText.toLowerCase();
          const match = latestPostIts.find(p =>
            p.text.toLowerCase() === childLower && (!p.type || p.type === 'postIt')
          );
          if (match) {
            childIds.push(match.id);
            childPostIts.push(match);
          }
        }
        if (childIds.length > 0) {
          setCluster(childIds, cluster.parent);

          // Rearrange children in 3-wide rows centered below parent
          if (parentPostIt) {
            const childPositions = computeClusterChildPositions(
              parentPostIt.position,
              parentPostIt.width,
              parentPostIt.height,
              childPostIts.length,
              childPostIts[0]?.width || POST_IT_WIDTH,
              childPostIts[0]?.height || POST_IT_HEIGHT,
            );
            for (let j = 0; j < childPostIts.length; j++) {
              clusterUpdates.push({
                id: childPostIts[j].id,
                position: childPositions[j],
                ...(parentPostIt.cellAssignment ? { cellAssignment: parentPostIt.cellAssignment } : {}),
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

    // Mark as processed if we did any work (avoid re-processing)
    if (canvasItems.length === 0 && (deleteTexts.length > 0 || clusters.length > 0)) {
      setAddedMessageIds(prev => new Set(prev).add(lastMsg.id));
    }

    // If AI triggered [THEME_SORT], reorganize after items are added
    if (shouldSort) {
      setTimeout(() => {
        const latestPostIts = storeApi.getState().postIts;
        const updates = computeThemeSortPositions(latestPostIts, step.id);
        if (updates.length > 0) {
          batchUpdatePositions(updates);
          setPendingFitView(true);
        }
      }, 300); // Short delay to ensure new items are in store
    }
  }, [status, messages, isCanvasStep, addedMessageIds, handleAddToWhiteboard, batchUpdatePositions, storeApi, step.id, setPendingFitView, deletePostIt, setCluster]);

  // Clear stream error on successful completion
  React.useEffect(() => {
    if (status === 'ready') {
      setStreamError(false);
      // Don't clear rateLimitInfo here — let the countdown finish
    }
  }, [status]);

  // Stream timeout detection
  React.useEffect(() => {
    if (status !== 'streaming') return;
    const timeout = setTimeout(() => {
      setStreamError(true);
    }, 30000);
    return () => clearTimeout(timeout);
  }, [status, messages.length]);

  // Cleanup countdown on unmount
  React.useEffect(() => {
    return () => {
      if (countdownRef.current) clearInterval(countdownRef.current);
    };
  }, []);

  // Auto-start: send trigger message when entering a step with no prior messages
  const shouldAutoStart = !initialMessages || initialMessages.length === 0;

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

    // Flush canvas to DB so the AI sees the latest board state
    await flushCanvasToDb();

    await sendMessage({
      role: 'user',
      parts: [{ type: 'text', text: inputValue }],
    });
    setInputValue('');
    setSuggestions([]);
  };

  // Handle Enter to send (Shift+Enter for newline)
  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      const form = e.currentTarget.closest('form');
      if (form) form.requestSubmit();
    }
  };

  // Handle adding user message to canvas as a post-it
  const handleAddUserMessageToCanvas = React.useCallback((text: string) => {
    const { position } = computeCanvasPosition(step.id, {}, postIts);
    addPostIt({
      text,
      position,
      width: POST_IT_WIDTH,
      height: POST_IT_HEIGHT,
      color: 'yellow',
    });
  }, [addPostIt, postIts, step.id]);

  return (
    <div className="flex h-full flex-col">
      {/* Messages area */}
      <div ref={scrollContainerRef} className="flex-1 overflow-y-auto p-4">
        {/* Centered AI avatar at top - scrolls off screen */}
        <div className="flex justify-center mb-6">
          <div className="flex size-10 shrink-0 items-center justify-center rounded-full bg-primary text-primary-foreground text-sm font-medium">
            AI
          </div>
        </div>

        {messages.length === 0 ? (
          // Loading indicator while AI auto-starts
          <div className="flex items-start">
            <div className="flex-1">
              <div className="text-base text-muted-foreground">
                AI is thinking...
              </div>
            </div>
          </div>
        ) : (
          // Render conversation messages (filter out __step_start__ trigger)
          <div className="space-y-6">
            {messages.filter((m) => {
              if (m.role !== 'user') return true;
              const text = m.parts?.filter((p) => p.type === 'text').map((p) => p.text).join('') || '';
              return text !== '__step_start__';
            }).map((message, index) => {
              const textParts = message.parts?.filter((part) => part.type === 'text') || [];
              const content = textParts.map((part) => part.text).join('\n');

              if (message.role === 'user') {
                return (
                  <div key={`${message.id}-${index}`} className="group flex items-start justify-end">
                    <div className="max-w-[80%]">
                      <div className="relative rounded-2xl bg-muted p-3 px-4 text-base text-foreground">
                        {content}
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
              const { cleanContent: noThemeSort } = parseThemeSortTrigger(noSuggestions);
              const { cleanContent: noDeletes } = parseCanvasDeletes(noThemeSort);
              const { cleanContent: noClusters } = parseClusterSuggestions(noDeletes);
              const { cleanContent: finalContent, canvasItems } = parseCanvasItems(noClusters);
              return (
                <div key={`${message.id}-${index}`} className="flex items-start">
                  <div className="flex-1">
                    <div className="text-base prose prose-base dark:prose-invert max-w-none">
                      <ReactMarkdown>{finalContent}</ReactMarkdown>
                    </div>
                    {isCanvasStep && canvasItems.length > 0 && addedMessageIds.has(message.id) && (
                      <div className="mt-2">
                        <div className="flex flex-wrap gap-2">
                          {canvasItems.map((item, i) => (
                              <span
                                key={i}
                                className="inline-flex items-center gap-1 rounded-md border px-2.5 py-1.5 text-sm font-medium border-green-500/30 bg-green-50 dark:bg-green-950/20 text-green-700 dark:text-green-400"
                              >
                                <Check className="h-3 w-3" />
                                {item.text}
                              </span>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              );
            })}

            {/* Typing indicator */}
            {status === 'submitted' && (
              <div className="flex items-start">
                <div className="flex-1">
                  <div className="text-base text-muted-foreground">
                    AI is thinking...
                  </div>
                </div>
              </div>
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

            {/* Suggestion pills — inline after last AI response */}
            {suggestions.length > 0 && (
              <div className="flex flex-wrap gap-2 pt-1">
                {suggestions.map((suggestion, i) => (
                  <button
                    key={i}
                    disabled={isLoading}
                    onClick={async () => {
                      setSuggestions([]);
                      await flushCanvasToDb();
                      sendMessage({
                        role: 'user',
                        parts: [{ type: 'text', text: suggestion }],
                      });
                    }}
                    className={cn(
                      'rounded-full border border-input bg-background px-3 py-1.5 text-sm text-foreground hover:bg-accent hover:text-accent-foreground transition-colors',
                      'disabled:cursor-not-allowed disabled:opacity-50'
                    )}
                  >
                    {suggestion}
                  </button>
                ))}
              </div>
            )}

            {/* Auto-scroll target */}
            <div ref={messagesEndRef} />
          </div>
        )}
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
