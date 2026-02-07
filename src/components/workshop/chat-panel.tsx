'use client';

import * as React from 'react';
import TextareaAutosize from 'react-textarea-autosize';
import { Send } from 'lucide-react';
import { getStepByOrder } from '@/lib/workshop/step-metadata';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

interface ChatPanelProps {
  stepOrder: number;
}

export function ChatPanel({ stepOrder }: ChatPanelProps) {
  const step = getStepByOrder(stepOrder);

  if (!step) {
    return (
      <div className="flex h-full items-center justify-center">
        <p className="text-muted-foreground">Step not found</p>
      </div>
    );
  }

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    // Enter without Shift sends (when enabled)
    // Shift+Enter adds newline
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      // Would send message here when enabled
    }
  };

  return (
    <div className="flex h-full flex-col">
      {/* Messages area */}
      <div className="flex-1 overflow-y-auto p-4">
        {/* AI greeting message */}
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
      </div>

      {/* Input area */}
      <div className="border-t bg-background p-4">
        <div className="flex gap-2">
          <TextareaAutosize
            minRows={1}
            maxRows={6}
            disabled
            placeholder="AI facilitation coming soon..."
            onKeyDown={handleKeyDown}
            className={cn(
              'flex-1 resize-none rounded-md border border-input bg-transparent px-3 py-2 text-sm shadow-xs outline-none transition-[color,box-shadow]',
              'placeholder:text-muted-foreground',
              'disabled:cursor-not-allowed disabled:opacity-50',
              'focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/50'
            )}
          />
          <Button
            disabled
            size="icon"
            variant="default"
            aria-label="Send message"
          >
            <Send />
          </Button>
        </div>
      </div>
    </div>
  );
}
