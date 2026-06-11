'use client';

import { useState, useEffect } from 'react';
import { toast } from 'sonner';
import { Icon } from '@/components/ui/icon';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { copyToClipboard } from '@/lib/clipboard';
import type { TestScope } from '@/lib/journey-flow/types';

// ---------------------------------------------------------------------------
// Props
// ---------------------------------------------------------------------------

export interface PrototypePromptContentProps {
  sessionId: string;
  workshopId: string;
  initialPrompt: string | null;
  initialGeneratedFromFlowUpdatedAt: string | null;
  flowUpdatedAt: string;
  initialIsStale: boolean;
  testScope: TestScope;
  isReadOnly: boolean;
  backHref: string;
  backLabel: string;
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export function PrototypePromptContent({
  workshopId,
  initialPrompt,
  initialGeneratedFromFlowUpdatedAt,
  flowUpdatedAt,
  initialIsStale,
  testScope,
  isReadOnly,
}: PrototypePromptContentProps) {
  // Core state
  const [promptText, setPromptText] = useState<string | null>(initialPrompt);
  const [generatedFromFlowUpdatedAt, setGeneratedFromFlowUpdatedAt] = useState<string | null>(
    initialGeneratedFromFlowUpdatedAt
  );
  const [isStale, setIsStale] = useState(initialIsStale);

  // UI state
  const [isGenerating, setIsGenerating] = useState(false);
  const [copied, setCopied] = useState(false);
  const [expanded, setExpanded] = useState(false);
  const [helpOpen, setHelpOpen] = useState(false);

  // Reset expanded whenever the prompt changes
  useEffect(() => {
    setExpanded(false);
  }, [promptText]);

  // ---------------------------------------------------------------------------
  // Handlers
  // ---------------------------------------------------------------------------

  async function handleGenerate() {
    setIsGenerating(true);
    try {
      const res = await fetch('/api/build-pack/generate-prototype-prompt', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ workshopId }),
      });

      if (!res.ok) {
        const errBody = await res.json().catch(() => ({}));
        throw new Error((errBody as { error?: string }).error ?? 'Unknown error');
      }

      const data = await res.json() as {
        promptText: string;
        generatedFromFlowUpdatedAt: string;
      };

      setPromptText(data.promptText);
      setGeneratedFromFlowUpdatedAt(data.generatedFromFlowUpdatedAt);
      setIsStale(false);
      setExpanded(false);
    } catch (err) {
      toast.error('Failed to generate prompt', {
        description: err instanceof Error ? err.message : 'Please try again.',
      });
    } finally {
      setIsGenerating(false);
    }
  }

  async function handleCopy() {
    if (!promptText) return;
    const ok = await copyToClipboard(promptText);
    if (ok) {
      setCopied(true);
      toast.success('Prompt copied', {
        description: 'Paste into your preferred AI coding agent.',
      });
      setTimeout(() => setCopied(false), 2000);
    } else {
      toast.error('Copy failed');
    }
  }

  // ---------------------------------------------------------------------------
  // Preview logic
  // ---------------------------------------------------------------------------

  const lines = promptText ? promptText.split('\n') : [];
  const hasMoreLines = lines.length > 10;
  const previewText = !expanded && hasMoreLines ? lines.slice(0, 10).join('\n') : promptText ?? '';

  // ---------------------------------------------------------------------------
  // Staleness: check if current flowUpdatedAt differs from when prompt was generated
  // ---------------------------------------------------------------------------
  const currentlyStale =
    isStale || (!!generatedFromFlowUpdatedAt && generatedFromFlowUpdatedAt !== flowUpdatedAt);

  // ---------------------------------------------------------------------------
  // Render
  // ---------------------------------------------------------------------------

  return (
    <div className="w-full space-y-6">
      {/* Card container */}
      <div className="rounded-2xl border border-border bg-card p-6 shadow-sm sm:p-8">

        {/* Header */}
        <div className="mb-6 space-y-1">
          <h1 className="font-serif text-2xl font-semibold tracking-tight text-foreground">
            Prototype prompt builder
          </h1>
          <p className="text-sm text-muted-foreground">
            Generate a ready-to-paste prompt for any AI coding agent.
          </p>
        </div>

        {/* Fidelity switch (PROMPT-01) */}
        <div className="mb-6">
          <div
            role="radiogroup"
            aria-label="Prototype fidelity"
            className="inline-flex items-center gap-1 rounded-full border border-border bg-muted/40 p-1"
          >
            {/* Low fidelity — active, only interactive option */}
            <button
              type="button"
              aria-pressed="true"
              className="rounded-full bg-card px-4 py-1.5 text-sm font-medium text-foreground shadow-sm"
              onClick={() => {
                /* intentional no-op — already active */
              }}
            >
              Low fidelity
            </button>

            {/* High fidelity — visible but zero interaction */}
            <span
              aria-disabled="true"
              className="flex cursor-not-allowed select-none items-center rounded-full px-4 py-1.5 text-sm text-muted-foreground/60"
            >
              High fidelity
              <span className="ml-1.5 rounded-full bg-muted px-2 py-0.5 text-[10px] font-medium uppercase tracking-wide text-muted-foreground">
                Coming later
              </span>
            </span>
          </div>
        </div>

        {/* Scope label (PROMPT-05) */}
        {testScope === 'feature' && (
          <div className="mb-4 flex items-center gap-1.5 text-sm text-muted-foreground">
            <Icon name="info" className="h-4 w-4 shrink-0" />
            <span>Prompt covers your feature mini-flow</span>
          </div>
        )}

        {/* Stale notice */}
        {currentlyStale && promptText && (
          <div className="mb-4 flex items-start gap-3 rounded-xl border border-border bg-muted/40 px-4 py-3 text-sm">
            <Icon name="alert-triangle" className="mt-0.5 h-4 w-4 shrink-0 text-foreground/60" />
            <div className="flex flex-1 flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
              <span className="text-foreground/80">
                Journey Flow has changed since this prompt was generated.
              </span>
              {!isReadOnly && (
                <Button
                  type="button"
                  variant="secondary"
                  size="sm"
                  disabled={isGenerating}
                  onClick={handleGenerate}
                >
                  <Icon name="refresh" className={isGenerating ? 'animate-spin' : ''} />
                  Regenerate
                </Button>
              )}
            </div>
          </div>
        )}

        {/* No prompt yet — explanation + generate CTA */}
        {!promptText && (
          <div className="mb-4 space-y-4">
            <p className="text-sm text-foreground/70">
              Turn your Journey Flow into a ready-to-paste prototype prompt. The prompt includes
              your screens, navigation, and a persona-grounded testing goal — formatted for any AI
              coding agent.
            </p>
            {isReadOnly ? (
              <p className="text-sm text-muted-foreground">
                Only the workshop owner can generate the prompt.
              </p>
            ) : (
              <Button
                type="button"
                variant="primary"
                disabled={isGenerating}
                onClick={handleGenerate}
              >
                {isGenerating ? (
                  <>
                    <Icon name="spinner" className="animate-spin" />
                    Generating prompt…
                  </>
                ) : (
                  <>
                    <Icon name="sparkles" />
                    Generate prompt
                  </>
                )}
              </Button>
            )}
          </div>
        )}

        {/* Prompt preview */}
        {promptText && (
          <div className={isGenerating ? 'pointer-events-none opacity-50' : ''}>
            {/* Copy button — primary, always copies full text */}
            <div className="mb-3 flex items-center justify-between gap-3">
              <Button
                type="button"
                variant="primary"
                size="sm"
                onClick={handleCopy}
                disabled={isGenerating}
              >
                {copied ? (
                  <>
                    <Icon name="check" />
                    Copied ✓
                  </>
                ) : (
                  <>
                    <Icon name="copy" />
                    Copy prompt
                  </>
                )}
              </Button>

              {/* Non-stale regenerate — owner only */}
              {!currentlyStale && !isReadOnly && (
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  disabled={isGenerating}
                  onClick={handleGenerate}
                  className="text-muted-foreground"
                >
                  <Icon name={isGenerating ? 'spinner' : 'refresh'} className={isGenerating ? 'animate-spin' : ''} />
                  Regenerate
                </Button>
              )}
            </div>

            {/* Prompt text preview */}
            <div className="relative">
              <pre
                className={`whitespace-pre-wrap break-words rounded-xl border border-border bg-muted/30 p-4 font-mono text-xs text-foreground/90 ${
                  expanded ? 'max-h-[60vh] overflow-y-auto' : ''
                }`}
              >
                {previewText}
              </pre>

              {/* Bottom fade when collapsed */}
              {hasMoreLines && !expanded && (
                <div className="pointer-events-none absolute bottom-0 left-0 right-0 h-12 rounded-b-xl bg-gradient-to-t from-muted/30 to-transparent" />
              )}
            </div>

            {/* Expand / collapse control */}
            {hasMoreLines && (
              <div className="mt-2 text-center">
                <button
                  type="button"
                  onClick={() => setExpanded((v) => !v)}
                  className="text-xs text-muted-foreground underline-offset-2 hover:text-foreground hover:underline"
                >
                  {expanded ? 'Collapse' : 'Show full prompt'}
                </button>
              </div>
            )}

            {/* Generating overlay button — replaces generate CTA when re-generating with existing prompt */}
            {isGenerating && (
              <div className="mt-3">
                <Button type="button" variant="primary" disabled size="sm">
                  <Icon name="spinner" className="animate-spin" />
                  Generating prompt…
                </Button>
              </div>
            )}

            {/* Next-step instructions (PROMPT-03) */}
            <div className="mt-4 flex flex-wrap items-center gap-2 text-sm text-muted-foreground">
              <span>Paste into your preferred AI coding agent — v0, Claude, Codex, Replit</span>
              <button
                type="button"
                onClick={() => setHelpOpen(true)}
                className="inline-flex items-center gap-1 text-sm text-muted-foreground underline-offset-2 hover:text-foreground hover:underline"
              >
                <Icon name="help-circle" className="h-3.5 w-3.5" />
                How do I use this?
              </button>
            </div>
          </div>
        )}

        {/* Re-generate when prompt already exists and is NOT stale, owner only — show generate CTA for first-time under "no prompt" block */}
        {!promptText && isReadOnly && (
          <p className="mt-2 text-sm text-muted-foreground">
            Only the workshop owner can generate the prompt.
          </p>
        )}
      </div>

      {/* Help dialog */}
      <Dialog open={helpOpen} onOpenChange={setHelpOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Use your prototype prompt</DialogTitle>
          </DialogHeader>

          <ol className="mt-2 space-y-3 text-sm text-foreground/80">
            <li className="flex gap-2">
              <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-muted text-xs font-medium text-foreground">
                1
              </span>
              Copy the prompt above.
            </li>
            <li className="flex gap-2">
              <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-muted text-xs font-medium text-foreground">
                2
              </span>
              Open your preferred AI coding agent.
            </li>
            <li className="flex gap-2">
              <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-muted text-xs font-medium text-foreground">
                3
              </span>
              Paste the prompt and run it — you&apos;ll get a clickable wireframe prototype.
            </li>
          </ol>

          <div className="mt-4 flex flex-wrap gap-3">
            <a
              href="https://v0.dev"
              target="_blank"
              rel="noopener noreferrer"
              className="text-sm text-muted-foreground underline-offset-2 hover:text-foreground hover:underline"
            >
              v0
            </a>
            <a
              href="https://claude.ai"
              target="_blank"
              rel="noopener noreferrer"
              className="text-sm text-muted-foreground underline-offset-2 hover:text-foreground hover:underline"
            >
              Claude
            </a>
            <a
              href="https://chatgpt.com/codex"
              target="_blank"
              rel="noopener noreferrer"
              className="text-sm text-muted-foreground underline-offset-2 hover:text-foreground hover:underline"
            >
              Codex
            </a>
            <a
              href="https://replit.com"
              target="_blank"
              rel="noopener noreferrer"
              className="text-sm text-muted-foreground underline-offset-2 hover:text-foreground hover:underline"
            >
              Replit
            </a>
          </div>

          <DialogFooter showCloseButton />
        </DialogContent>
      </Dialog>
    </div>
  );
}
