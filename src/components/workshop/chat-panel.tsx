'use client';

import * as React from 'react';
import { useChat } from '@ai-sdk/react';
import { DefaultChatTransport, type UIMessage } from 'ai';
import TextareaAutosize from 'react-textarea-autosize';
import ReactMarkdown from 'react-markdown';
import { Send } from 'lucide-react';
import { getStepByOrder } from '@/lib/workshop/step-metadata';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { useAutoSave } from '@/hooks/use-auto-save';

/**
 * Parse [SUGGESTIONS]...[/SUGGESTIONS] block from AI content.
 * Returns clean content (block removed) and extracted suggestion strings.
 */
function parseSuggestions(content: string): { cleanContent: string; suggestions: string[] } {
  const match = content.match(/\[SUGGESTIONS\]([\s\S]*?)\[\/SUGGESTIONS\]/);
  if (!match) return { cleanContent: content, suggestions: [] };

  const cleanContent = content.replace(/\[SUGGESTIONS\][\s\S]*?\[\/SUGGESTIONS\]/, '').trim();
  const suggestions = match[1]
    .split('\n')
    .map((line) => line.replace(/^[-*•]\s*/, '').trim())
    .filter((line) => line.length > 0);

  return { cleanContent, suggestions };
}

interface ChatPanelProps {
  stepOrder: number;
  sessionId: string;
  workshopId: string;
  initialMessages?: UIMessage[];
  onMessageCountChange?: (count: number) => void;
  subStep?: 'mind-mapping' | 'crazy-eights' | 'brain-writing';
}

export function ChatPanel({ stepOrder, sessionId, workshopId, initialMessages, onMessageCountChange, subStep }: ChatPanelProps) {
  const step = getStepByOrder(stepOrder);
  const messagesEndRef = React.useRef<HTMLDivElement>(null);
  const hasAutoStarted = React.useRef(false);
  const [inputValue, setInputValue] = React.useState('');
  const [suggestions, setSuggestions] = React.useState<string[]>([]);

  if (!step) {
    return (
      <div className="flex h-full items-center justify-center">
        <p className="text-muted-foreground">Step not found</p>
      </div>
    );
  }

  const transport = React.useMemo(
    () =>
      new DefaultChatTransport({
        api: '/api/chat',
        body: { sessionId, stepId: step.id, workshopId, subStep },
      }),
    [sessionId, step.id, workshopId, subStep]
  );

  const { messages, sendMessage, status } = useChat({
    transport,
    messages: initialMessages,
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

  // Auto-start: send trigger message when entering a step with no messages
  React.useEffect(() => {
    if (messages.length === 0 && status === 'ready' && !hasAutoStarted.current) {
      hasAutoStarted.current = true;
      sendMessage({
        role: 'user',
        parts: [{ type: 'text', text: '__step_start__' }],
      });
    }
  }, [messages.length, status, sendMessage]);

  // Auto-scroll to bottom when new messages arrive
  React.useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

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

  return (
    <div className="flex h-full flex-col">
      {/* Messages area */}
      <div className="flex-1 overflow-y-auto p-4">
        {messages.length === 0 ? (
          // Loading indicator while AI auto-starts
          <div className="flex items-start gap-3">
            <div className="flex size-8 shrink-0 items-center justify-center rounded-full bg-primary text-primary-foreground">
              AI
            </div>
            <div className="flex-1">
              <div className="rounded-lg bg-muted p-3 text-sm text-muted-foreground">
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
                  <div key={`${message.id}-${index}`} className="flex items-start gap-3 justify-end">
                    <div className="flex-1 max-w-[80%]">
                      <div className="rounded-lg bg-primary p-3 text-sm text-primary-foreground">
                        {content}
                      </div>
                    </div>
                  </div>
                );
              }

              // Assistant message — strip [SUGGESTIONS] block from display
              const { cleanContent } = parseSuggestions(content);
              return (
                <div key={`${message.id}-${index}`} className="flex items-start gap-3">
                  <div className="flex size-8 shrink-0 items-center justify-center rounded-full bg-primary text-primary-foreground">
                    AI
                  </div>
                  <div className="flex-1">
                    <div className="rounded-lg bg-muted p-3 text-sm prose prose-sm dark:prose-invert max-w-none">
                      <ReactMarkdown>{cleanContent}</ReactMarkdown>
                    </div>
                  </div>
                </div>
              );
            })}

            {/* Typing indicator */}
            {isLoading && (
              <div className="flex items-start gap-3">
                <div className="flex size-8 shrink-0 items-center justify-center rounded-full bg-primary text-primary-foreground">
                  AI
                </div>
                <div className="flex-1">
                  <div className="rounded-lg bg-muted p-3 text-sm text-muted-foreground">
                    AI is thinking...
                  </div>
                </div>
              </div>
            )}

            {/* Auto-scroll target */}
            <div ref={messagesEndRef} />
          </div>
        )}
      </div>

      {/* Suggestion pills */}
      {suggestions.length > 0 && (
        <div className="flex flex-wrap gap-2 px-4 pb-2">
          {suggestions.map((suggestion, i) => (
            <button
              key={i}
              onClick={() => {
                setInputValue(suggestion);
                setSuggestions([]);
              }}
              className="rounded-full border border-input bg-background px-3 py-1.5 text-xs text-foreground hover:bg-accent hover:text-accent-foreground transition-colors"
            >
              {suggestion}
            </button>
          ))}
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
            placeholder="Type your message..."
            className={cn(
              'flex-1 resize-none rounded-md border border-input bg-transparent px-3 py-2 text-sm shadow-xs outline-none transition-[color,box-shadow]',
              'placeholder:text-muted-foreground',
              'disabled:cursor-not-allowed disabled:opacity-50',
              'focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/50'
            )}
          />
          <Button
            type="submit"
            disabled={isLoading || !inputValue.trim()}
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
