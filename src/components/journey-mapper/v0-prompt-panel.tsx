'use client';

import { useState } from 'react';
import { X, Copy, Check, ExternalLink, Loader2, FileCode2, AlertCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface V0Result {
  demoUrl: string;
  editorUrl: string;
  files: { name: string; content: string }[];
}

interface V0PromptPanelProps {
  prompt: string;
  buildPackId?: string | null;
  workshopId?: string;
  onClose: () => void;
}

export function V0PromptPanel({ prompt, buildPackId, workshopId, onClose }: V0PromptPanelProps) {
  const [copied, setCopied] = useState(false);
  const [isCreating, setIsCreating] = useState(false);
  const [v0Result, setV0Result] = useState<V0Result | null>(null);
  const [v0Error, setV0Error] = useState<string | null>(null);

  const handleCopy = async () => {
    await navigator.clipboard.writeText(prompt);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleCreateOnV0 = async () => {
    if (!buildPackId) return;
    setIsCreating(true);
    setV0Error(null);
    try {
      const res = await fetch('/api/build-pack/create-v0-chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ buildPackId }),
      });

      if (res.status === 503) {
        setV0Error('v0 API key not configured. Add V0_API_KEY to your environment variables.');
        return;
      }

      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error || 'Failed to create prototype');
      }

      const data = await res.json();
      setV0Result({
        demoUrl: data.demoUrl,
        editorUrl: data.editorUrl,
        files: data.files ?? [],
      });
    } catch (err) {
      setV0Error(err instanceof Error ? err.message : 'Failed to create prototype');
    } finally {
      setIsCreating(false);
    }
  };

  return (
    <div className="absolute right-0 top-0 bottom-0 w-[420px] bg-background border-l shadow-lg z-50 flex flex-col">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b">
        <h3 className="text-sm font-semibold">v0 Prompt</h3>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={handleCopy}
            className="h-7 text-xs gap-1.5"
          >
            {copied ? <Check className="h-3 w-3" /> : <Copy className="h-3 w-3" />}
            {copied ? 'Copied' : 'Copy'}
          </Button>
          <button
            onClick={onClose}
            className="p-1 rounded-md hover:bg-muted transition-colors"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
      </div>

      {/* Create on v0 section */}
      {buildPackId && !v0Result && (
        <div className="px-4 py-3 border-b space-y-2">
          <Button
            onClick={handleCreateOnV0}
            disabled={isCreating}
            className="w-full gap-2"
            size="sm"
          >
            {isCreating ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                Creating prototype...
              </>
            ) : (
              <>
                <ExternalLink className="h-4 w-4" />
                Create on v0
              </>
            )}
          </Button>
          {v0Error && (
            <div className="flex items-start gap-2 text-xs text-destructive">
              <AlertCircle className="h-3.5 w-3.5 mt-0.5 shrink-0" />
              <div>
                <p>{v0Error}</p>
                {!v0Error.includes('API key') && (
                  <button
                    onClick={handleCreateOnV0}
                    className="underline mt-1 hover:no-underline"
                  >
                    Retry
                  </button>
                )}
              </div>
            </div>
          )}
        </div>
      )}

      {/* v0 Result */}
      {v0Result && (
        <div className="px-4 py-3 border-b space-y-2">
          <div className="flex items-center gap-2 text-xs text-green-600 dark:text-green-400 font-medium">
            <Check className="h-3.5 w-3.5" />
            Prototype created
          </div>
          <div className="flex flex-wrap gap-2">
            {v0Result.demoUrl && (
              <a
                href={v0Result.demoUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1.5 text-xs font-medium text-primary hover:underline"
              >
                <ExternalLink className="h-3 w-3" />
                Demo
              </a>
            )}
            {v0Result.editorUrl && (
              <a
                href={v0Result.editorUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1.5 text-xs font-medium text-primary hover:underline"
              >
                <ExternalLink className="h-3 w-3" />
                Edit in v0
              </a>
            )}
            {v0Result.files.length > 0 && (
              <span className="inline-flex items-center gap-1 text-xs text-muted-foreground">
                <FileCode2 className="h-3 w-3" />
                {v0Result.files.length} file{v0Result.files.length !== 1 ? 's' : ''}
              </span>
            )}
          </div>
        </div>
      )}

      {/* Content */}
      <div className="flex-1 overflow-y-auto p-4">
        <pre className="text-xs text-foreground/90 whitespace-pre-wrap font-mono leading-relaxed">
          {prompt}
        </pre>
      </div>
    </div>
  );
}
