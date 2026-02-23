'use client';

import * as React from 'react';
import { Check, Copy, ExternalLink, Loader2, RefreshCw, Zap, AlertTriangle, Code2, Fullscreen, Link2 } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';

type DialogState = 'idle' | 'generating-prd' | 'prd-ready' | 'creating-v0' | 'v0-ready' | 'v0-error';

interface V0Data {
  demoUrl: string;
  chatId: string;
  editorUrl: string;
  files: Array<{ name: string; content: string }>;
}

interface PrdViewerDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  workshopId: string;
}

export function PrdViewerDialog({ open, onOpenChange, workshopId }: PrdViewerDialogProps) {
  const [state, setState] = React.useState<DialogState>('idle');
  const [prompt, setPrompt] = React.useState('');
  const [systemPrompt, setSystemPrompt] = React.useState('');
  const [conceptName, setConceptName] = React.useState('');
  const [buildPackId, setBuildPackId] = React.useState<string | null>(null);
  const [v0Data, setV0Data] = React.useState<V0Data | null>(null);
  const [error, setError] = React.useState<string | null>(null);
  const [v0Available, setV0Available] = React.useState<boolean | null>(null);
  const [showFiles, setShowFiles] = React.useState(false);
  const [activeTab, setActiveTab] = React.useState('prompt');
  const [copied, setCopiedLink] = React.useState(false);

  // Check V0 availability on mount
  React.useEffect(() => {
    if (open && v0Available === null) {
      fetch('/api/build-pack/create-v0-chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ buildPackId: '__check__' }),
      }).then((res) => {
        // 503 means no API key; 400 means key exists but bad input (expected)
        setV0Available(res.status !== 503);
      }).catch(() => setV0Available(false));
    }
  }, [open, v0Available]);

  // Auto-generate on open if idle
  React.useEffect(() => {
    if (open && state === 'idle') {
      handleGenerate();
    }
  }, [open]);

  const handleGenerate = async () => {
    setState('generating-prd');
    setError(null);

    try {
      const res = await fetch('/api/build-pack/generate-prd', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ workshopId }),
      });

      const data = await res.json();

      if (!res.ok) {
        setError(data.error || 'Failed to generate prompt');
        setState('idle');
        return;
      }

      setPrompt(data.prompt);
      setSystemPrompt(data.systemPrompt);
      setConceptName(data.conceptName);
      setBuildPackId(data.buildPackId);

      // If cached result has V0 data, restore it
      if (data.cached) {
        // Check if we have V0 data cached
        try {
          const checkRes = await fetch('/api/build-pack/generate-prd', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ workshopId }),
          });
          const checkData = await checkRes.json();
          // V0 data would be in the content JSON if previously generated
          // Just show prompt ready state for now
        } catch {
          // Ignore
        }
      }

      setState('prd-ready');
      setActiveTab('prompt');
    } catch {
      setError('Network error. Please try again.');
      setState('idle');
    }
  };

  const handleCreateV0 = async () => {
    if (!buildPackId) return;

    setState('creating-v0');
    setError(null);

    try {
      const res = await fetch('/api/build-pack/create-v0-chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ buildPackId }),
      });

      const data = await res.json();

      if (!res.ok) {
        setError(data.error || 'Failed to create V0 prototype');
        setState('v0-error');
        return;
      }

      setV0Data(data);
      setState('v0-ready');
      setActiveTab('preview');
    } catch {
      setError('Network error connecting to V0. Please try again.');
      setState('v0-error');
    }
  };

  const handleRegenerate = () => {
    // Reset state for fresh generation
    setPrompt('');
    setSystemPrompt('');
    setConceptName('');
    setBuildPackId(null);
    setV0Data(null);
    setError(null);
    setCopiedLink(false);
    handleGenerate();
  };

  // Build fullscreen URL from V0 demo URL by adding f=1 param
  const fullscreenUrl = React.useMemo(() => {
    if (!v0Data?.demoUrl) return null;
    const url = new URL(v0Data.demoUrl);
    url.searchParams.set('f', '1');
    return url.toString();
  }, [v0Data?.demoUrl]);

  const handleCopyLink = async () => {
    if (!fullscreenUrl) return;
    await navigator.clipboard.writeText(fullscreenUrl);
    setCopiedLink(true);
    setTimeout(() => setCopiedLink(false), 2000);
  };

  const isLoading = state === 'generating-prd' || state === 'creating-v0';

  return (
    <Dialog open={open} onOpenChange={isLoading ? undefined : onOpenChange}>
      <DialogContent className="sm:max-w-[700px] max-h-[85vh] flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Zap className="h-5 w-5 text-primary" />
            {conceptName ? `Prototype: ${conceptName}` : 'Generate Prototype'}
          </DialogTitle>
          <DialogDescription>
            {state === 'generating-prd' && 'Synthesizing your workshop into a prototype prompt...'}
            {state === 'prd-ready' && 'Your V0 prompt is ready. Copy it or create directly in V0.'}
            {state === 'creating-v0' && 'Creating your prototype in V0... This may take 30-60 seconds.'}
            {state === 'v0-ready' && 'Your prototype is ready! Preview it below or open in V0 to edit.'}
            {state === 'v0-error' && 'V0 generation failed. You can still copy the prompt manually.'}
            {state === 'idle' && !error && 'Preparing to generate your prototype prompt...'}
            {state === 'idle' && error && 'Something went wrong.'}
          </DialogDescription>
        </DialogHeader>

        {/* Loading state */}
        {state === 'generating-prd' && (
          <div className="flex flex-col items-center justify-center py-12 gap-3">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
            <p className="text-sm text-muted-foreground">Analyzing workshop artifacts...</p>
          </div>
        )}

        {state === 'creating-v0' && (
          <div className="flex flex-col items-center justify-center py-12 gap-3">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
            <p className="text-sm text-muted-foreground">V0 is building your prototype...</p>
            <p className="text-xs text-muted-foreground/70">This typically takes 30-60 seconds</p>
          </div>
        )}

        {/* Error state */}
        {error && state === 'idle' && (
          <div className="flex flex-col items-center justify-center py-8 gap-3">
            <AlertTriangle className="h-8 w-8 text-destructive" />
            <p className="text-sm text-destructive text-center max-w-md">{error}</p>
          </div>
        )}

        {/* Content tabs */}
        {(state === 'prd-ready' || state === 'v0-ready' || state === 'v0-error') && (
          <Tabs value={activeTab} onValueChange={setActiveTab} className="flex-1 min-h-0 flex flex-col">
            <TabsList className="w-full">
              <TabsTrigger value="prompt" className="flex-1">Prompt</TabsTrigger>
              <TabsTrigger value="system" className="flex-1">System Prompt</TabsTrigger>
              {(state === 'v0-ready') && (
                <TabsTrigger value="preview" className="flex-1">Preview</TabsTrigger>
              )}
            </TabsList>

            <TabsContent value="prompt" className="flex-1 min-h-0 mt-3">
              <div className="relative">
                <CopyButton text={prompt} />
                <div className="max-h-[45vh] overflow-y-auto rounded-md border bg-muted/30 p-4">
                  <pre className="whitespace-pre-wrap text-sm leading-relaxed font-sans">{prompt}</pre>
                </div>
              </div>
            </TabsContent>

            <TabsContent value="system" className="flex-1 min-h-0 mt-3">
              <div className="relative">
                <CopyButton text={systemPrompt} />
                <div className="max-h-[45vh] overflow-y-auto rounded-md border bg-muted/30 p-4">
                  <pre className="whitespace-pre-wrap text-sm leading-relaxed font-mono">{systemPrompt}</pre>
                </div>
              </div>
            </TabsContent>

            {state === 'v0-ready' && v0Data && (
              <TabsContent value="preview" className="flex-1 min-h-0 mt-3 flex flex-col gap-3">
                {/* Iframe preview */}
                <div className="flex-1 min-h-[350px] rounded-md border overflow-hidden">
                  <iframe
                    src={v0Data.demoUrl}
                    className="h-full w-full"
                    title="V0 Prototype Preview"
                    sandbox="allow-scripts allow-same-origin allow-popups"
                  />
                </div>

                {/* Source files (collapsible) */}
                {v0Data.files && v0Data.files.length > 0 && (
                  <div>
                    <button
                      onClick={() => setShowFiles(!showFiles)}
                      className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors"
                    >
                      <Code2 className="h-4 w-4" />
                      {showFiles ? 'Hide' : 'View'} Source Files ({v0Data.files.length})
                    </button>
                    {showFiles && (
                      <div className="mt-2 max-h-[30vh] overflow-y-auto space-y-2">
                        {v0Data.files.map((file, idx) => (
                          <div key={idx} className="rounded-md border">
                            <div className="flex items-center justify-between bg-muted/50 px-3 py-1.5 text-xs font-mono">
                              {file.name}
                              <CopyButton text={file.content} size="sm" />
                            </div>
                            <pre className="max-h-[200px] overflow-auto p-3 text-xs font-mono">{file.content}</pre>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                )}
              </TabsContent>
            )}
          </Tabs>
        )}

        {/* Fullscreen prototype link */}
        {fullscreenUrl && (
          <div className="flex items-center gap-3 rounded-lg border border-primary/30 bg-primary/5 px-4 py-3">
            <Link2 className="h-4 w-4 text-primary shrink-0" />
            <div className="flex-1 min-w-0">
              <p className="text-xs text-muted-foreground">Shareable prototype link</p>
              <a
                href={fullscreenUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="text-sm font-medium text-primary hover:underline truncate block"
              >
                {fullscreenUrl}
              </a>
            </div>
            <button
              onClick={handleCopyLink}
              className="shrink-0 rounded-md p-1.5 text-muted-foreground hover:text-foreground transition-colors"
              title="Copy link"
            >
              {copied ? <Check className="h-4 w-4 text-green-600" /> : <Copy className="h-4 w-4" />}
            </button>
          </div>
        )}

        {/* Footer actions */}
        <DialogFooter className="flex-row gap-2 sm:justify-between">
          <div className="flex gap-2">
            {(state === 'prd-ready' || state === 'v0-ready' || state === 'v0-error') && (
              <Button variant="outline" size="sm" onClick={handleRegenerate}>
                <RefreshCw className="h-4 w-4" />
                Regenerate
              </Button>
            )}
          </div>
          <div className="flex gap-2">
            {state === 'v0-ready' && v0Data && fullscreenUrl && (
              <Button size="sm" variant="outline" asChild>
                <a href={fullscreenUrl} target="_blank" rel="noopener noreferrer">
                  <Fullscreen className="h-4 w-4" />
                  Full Screen
                </a>
              </Button>
            )}
            {state === 'v0-ready' && v0Data && (
              <Button variant="outline" size="sm" asChild>
                <a href={v0Data.editorUrl} target="_blank" rel="noopener noreferrer">
                  <ExternalLink className="h-4 w-4" />
                  Open in V0
                </a>
              </Button>
            )}
            {state === 'prd-ready' && v0Available && (
              <Button size="sm" onClick={handleCreateV0}>
                <Zap className="h-4 w-4" />
                Create in V0
              </Button>
            )}
            {state === 'v0-error' && v0Available && (
              <Button size="sm" variant="outline" onClick={handleCreateV0}>
                <RefreshCw className="h-4 w-4" />
                Retry V0
              </Button>
            )}
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

/**
 * Copy button with "Copied!" feedback
 */
function CopyButton({ text, size = 'default' }: { text: string; size?: 'sm' | 'default' }) {
  const [copied, setCopied] = React.useState(false);

  const handleCopy = async () => {
    await navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <button
      onClick={handleCopy}
      className={`absolute ${size === 'sm' ? 'p-0.5' : 'right-3 top-3 p-1.5'} rounded-md bg-background/80 text-muted-foreground hover:text-foreground transition-colors z-10`}
      title="Copy to clipboard"
    >
      {copied ? (
        <span className="flex items-center gap-1 text-green-600">
          <Check className={size === 'sm' ? 'h-3 w-3' : 'h-4 w-4'} />
          {size !== 'sm' && <span className="text-xs">Copied!</span>}
        </span>
      ) : (
        <Copy className={size === 'sm' ? 'h-3 w-3' : 'h-4 w-4'} />
      )}
    </button>
  );
}
