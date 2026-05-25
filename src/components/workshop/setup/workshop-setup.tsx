'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useDebouncedCallback } from 'use-debounce';
import {
  useCanvasStore,
  useCanvasStoreApi,
} from '@/providers/canvas-store-provider';
import { useCanvasAutosave } from '@/hooks/use-canvas-autosave';
import { getStepTemplateStickyNotes } from '@/lib/canvas/template-sticky-note-config';
import {
  getRandomStaticSuggestions,
  type SetupField,
} from '@/lib/canvas/setup-suggestions-config';
import type { StickyNoteColor } from '@/stores/canvas-store';
import { Button } from '@/components/ui/button';
import { SetupCard } from './setup-card';
import { SuggestionChips } from './suggestion-chips';
import { ChallengeCard } from './challenge-card';

const FIELDS: SetupField[] = ['idea', 'problem', 'audience'];

const FIELD_META: Record<
  SetupField,
  { emoji: string; label: string; color: StickyNoteColor; placeholder: string }
> = {
  idea: {
    emoji: '💡',
    label: 'The Idea',
    color: 'yellow',
    placeholder: "What's the idea or opportunity you want to explore?",
  },
  problem: {
    emoji: '🔥',
    label: 'The Problem',
    color: 'pink',
    placeholder: 'What underlying problem or tension exists?',
  },
  audience: {
    emoji: '🎯',
    label: 'The Audience',
    color: 'blue',
    placeholder: 'Who experiences this problem most acutely?',
  },
};

type FilledMap = Record<SetupField, string>;

export function WorkshopSetup({
  workshopId,
  workshopType,
}: {
  workshopId: string;
  workshopType?: 'solo' | 'multiplayer';
}) {
  const stickyNotes = useCanvasStore((s) => s.stickyNotes);
  const addStickyNote = useCanvasStore((s) => s.addStickyNote);
  const updateStickyNote = useCanvasStore((s) => s.updateStickyNote);
  const setPendingSetupGenerate = useCanvasStore((s) => s.setPendingSetupGenerate);
  const storeApi = useCanvasStoreApi();

  // Persist solo edits to Neon (multiplayer persists via Liveblocks Storage).
  useCanvasAutosave(workshopId, 'challenge', workshopType !== 'multiplayer');

  // Seed the four template sticky notes if they don't exist yet. Mirrors the
  // client-side seeding in react-flow-canvas.tsx — the canvas isn't mounted on
  // this step, so WorkshopSetup owns it. Data stays in the sticky-note store so
  // the AI prompt's CANVAS STATE + the [CANVAS_ITEM] generation path keep working.
  const seededRef = useRef(false);
  useEffect(() => {
    if (seededRef.current) return;
    const current = storeApi.getState().stickyNotes;
    if (current.some((s) => s.templateKey)) {
      seededRef.current = true;
      return;
    }
    const defs = getStepTemplateStickyNotes('challenge');
    if (defs.length === 0) return;
    seededRef.current = true;
    for (const def of defs) {
      addStickyNote({
        id: crypto.randomUUID(),
        text: '',
        position: def.position,
        width: def.width,
        height: def.height,
        color: def.color,
        type: 'stickyNote',
        templateKey: def.key,
        templateLabel: def.label,
        placeholderText: def.placeholderText,
      });
    }
  }, [storeApi, addStickyNote]);

  // Index the template sticky notes by their key.
  const byKey = useMemo(() => {
    const m: Record<string, string> = {};
    for (const s of stickyNotes) if (s.templateKey) m[s.templateKey] = s.text ?? '';
    return m;
  }, [stickyNotes]);

  const values: FilledMap = {
    idea: byKey['idea'] ?? '',
    problem: byKey['problem'] ?? '',
    audience: byKey['audience'] ?? '',
  };
  const challengeText = byKey['challenge-statement'] ?? '';
  const filledCount = FIELDS.filter((f) => values[f].trim().length > 0).length;
  const canGenerate = filledCount >= 2;

  // Write a field's value back to its sticky note.
  const setField = useCallback(
    (field: SetupField | 'challenge-statement', text: string) => {
      const note = storeApi
        .getState()
        .stickyNotes.find((s) => s.templateKey === field);
      if (note) updateStickyNote(note.id, { text });
    },
    [storeApi, updateStickyNote],
  );

  // ---- Contextual suggestion chips -------------------------------------------
  const [suggestions, setSuggestions] = useState<Record<SetupField, string[]>>(
    () => ({
      idea: getRandomStaticSuggestions('idea'),
      problem: getRandomStaticSuggestions('problem'),
      audience: getRandomStaticSuggestions('audience'),
    }),
  );
  const [loadingSuggestions, setLoadingSuggestions] = useState(false);

  const refreshSuggestions = useDebouncedCallback(async () => {
    const current = storeApi.getState().stickyNotes;
    const filled: Partial<Record<SetupField, string>> = {};
    for (const f of FIELDS) {
      const v = current.find((s) => s.templateKey === f)?.text?.trim();
      if (v) filled[f] = v;
    }
    // Cold start (nothing filled) keeps the static suggestions.
    if (Object.keys(filled).length === 0) return;

    setLoadingSuggestions(true);
    try {
      const res = await fetch('/api/ai/setup-suggestions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ workshopId, filled }),
      });
      if (res.ok) {
        const { data } = await res.json();
        setSuggestions((prev) => ({
          idea: filled.idea ? [] : data.idea?.length ? data.idea : prev.idea,
          problem: filled.problem
            ? []
            : data.problem?.length
              ? data.problem
              : prev.problem,
          audience: filled.audience
            ? []
            : data.audience?.length
              ? data.audience
              : prev.audience,
        }));
      }
    } catch (err) {
      console.error('setup-suggestions fetch failed:', err);
    } finally {
      setLoadingSuggestions(false);
    }
  }, 600);

  // ---- Generation ------------------------------------------------------------
  const [generating, setGenerating] = useState(false);

  const handleDone = useCallback(() => {
    setGenerating(true);
    setPendingSetupGenerate(true); // chat-panel asks Wanda to draft from the board
  }, [setPendingSetupGenerate]);

  // Clear the loading state once the challenge statement lands on the board.
  useEffect(() => {
    if (challengeText.trim().length > 0) setGenerating(false);
  }, [challengeText]);

  // Safety net: don't spin forever if the model never emits a CANVAS_ITEM.
  useEffect(() => {
    if (!generating) return;
    const t = setTimeout(() => setGenerating(false), 45000);
    return () => clearTimeout(t);
  }, [generating]);

  const showChallenge = generating || challengeText.trim().length > 0;

  const statusText =
    filledCount >= 2
      ? "Looks good — generate your challenge whenever you're ready."
      : filledCount === 1
        ? 'One more card and you can generate your challenge (1 of 2).'
        : 'Fill in at least two cards to get started.';

  return (
    <div className="h-full overflow-y-auto">
      <div className="mx-auto max-w-5xl px-6 py-10 sm:px-10">
        {/* Header */}
        <header className="mb-8 max-w-2xl">
          <h1 className="font-serif text-3xl leading-[1.08] tracking-tight text-foreground sm:text-4xl md:text-5xl">
            Set up your workshop
          </h1>
          <p className="mt-3 text-sm leading-relaxed text-muted-foreground sm:text-base">
            Every great workshop starts with a focus. Jot down your idea, the
            problem behind it, and who it&apos;s for — you don&apos;t need all
            three. Fill in any two and I&apos;ll shape them into a sharp
            challenge to work from.
          </p>
        </header>

        {/* Three input cards */}
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {FIELDS.map((field) => {
            const meta = FIELD_META[field];
            const filled = values[field].trim().length > 0;
            return (
              <SetupCard
                key={field}
                color={meta.color}
                emoji={meta.emoji}
                label={meta.label}
                value={values[field]}
                placeholder={meta.placeholder}
                onChange={(text) => setField(field, text)}
                onCommit={refreshSuggestions}
              >
                {/* Chips only while the card is empty. */}
                {!filled && (
                  <SuggestionChips
                    suggestions={suggestions[field]}
                    loading={loadingSuggestions}
                    onPick={(text) => {
                      setField(field, text);
                      refreshSuggestions();
                    }}
                  />
                )}
              </SetupCard>
            );
          })}
        </div>

        {/* Status + Done */}
        <div className="mt-6 flex flex-col items-center gap-2">
          <p className="text-xs text-muted-foreground">{statusText}</p>
          <Button
            size="lg"
            disabled={!canGenerate || generating}
            onClick={handleDone}
            className={canGenerate && !generating ? 'animate-in fade-in' : ''}
          >
            {generating ? 'Drafting…' : "I'm done"}
          </Button>
        </div>

        {/* Generated challenge */}
        {showChallenge && (
          <div className="mx-auto mt-8 max-w-2xl">
            <ChallengeCard
              value={challengeText}
              generating={generating}
              onChange={(text) => setField('challenge-statement', text)}
              onRegenerate={handleDone}
            />
          </div>
        )}
      </div>
    </div>
  );
}
