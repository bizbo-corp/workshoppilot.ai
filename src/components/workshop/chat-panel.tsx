'use client';

import * as React from 'react';
import { useChat } from '@ai-sdk/react';
import { DefaultChatTransport, type UIMessage } from 'ai';
import TextareaAutosize from 'react-textarea-autosize';
import { Send } from 'lucide-react';
import { getStepByOrder } from '@/lib/workshop/step-metadata';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { useAutoSave } from '@/hooks/use-auto-save';

interface ChatPanelProps {
  stepOrder: number;
  sessionId: string;
  workshopId: string;
  initialMessages?: UIMessage[];
  onMessageCountChange?: (count: number) => void;
}

export function ChatPanel({ stepOrder, sessionId, workshopId, initialMessages, onMessageCountChange }: ChatPanelProps) {
  const step = getStepByOrder(stepOrder);
  const messagesEndRef = React.useRef<HTMLDivElement>(null);
  const [inputValue, setInputValue] = React.useState('');

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
        body: { sessionId, stepId: step.id, workshopId },
      }),
    [sessionId, step.id, workshopId]
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
          // Welcome message when chat is empty
          <div className="flex items-start gap-3">
            <div className="flex size-8 shrink-0 items-center justify-center rounded-full bg-primary text-primary-foreground">
              AI
            </div>
            <div className="flex-1">
              <div className="rounded-lg bg-muted p-3 text-sm">
                {step.greeting}
              </div>
            </div>
          </div>
        ) : (
          // Render conversation messages
          <div className="space-y-4">
            {messages.map((message) => {
              const textParts = message.parts?.filter((part) => part.type === 'text') || [];
              const content = textParts.map((part) => part.text).join('\n');

              if (message.role === 'user') {
                return (
                  <div key={message.id} className="flex items-start gap-3 justify-end">
                    <div className="flex-1 max-w-[80%]">
                      <div className="rounded-lg bg-primary p-3 text-sm text-primary-foreground">
                        {content}
                      </div>
                    </div>
                  </div>
                );
              }

              // Assistant message
              return (
                <div key={message.id} className="flex items-start gap-3">
                  <div className="flex size-8 shrink-0 items-center justify-center rounded-full bg-primary text-primary-foreground">
                    AI
                  </div>
                  <div className="flex-1">
                    <div className="rounded-lg bg-muted p-3 text-sm whitespace-pre-wrap">
                      {content}
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
