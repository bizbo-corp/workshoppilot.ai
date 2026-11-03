'use client';

import { useCallback, useEffect, useRef, useState, useTransition } from 'react';
import { useChat } from '@ai-sdk/react';
import { DefaultChatTransport, type UIMessage } from 'ai';
import { toast } from 'sonner';
import type { StageId, WorkshopState } from '@/lib/engine/types';
import { needsGreeting } from '@/lib/engine/stages';
import { endInterview, setActivity } from '@/actions/board';
import { useWorkshopState } from './use-workshop';
import { ChatPanel } from './chat-panel';
import { Icon } from '@/components/ui/icon';
import { cn } from '@/lib/utils';
import { ActivityRail } from './activity-rail';
import { ActivityPane } from './activity-pane';

/**
 * The room: the map of stages and activities on the left, the activity in
 * focus in the middle, the conversation with Wanda in a panel on the right. Chat and
 * boards share one state; whichever the user works in, the other side
 * catches up.
 */
export function WorkshopRoom({ workshopId, initialState, title }: { workshopId: string; initialState: WorkshopState; title: string }) {
  const { state, setState, refresh } = useWorkshopState(workshopId, initialState);
  const [railCollapsed, setRailCollapsed] = useState(false);
  const [chatWidth, setChatWidth] = useState<'closed' | 'normal' | 'wide'>('normal');
  const [viewing, setViewing] = useState<{ stage: StageId; activity: string } | null>(null);
  const greetedStage = useRef<string | null>(null);
  const [, start] = useTransition();
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
      void chat.sendMessage({ text }, { body: { mode: 'chat', text } });
    },
    [chat],
  );

  // First open of a stage: ask the facilitator to open it.
  useEffect(() => {
    if (finished || !needsGreeting(state)) return;
    if (greetedStage.current === state.stage) return;
    greetedStage.current = state.stage;
    void chat.sendMessage({ text: '' }, { body: { mode: 'greeting' } });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [state.stage, state.lastAiStage]);

  // Board activity: after a pause, give the facilitator a turn.
  const nudgeTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const onBoardChange = useCallback(
    (next: WorkshopState) => {
      setState(next);
      if (nudgeTimer.current) clearTimeout(nudgeTimer.current);
      nudgeTimer.current = setTimeout(() => {
        if (chat.status === 'streaming' || chat.status === 'submitted') return;
        void chat.sendMessage({ text: '' }, { body: { mode: 'canvas' } });
      }, 15_000);
    },
    [chat, setState],
  );

  const openActivity = useCallback(
    (id: string) => {
      start(async () => {
        const r = await setActivity(workshopId, id);
        if (!r.success) {
          toast.error(r.error);
          return;
        }
        setState(r.data.state);
        // Wanda opens the activity the user chose.
        void chat.sendMessage({ text: '' }, { body: { mode: 'greeting' } });
      });
    },
    [chat, setState, workshopId],
  );

  const leaveInterview = useCallback(() => {
    start(async () => {
      const r = await endInterview(workshopId);
      if (!r.success) {
        toast.error(r.error);
        return;
      }
      setState(r.data.state);
      send('Let\'s leave the interview there.');
    });
  }, [send, setState, workshopId]);

  return (
    <div className="flex h-full min-h-0 w-full overflow-hidden bg-background">
      <ActivityRail
        state={state}
        title={title}
        onOpenActivity={(id) => {
          setViewing(null);
          openActivity(id);
        }}
        onViewActivity={(stage, activity) => setViewing({ stage, activity })}
        viewing={viewing}
        collapsed={railCollapsed}
        onToggle={() => setRailCollapsed((v) => !v)}
      />
      <section className="scroll-quiet min-h-0 min-w-0 flex-1 overflow-y-auto bg-muted/30 p-4 lg:p-6">
        <ActivityPane workshopId={workshopId} state={state} onChange={onBoardChange} onSend={send} viewing={viewing} onBackToCurrent={() => setViewing(null)} />
      </section>
      <section
        className={cn('flex min-h-0 shrink-0 flex-col border-l border-border bg-background transition-[width] duration-200', chatWidth === 'closed' ? 'w-12' : chatWidth === 'wide' ? 'w-[400px] lg:w-[560px]' : 'w-[400px]')}
        data-chat-width={chatWidth}
      >
        {chatWidth === 'closed' ? (
          <button type="button" onClick={() => setChatWidth('normal')} aria-label="Open the chat" className="flex h-full w-full flex-col items-center gap-2 py-3 text-muted-foreground hover:bg-accent hover:text-foreground">
            <Icon name="message-circle" className="h-4 w-4" />
            <span className="text-[10px] [writing-mode:vertical-rl]">Wanda</span>
          </button>
        ) : (
          <ChatPanel
            messages={chat.messages}
            status={chat.status}
            onSend={send}
            suggestions={latestSuggestions(state, chat.messages)}
            finished={finished}
            workshopId={workshopId}
            interview={state.interview}
            onEndInterview={leaveInterview}
            width={chatWidth}
            onWidth={setChatWidth}
          />
        )}
      </section>
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
  if (lastUi && lastUi.role === 'assistant') return lastState.suggestions ?? [];
  return [];
}
