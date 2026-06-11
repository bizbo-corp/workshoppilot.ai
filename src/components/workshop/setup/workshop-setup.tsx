'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
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
import { Icon } from '@/components/ui/icon';
import { SetupCard } from './setup-card';
import { SuggestionChips } from './suggestion-chips';
import { ChallengeCard } from './challenge-card';
import { IdeaTypeChooser } from './idea-type-chooser';

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
    color: 'red',
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

/** Split an audience sentence into list items (on commas and "and"). */
function parseAudienceList(text: string): string[] {
  return text
    .trim()
    .replace(/\.+$/, '')
    .split(/\s*,\s*|\s+and\s+/i)
    .map((s) => s.trim())
    .filter(Boolean);
}

/** Compose audience items into a grammatical sentence (leading cap + period). */
function formatAudienceSentence(items: string[]): string {
  const cleaned = items.map((s) => s.trim()).filter(Boolean);
  if (cleaned.length === 0) return '';
  let joined: string;
  if (cleaned.length === 1) joined = cleaned[0];
  else if (cleaned.length === 2) joined = `${cleaned[0]} and ${cleaned[1]}`;
  else
    joined = `${cleaned.slice(0, -1).join(', ')} and ${cleaned[cleaned.length - 1]}`;
  return joined.charAt(0).toUpperCase() + joined.slice(1) + '.';
}

/** Toggle a group phrase in/out of the audience list (case-insensitive). */
function toggleAudienceGroup(text: string, group: string): string {
  const items = parseAudienceList(text);
  const lower = group.trim().toLowerCase();
  const idx = items.findIndex((i) => i.toLowerCase() === lower);
  if (idx >= 0) items.splice(idx, 1);
  else items.push(group.trim());
  return formatAudienceSentence(items);
}

export function WorkshopSetup({
  workshopId,
  workshopType,
  confirmLabel,
  canConfirm = false,
  confirmed = false,
  onConfirm,
}: {
  workshopId: string;
  workshopType?: 'solo' | 'multiplayer';
  /** Label for the accept button, e.g. "Accept Challenge Statement". */
  confirmLabel?: string;
  /** Whether the challenge is ready to accept (mirrors the chat confirm gate). */
  canConfirm?: boolean;
  /** Whether the challenge has already been accepted. */
  confirmed?: boolean;
  /** Locks in the challenge — same handler the chat confirm button uses. */
  onConfirm?: () => void;
}) {
  const stickyNotes = useCanvasStore((s) => s.stickyNotes);
  const addStickyNote = useCanvasStore((s) => s.addStickyNote);
  const updateStickyNote = useCanvasStore((s) => s.updateStickyNote);
  const setBoardAdvancedAt = useCanvasStore((s) => s.setBoardAdvancedAt);
  const storeApi = useCanvasStoreApi();

  // Persist solo edits to Neon (multiplayer persists via Liveblocks Storage).
  useCanvasAutosave(workshopId, 'challenge', workshopType !== 'multiplayer');

  // Seed the four template sticky notes whenever none exist — on first mount AND
  // after an admin Reset wipes the board, so the page returns to its pristine
  // seeded state. The canvas isn't mounted on this step, so WorkshopSetup owns
  // this. Data lives in the sticky-note store so the AI prompt's CANVAS STATE +
  // the [CANVAS_ITEM] generation path keep working. (These template cards can't
  // be deleted individually, so re-seeding when none exist is safe.)
  const hasTemplates = stickyNotes.some((s) => s.templateKey);
  useEffect(() => {
    if (hasTemplates) return;
    const defs = getStepTemplateStickyNotes('challenge');
    if (defs.length === 0) return;
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
  }, [hasTemplates, addStickyNote]);

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

  // Write a field's value back to its sticky note. If the template sticky is
  // missing (e.g. a seeding race in multiplayer), create it on the spot so the
  // user can always free-type — typed input is never silently swallowed.
  const setField = useCallback(
    (field: SetupField | 'challenge-statement', text: string) => {
      const note = storeApi
        .getState()
        .stickyNotes.find((s) => s.templateKey === field);
      if (note) {
        updateStickyNote(note.id, { text });
        return;
      }
      const def = getStepTemplateStickyNotes('challenge').find(
        (d) => d.key === field,
      );
      addStickyNote({
        id: crypto.randomUUID(),
        text,
        position: def?.position ?? { x: 0, y: 0 },
        width: def?.width ?? 220,
        height: def?.height ?? 160,
        color: def?.color ?? 'yellow',
        type: 'stickyNote',
        templateKey: field,
        templateLabel: def?.label,
        placeholderText: def?.placeholderText,
      });
    },
    [storeApi, updateStickyNote, addStickyNote],
  );

  // ---- Suggestion chips ------------------------------------------------------
  // Start with instant static "canned" suggestions (no AI call, no spinner).
  const [suggestions, setSuggestions] = useState<Record<SetupField, string[]>>(
    () => ({
      idea: getRandomStaticSuggestions('idea'),
      problem: getRandomStaticSuggestions('problem'),
      audience: getRandomStaticSuggestions('audience'),
    }),
  );
  // Fields currently regenerating — only ever set by an explicit Confirm click.
  const [regenerating, setRegenerating] = useState<Set<SetupField>>(new Set());

  // Regenerate suggestions for the given fields from the current board state.
  // Triggered ONLY by the per-card Confirm button — never by typing or blur — so
  // the user can free-type without the other cards "thinking" until they're ready.
  const regenerateFor = useCallback(
    async (loadingFields: SetupField[]) => {
      if (loadingFields.length === 0) return;
      const current = storeApi.getState().stickyNotes;
      const filled: Partial<Record<SetupField, string>> = {};
      for (const f of FIELDS) {
        const v = current.find((s) => s.templateKey === f)?.text?.trim();
        if (v) filled[f] = v;
      }
      setRegenerating(new Set(loadingFields));
      try {
        const res = await fetch('/api/ai/setup-suggestions', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ workshopId, filled }),
        });
        if (res.ok) {
          const { data } = await res.json();
          // Keep previous chips for any field the endpoint returns empty for.
          setSuggestions((prev) => ({
            idea: data.idea?.length ? data.idea : prev.idea,
            problem: data.problem?.length ? data.problem : prev.problem,
            audience: data.audience?.length ? data.audience : prev.audience,
          }));
        }
      } catch (err) {
        console.error('setup-suggestions fetch failed:', err);
      } finally {
        setRegenerating(new Set());
      }
    },
    [storeApi, workshopId],
  );

  // Confirm a card → regenerate suggestions for the OTHER still-empty cards.
  const handleConfirm = useCallback(
    (confirmedField: SetupField) => {
      const notes = storeApi.getState().stickyNotes;
      const targets = FIELDS.filter(
        (f) =>
          f !== confirmedField &&
          (notes.find((s) => s.templateKey === f)?.text?.trim() ?? '') === '',
      );
      regenerateFor(targets);
      // Board advanced directly → let the chat clear any now-stale suggestions.
      setBoardAdvancedAt(Date.now());
    },
    [storeApi, regenerateFor, setBoardAdvancedAt],
  );

  // ---- Per-card actions (polish / elaborate / regenerate) --------------------
  const [busyField, setBusyField] = useState<
    SetupField | 'challenge-statement' | null
  >(null);

  const runCardAction = useCallback(
    async (
      field: SetupField | 'challenge-statement',
      action: 'polish' | 'elaborate' | 'regenerate',
      instructions?: string,
    ) => {
      const currentText =
        storeApi.getState().stickyNotes.find((s) => s.templateKey === field)
          ?.text ?? '';
      setBusyField(field);
      try {
        const res = await fetch('/api/ai/setup-card-action', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ workshopId, field, action, currentText, instructions }),
        });
        if (res.ok) {
          const { data } = await res.json();
          if (data?.text) setField(field, data.text);
        } else {
          console.error('setup-card-action failed:', await res.text());
        }
      } catch (err) {
        console.error('setup-card-action error:', err);
      } finally {
        setBusyField(null);
      }
    },
    [storeApi, workshopId, setField],
  );

  // ---- Generation ------------------------------------------------------------
  // The challenge is generated through the SAME fast structured endpoint as the
  // per-card actions (runCardAction → /api/ai/setup-card-action), not the chat
  // pipeline — so it returns in ~1s instead of waiting on a full streamed reply.
  const challengeExists = challengeText.trim().length > 0;
  const challengeBusy = busyField === 'challenge-statement';

  const generateChallenge = useCallback(() => {
    setBoardAdvancedAt(Date.now());
    return runCardAction('challenge-statement', 'regenerate');
  }, [runCardAction, setBoardAdvancedAt]);

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

            // Audience is multi-select: pills stay visible and compose a
            // sentence as you toggle groups on/off. Idea/problem are single-pick
            // and their chips disappear once the card has content.
            const isAudience = field === 'audience';

            return (
              <SetupCard
                key={field}
                color={meta.color}
                emoji={meta.emoji}
                label={meta.label}
                value={values[field]}
                placeholder={meta.placeholder}
                busy={busyField === field}
                onChange={(text) => setField(field, text)}
                onConfirm={() => handleConfirm(field)}
                onPolish={() => runCardAction(field, 'polish')}
                onElaborate={(instructions) =>
                  runCardAction(field, 'elaborate', instructions)
                }
                onRegenerate={() => runCardAction(field, 'regenerate')}
                onReset={() => setField(field, '')}
              >
                {isAudience ? (
                  <SuggestionChips
                    suggestions={suggestions.audience}
                    loading={regenerating.has('audience')}
                    variant="inline"
                    label="Who's it for? Pick any that apply"
                    selected={parseAudienceList(values.audience)}
                    onPick={(group) =>
                      setField(
                        'audience',
                        toggleAudienceGroup(values.audience, group),
                      )
                    }
                  />
                ) : (
                  !filled && (
                    <SuggestionChips
                      suggestions={suggestions[field]}
                      loading={regenerating.has(field)}
                      variant="stack"
                      onPick={(text) => setField(field, text)}
                    />
                  )
                )}
              </SetupCard>
            );
          })}
        </div>

        {/* Status + Generate */}
        <div className="mt-6 flex flex-col items-center gap-2">
          {!canGenerate && (
            <p className="text-xs text-muted-foreground">{statusText}</p>
          )}
          <Button
            size="lg"
            disabled={!canGenerate || challengeBusy}
            onClick={generateChallenge}
            className={canGenerate && !challengeBusy ? 'animate-in fade-in' : ''}
          >
            {challengeBusy
              ? 'Drafting…'
              : challengeExists
                ? 'Regenerate Workshop Challenge'
                : 'Generate Workshop Challenge'}
          </Button>
          <p className="max-w-sm text-center text-xs text-muted-foreground">
            Takes the idea, problem, and audience above and{' '}
            {challengeExists ? 'redrafts' : 'drafts'} your workshop challenge.
          </p>
        </div>

        {/* Generated challenge — always visible (spans the full width of the
            three cards above); shows a faint placeholder until the user
            generates, so it's clear what the cards above feed into. */}
        <div className="mt-8">
          <ChallengeCard
            value={challengeText}
            generating={challengeBusy && !challengeExists}
            busy={challengeBusy && challengeExists}
            onChange={(text) => setField('challenge-statement', text)}
            onPolish={() => runCardAction('challenge-statement', 'polish')}
            onElaborate={(instructions) =>
              runCardAction('challenge-statement', 'elaborate', instructions)
            }
            onRegenerate={() => runCardAction('challenge-statement', 'regenerate')}
          />

          {/* Accept the challenge right here on the board — mirrors the confirm
              button in the chat panel so users don't have to switch over to
              the chat to lock it in. Shows once the statement is ready. */}
          {confirmLabel && (confirmed || canConfirm) && (
            <div className="mt-4 flex justify-center">
              {confirmed ? (
                <span className="inline-flex items-center gap-2 rounded-full border border-olive-400 bg-olive-50 px-4 py-2 text-sm font-medium text-olive-800 dark:border-olive-700 dark:bg-olive-950/30 dark:text-olive-300">
                  <Icon name="check-circle" className="h-4 w-4" />
                  Challenge accepted
                </span>
              ) : (
                <button
                  onClick={onConfirm}
                  className="inline-flex items-center gap-2 rounded-full border border-olive-400 bg-olive-50 px-5 py-2.5 text-sm font-medium text-olive-800 transition-colors hover:bg-olive-100 dark:border-olive-700 dark:bg-olive-950/30 dark:text-olive-300 dark:hover:bg-olive-900/40"
                >
                  <Icon name="check-circle" className="h-4 w-4" />
                  {confirmLabel}
                </button>
              )}
            </div>
          )}

          {/* Early idea-type capture — appears once the challenge is accepted.
              AI guesses, user confirms/corrects; seeds the same classification
              record the Validate step reads, so Steps 2–10 stay type-aware. */}
          <IdeaTypeChooser workshopId={workshopId} active={confirmed} />
        </div>
      </div>
    </div>
  );
}
