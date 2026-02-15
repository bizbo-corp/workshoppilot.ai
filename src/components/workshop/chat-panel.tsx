'use client';

import * as React from 'react';
import { useChat } from '@ai-sdk/react';
import { DefaultChatTransport, type UIMessage } from 'ai';
import TextareaAutosize from 'react-textarea-autosize';
import ReactMarkdown from 'react-markdown';
import { Send, Loader2, Plus, Check, LayoutGrid } from 'lucide-react';
import { getStepByOrder } from '@/lib/workshop/step-metadata';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { useAutoSave } from '@/hooks/use-auto-save';
import { useCanvasStore } from '@/providers/canvas-store-provider';
import { computeCanvasPosition, POST_IT_WIDTH, POST_IT_HEIGHT, CATEGORY_COLORS, ZONE_COLORS } from '@/lib/canvas/canvas-position';
import { getStepCanvasConfig } from '@/lib/canvas/step-canvas-config';

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
 * Parsed canvas item with optional position metadata
 */
type CanvasItemParsed = {
  text: string;
  quadrant?: string;
  row?: string;
  col?: string;
  category?: string;
  isGridItem?: boolean;
};

/**
 * Parse [CANVAS_ITEM]...[/CANVAS_ITEM] markup from AI content.
 * Supports optional attributes: quadrant="...", row="...", col="..."
 * Returns clean content (markup removed) and extracted canvas items with metadata.
 */
function parseCanvasItems(content: string): { cleanContent: string; canvasItems: CanvasItemParsed[] } {
  const items: CanvasItemParsed[] = [];
  const regex = /\[(CANVAS_ITEM|GRID_ITEM)(?:\s+([^\]]*))?\](.*?)\[\/(CANVAS_ITEM|GRID_ITEM)\]/g;
  let match;

  while ((match = regex.exec(content)) !== null) {
    const tagType = match[1]; // CANVAS_ITEM or GRID_ITEM
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
      row: attrs.row,
      col: attrs.col,
      category: attrs.category,
      isGridItem: tagType === 'GRID_ITEM',
    });
  }

  // Remove markup from content for clean markdown rendering
  const cleanContent = content
    .replace(/\s*\[(CANVAS_ITEM|GRID_ITEM)(?:\s+[^\]]*?)?\].*?\[\/(CANVAS_ITEM|GRID_ITEM)\]\s*/g, ' ')
    .trim();

  return { cleanContent, canvasItems: items };
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
  const addPostIt = useCanvasStore((state) => state.addPostIt);
  const postIts = useCanvasStore((state) => state.postIts);
  const gridColumns = useCanvasStore((state) => state.gridColumns);
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
        { quadrant: item.quadrant, row: item.row, col: item.col, category: item.category },
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
        {messages.length === 0 ? (
          // Loading indicator while AI auto-starts
          <div className="flex items-start gap-3">
            <div className="flex size-8 shrink-0 items-center justify-center rounded-full bg-primary text-primary-foreground">
              AI
            </div>
            <div className="flex-1">
              <div className="text-sm text-muted-foreground">
                AI is thinking...
              </div>
            </div>
          </div>
        ) : (
          // Render conversation messages (filter out __step_start__ trigger)
          <div className="space-y-4">
            {messages.filter((m) => {
              if (m.role !== 'user') return true;
              const text = m.parts?.filter((p) => p.type === 'text').map((p) => p.text).join('') || '';
              return text !== '__step_start__';
            }).map((message, index) => {
              const textParts = message.parts?.filter((part) => part.type === 'text') || [];
              const content = textParts.map((part) => part.text).join('\n');

              if (message.role === 'user') {
                return (
                  <div key={`${message.id}-${index}`} className="group flex items-start gap-3 justify-end">
                    <div className="flex-1 max-w-[80%]">
                      <div className="relative rounded-lg bg-primary p-3 text-sm text-primary-foreground">
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

              // Assistant message — strip [SUGGESTIONS] and [CANVAS_ITEM] markup
              const { cleanContent: noSuggestions } = parseSuggestions(content);
              const { cleanContent: finalContent, canvasItems } = parseCanvasItems(noSuggestions);
              return (
                <div key={`${message.id}-${index}`} className="flex items-start gap-3">
                  <div className="flex size-8 shrink-0 items-center justify-center rounded-full bg-primary text-primary-foreground">
                    AI
                  </div>
                  <div className="flex-1">
                    <div className="text-sm prose prose-sm dark:prose-invert max-w-none">
                      <ReactMarkdown>{finalContent}</ReactMarkdown>
                    </div>
                    {isCanvasStep && canvasItems.length > 0 && (
                      <div className="mt-2">
                        <div className="flex flex-wrap gap-2">
                          {canvasItems.map((item, i) => {
                            const isAdded = addedMessageIds.has(message.id);
                            return (
                              <span
                                key={i}
                                className={cn(
                                  'inline-flex items-center gap-1 rounded-md border px-2.5 py-1.5 text-xs font-medium',
                                  isAdded
                                    ? 'border-green-500/30 bg-green-50 dark:bg-green-950/20 text-green-700 dark:text-green-400'
                                    : 'border-blue-500/30 bg-blue-50 dark:bg-blue-950/20 text-blue-700 dark:text-blue-400'
                                )}
                              >
                                {isAdded && <Check className="h-3 w-3" />}
                                {item.text}
                              </span>
                            );
                          })}
                        </div>
                        {!addedMessageIds.has(message.id) && (
                          <Button
                            variant="outline"
                            size="sm"
                            className="mt-2"
                            disabled={isLoading}
                            onClick={() => handleAddToWhiteboard(message.id, canvasItems)}
                          >
                            <LayoutGrid className="h-3.5 w-3.5 mr-1.5" />
                            Add to Whiteboard
                          </Button>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              );
            })}

            {/* Typing indicator */}
            {status === 'submitted' && (
              <div className="flex items-start gap-3">
                <div className="flex size-8 shrink-0 items-center justify-center rounded-full bg-primary text-primary-foreground">
                  AI
                </div>
                <div className="flex-1">
                  <div className="text-sm text-muted-foreground">
                    AI is thinking...
                  </div>
                </div>
              </div>
            )}

            {/* Stream error recovery */}
            {streamError && !isLoading && (
              <div className="flex items-start gap-3">
                <div className="flex size-8 shrink-0 items-center justify-center rounded-full bg-primary text-primary-foreground">
                  AI
                </div>
                <div className="flex-1">
                  <div className="rounded-lg border border-yellow-500/50 bg-yellow-50 dark:bg-yellow-950/20 p-3 text-sm">
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

            {/* Auto-scroll target */}
            <div ref={messagesEndRef} />
          </div>
        )}
      </div>

      {/* Suggestion pills — instant-send on click */}
      {suggestions.length > 0 && (
        <div className="flex flex-wrap gap-2 px-4 pb-2">
          {suggestions.map((suggestion, i) => (
            <button
              key={i}
              disabled={isLoading}
              onClick={() => {
                setSuggestions([]);
                sendMessage({
                  role: 'user',
                  parts: [{ type: 'text', text: suggestion }],
                });
              }}
              className={cn(
                'rounded-full border border-input bg-background px-3 py-1.5 text-xs text-foreground hover:bg-accent hover:text-accent-foreground transition-colors',
                'disabled:cursor-not-allowed disabled:opacity-50'
              )}
            >
              {suggestion}
            </button>
          ))}
        </div>
      )}

      {/* Rate limit banner */}
      {rateLimitInfo && (
        <div className="mx-4 mb-2 flex items-center gap-2 rounded-md border border-yellow-500/50 bg-yellow-50 dark:bg-yellow-950/20 px-3 py-2 text-sm text-yellow-800 dark:text-yellow-200">
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
              'flex-1 resize-none rounded-md border border-input bg-transparent px-3 py-2 text-sm shadow-xs outline-none transition-[color,box-shadow]',
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
