'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { useChat } from '@ai-sdk/react';
import { DefaultChatTransport, type UIMessage } from 'ai';
import { cn } from '@/lib/utils';
import type { WorkshopState } from '@/lib/engine/types';
import { STAGES, STAGE_ORDER, needsGreeting } from '@/lib/engine/stages';
import { useWorkshopState } from './use-workshop';
import { ChatPanel } from './chat-panel';
import { StageRail } from './stage-rail';
import { StageBoards } from './stage-boards';

/**
 * The room: a stage rail across the top, the chat on the left, the boards
 * and fields for this stage on the right. Chat and boards share one state;
 * whichever the user works in, the other side catches up.
 */
export function WorkshopRoom({ workshopId, initialState, title }: { workshopId: string; initialState: WorkshopState; title: string }) {
  const { state, setState, refresh } = useWorkshopState(workshopId, initialState);
  const [focus, setFocus] = useState<'chat' | 'board'>('chat');
  const greetedStage = useRef<string | null>(null);
  const stage = STAGES[state.stage];
  const finished = state.completedStages.includes('deliver');

  const chat = useChat({
    id: `w-${workshopId}`,
    transport: new DefaultChatTransport({ api: `/api/w/${workshopId}/chat` }),
    messages: toUiMessages(state),
    onFinish: () => void refresh(),
    onError: (err) => console.error('[chat]', err),
  });

  const send = useCallback(
    (text: string) => {
      setFocus('chat');
      void chat.sendMessage({ text }, { body: { trigger: 'chat', text } });
    },
    [chat],
  );

  // First open of a stage: ask the facilitator to greet.
  useEffect(() => {
    if (finished || !needsGreeting(state)) return;
    if (greetedStage.current === state.stage) return;
    greetedStage.current = state.stage;
    void chat.sendMessage({ text: '' }, { body: { trigger: 'greeting' } });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [state.stage, state.stageEnteredSeq]);

  // Canvas activity: after a pause, give the facilitator a turn.
  const nudgeTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const onBoardChange = useCallback(
    (next: WorkshopState) => {
      setState(next);
      setFocus('board');
      if (nudgeTimer.current) clearTimeout(nudgeTimer.current);
      nudgeTimer.current = setTimeout(() => {
        if (chat.status === 'streaming' || chat.status === 'submitted') return;
        void chat.sendMessage({ text: '' }, { body: { trigger: 'canvas' } });
      }, 15_000);
    },
    [chat, setState],
  );

  return (
    <div className="flex h-[calc(100vh-3.5rem)] flex-col">
      <StageRail title={title} current={state.stage} completed={state.completedStages} />
      <div className="grid min-h-0 flex-1 grid-cols-1 gap-0 lg:grid-cols-[minmax(320px,2fr)_3fr]">
        <section className={cn('flex min-h-0 flex-col border-r border-border bg-card/40', focus === 'board' && 'lg:opacity-90')} onClick={() => setFocus('chat')}>
          <ChatPanel messages={chat.messages} status={chat.status} onSend={send} suggestions={latestSuggestions(state, chat.messages)} finished={finished} workshopId={workshopId} />
        </section>
        <section className="min-h-0 overflow-y-auto bg-background p-4 lg:p-6" onClick={() => setFocus('board')}>
          <header className="mb-4">
            <div className="text-xs uppercase tracking-wide text-muted-foreground">
              Stage {STAGE_ORDER.indexOf(state.stage)} of 4
            </div>
            <h2 className="text-lg font-semibold">{stage.label}</h2>
            <p className="text-sm text-muted-foreground">{stage.tagline}</p>
          </header>
          <StageBoards workshopId={workshopId} state={state} onChange={onBoardChange} />
        </section>
      </div>
    </div>
  );
}

function toUiMessages(state: WorkshopState): UIMessage[] {
  return state.messages.map((m) => ({
    id: m.id,
    role: m.role === 'ai' ? 'assistant' : 'user',
    parts: [{ type: 'text', text: m.text }],
  }));
}

function latestSuggestions(state: WorkshopState, uiMessages: UIMessage[]): string[] {
  const lastUi = uiMessages[uiMessages.length - 1];
  const lastState = state.messages[state.messages.length - 1];
  if (!lastState || lastState.role !== 'ai') return [];
  // Only show suggestions when the UI has caught up with the state (same last message).
  if (lastUi && lastUi.role === 'assistant') return lastState.suggestions ?? [];
  return [];
}
