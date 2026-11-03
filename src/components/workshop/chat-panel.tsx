'use client';

import { useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import ReactMarkdown from 'react-markdown';
import type { UIMessage } from 'ai';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Icon } from '@/components/ui/icon';

interface Props {
  messages: UIMessage[];
  status: 'submitted' | 'streaming' | 'ready' | 'error';
  onSend: (text: string) => void;
  suggestions: string[];
  finished: boolean;
  workshopId: string;
}

export function ChatPanel({ messages, status, onSend, suggestions, finished, workshopId }: Props) {
  const [draft, setDraft] = useState('');
  const bottom = useRef<HTMLDivElement>(null);
  const busy = status === 'submitted' || status === 'streaming';

  useEffect(() => {
    bottom.current?.scrollIntoView({ behavior: 'smooth', block: 'end' });
  }, [messages, status]);

  function submit() {
    const text = draft.trim();
    if (!text || busy) return;
    setDraft('');
    onSend(text);
  }

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <div className="min-h-0 flex-1 space-y-4 overflow-y-auto px-4 py-4">
        {messages
          .filter((m) => m.parts.some((p) => p.type === 'text' && p.text.trim()))
          .map((m) => (
            <div key={m.id} className={cn('flex', m.role === 'user' ? 'justify-end' : 'justify-start')}>
              <div
                className={cn(
                  'max-w-[85%] rounded-2xl px-4 py-2.5 text-sm leading-relaxed',
                  m.role === 'user' ? 'bg-primary text-primary-foreground' : 'bg-card border border-border',
                )}
              >
                {m.role === 'user' ? (
                  <p className="whitespace-pre-wrap">{textOf(m)}</p>
                ) : (
                  <div className="prose prose-sm max-w-none dark:prose-invert prose-p:my-1.5 prose-ul:my-1.5">
                    <ReactMarkdown>{textOf(m)}</ReactMarkdown>
                  </div>
                )}
              </div>
            </div>
          ))}
        {busy && (
          <div className="flex items-center gap-2 text-xs text-muted-foreground">
            <Icon name="spinner" className="h-3.5 w-3.5 animate-spin" /> thinking
          </div>
        )}
        {finished && (
          <div className="rounded-lg border border-border bg-card p-4 text-sm">
            <p className="font-medium">That is the workshop done.</p>
            <p className="mt-1 text-muted-foreground">Your summary is ready, and the Verdict is one step further.</p>
            <Button asChild variant="primary" size="sm" className="mt-3">
              <Link href={`/w/${workshopId}/summary`}>See the summary</Link>
            </Button>
          </div>
        )}
        <div ref={bottom} />
      </div>

      {!finished && (
        <div className="border-t border-border p-3">
          {suggestions.length > 0 && !busy && (
            <div className="mb-2 flex flex-wrap gap-1.5">
              {suggestions.map((s) => (
                <button
                  key={s}
                  type="button"
                  onClick={() => onSend(s)}
                  className="rounded-full border border-border bg-card px-3 py-1 text-xs hover:bg-accent"
                >
                  {s}
                </button>
              ))}
            </div>
          )}
          <form
            onSubmit={(e) => {
              e.preventDefault();
              submit();
            }}
            className="flex items-end gap-2"
          >
            <textarea
              value={draft}
              onChange={(e) => setDraft(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && !e.shiftKey) {
                  e.preventDefault();
                  submit();
                }
              }}
              rows={2}
              placeholder="Reply, or work on the board"
              className="min-h-[44px] flex-1 resize-none rounded-md border border-border bg-background px-3 py-2 text-sm outline-none focus-visible:ring-2 focus-visible:ring-ring/40"
            />
            <Button type="submit" variant="primary" size="icon" disabled={busy || !draft.trim()} aria-label="Send">
              <Icon name="send" className="h-4 w-4" />
            </Button>
          </form>
        </div>
      )}
    </div>
  );
}

function textOf(m: UIMessage): string {
  return m.parts
    .filter((p): p is Extract<UIMessage['parts'][number], { type: 'text' }> => p.type === 'text')
    .map((p) => p.text)
    .join('');
}
