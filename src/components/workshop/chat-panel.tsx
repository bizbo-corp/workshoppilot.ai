'use client';

import { useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import ReactMarkdown from 'react-markdown';
import type { UIMessage } from 'ai';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Icon } from '@/components/ui/icon';
import { FACILITATOR } from '@/lib/engine/stages';
import type { WorkshopState } from '@/lib/engine/types';

interface Props {
  messages: UIMessage[];
  status: 'submitted' | 'streaming' | 'ready' | 'error';
  onSend: (text: string) => void;
  suggestions: string[];
  finished: boolean;
  workshopId: string;
  interview: WorkshopState['interview'];
  onEndInterview: () => void;
}

/**
 * The conversation with Wanda. During a practice interview the panel says
 * so at the top and her replies carry the interviewee's initial instead,
 * so nobody mistakes a practice answer for a real one.
 */
export function ChatPanel({ messages, status, onSend, suggestions, finished, workshopId, interview, onEndInterview }: Props) {
  const [draft, setDraft] = useState('');
  const bottom = useRef<HTMLDivElement>(null);
  const busy = status === 'submitted' || status === 'streaming';

  const firstPaint = useRef(true);
  useEffect(() => {
    bottom.current?.scrollIntoView({ behavior: firstPaint.current ? 'instant' : 'smooth', block: 'end' });
    firstPaint.current = false;
  }, [messages, status]);

  function submit() {
    const text = draft.trim();
    if (!text || busy) return;
    setDraft('');
    onSend(text);
  }

  const visible = messages.filter((m) => {
    const t = textOf(m).trim();
    return t && t !== '(quiet)';
  });

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <div className="flex items-center gap-2.5 border-b border-border px-4 py-2.5">
        <Avatar label={FACILITATOR.name} emoji={FACILITATOR.emoji} />
        <div className="min-w-0">
          <div className="text-sm font-medium leading-tight">{FACILITATOR.name}</div>
          <div className="text-[11px] text-muted-foreground">Your facilitator</div>
        </div>
      </div>

      {interview && (
        <div className="flex items-center gap-2 border-b border-border bg-muted/60 px-4 py-2 text-xs" data-interview-banner>
          <Icon name="users" className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
          <span className="min-w-0 flex-1">
            <span className="font-medium">Practice interview with {interview.name}.</span> Wanda is playing a part. Nothing said here is evidence. {interview.questions} of 4 questions asked.
          </span>
          <button type="button" onClick={onEndInterview} className="shrink-0 rounded-md border border-border bg-background px-2 py-0.5 text-[11px] hover:bg-accent">
            End interview
          </button>
        </div>
      )}

      <div className="scroll-quiet min-h-0 flex-1 space-y-4 overflow-y-auto overflow-x-hidden px-4 py-4">
        {visible.map((m, i) => {
          const isUser = m.role === 'user';
          const asInterviewee = !isUser && interview && i === visible.length - 1;
          return (
            <div key={m.id} className={cn('flex gap-2.5', isUser ? 'justify-end' : 'justify-start')}>
              {!isUser && <Avatar label={asInterviewee ? interview.name : FACILITATOR.name} emoji={asInterviewee ? undefined : FACILITATOR.emoji} small />}
              <div className={cn('max-w-[85%] break-words rounded-xl px-3.5 py-2.5 text-sm leading-relaxed', isUser ? 'bg-foreground text-background' : 'border border-border bg-card')}>
                {isUser ? (
                  <p className="whitespace-pre-wrap">{textOf(m)}</p>
                ) : (
                  <div className="prose prose-sm max-w-none dark:prose-invert prose-p:my-1.5 prose-ul:my-1.5 prose-strong:text-foreground">
                    <ReactMarkdown>{textOf(m)}</ReactMarkdown>
                  </div>
                )}
              </div>
            </div>
          );
        })}
        {busy && (
          <div className="flex items-center gap-2 pl-9 text-xs text-muted-foreground">
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
            <div className="mb-2 flex flex-wrap gap-1.5" data-suggestions>
              {suggestions.map((s) => (
                <button key={s} type="button" onClick={() => onSend(s)} className="rounded-full border border-border bg-background px-3 py-1 text-xs hover:bg-accent">
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
              placeholder={interview ? `Ask ${interview.name} a question` : 'Reply, or work on the board'}
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

function Avatar({ label, emoji, small }: { label: string; emoji?: string; small?: boolean }) {
  return (
    <div className={cn('flex shrink-0 items-center justify-center rounded-full bg-muted font-medium text-foreground', small ? 'h-7 w-7 text-xs' : 'h-8 w-8 text-sm')} aria-hidden>
      {emoji ?? label.slice(0, 1).toUpperCase()}
    </div>
  );
}

function textOf(m: UIMessage): string {
  return m.parts
    .filter((p): p is Extract<UIMessage['parts'][number], { type: 'text' }> => p.type === 'text')
    .map((p) => p.text)
    .join('');
}
