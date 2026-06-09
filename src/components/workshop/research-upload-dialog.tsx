"use client";

import * as React from "react";
import { Icon } from "@/components/ui/icon";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import type { ContributionType } from "@/lib/ai/prompts/research-analysis-prompts";

const MAX_CHARS = 100_000;
const ACCEPTED = ".txt,.md,text/plain,text/markdown";

interface ResearchUploadDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** Run the analysis. Should resolve once personas/insights are placed. */
  onAnalyze: (transcript: string, contributionType: ContributionType) => Promise<void>;
  analyzing: boolean;
}

export function ResearchUploadDialog({
  open,
  onOpenChange,
  onAnalyze,
  analyzing,
}: ResearchUploadDialogProps) {
  const [text, setText] = React.useState("");
  const [isDragging, setIsDragging] = React.useState(false);
  const [contributionType, setContributionType] =
    React.useState<ContributionType>("per-interviewee");
  const fileInputRef = React.useRef<HTMLInputElement>(null);

  // Reset the textarea whenever the dialog is freshly opened.
  React.useEffect(() => {
    if (open) {
      setText("");
      setContributionType("per-interviewee");
    }
  }, [open]);

  const readFiles = React.useCallback(async (files: FileList | File[]) => {
    const file = Array.from(files)[0];
    if (!file) return;
    const isText =
      file.type.startsWith("text/") || /\.(txt|md|markdown)$/i.test(file.name);
    if (!isText) {
      toast.error("Only .txt and .md files are supported.");
      return;
    }
    try {
      const content = await file.text();
      setText((prev) => (prev.trim() ? `${prev}\n\n${content}` : content));
    } catch {
      toast.error("Couldn't read that file.");
    }
  }, []);

  const handleDrop = React.useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      setIsDragging(false);
      if (e.dataTransfer.files?.length) readFiles(e.dataTransfer.files);
    },
    [readFiles],
  );

  const trimmed = text.trim();
  const overLimit = text.length > MAX_CHARS;

  const handleAnalyze = async () => {
    if (!trimmed || analyzing) return;
    await onAnalyze(text.slice(0, MAX_CHARS), contributionType);
  };

  return (
    <Dialog open={open} onOpenChange={(o) => (analyzing ? null : onOpenChange(o))}>
      <DialogContent className="flex max-h-[85vh] flex-col gap-4 sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Icon name="file-text" className="h-5 w-5 text-olive-600 dark:text-olive-400" />
            Add your existing research
          </DialogTitle>
          <DialogDescription>
            Paste interview transcripts, survey responses, or notes — or drop in
            a .txt / .md file. I&apos;ll pull out the insights and place them on
            the canvas for you to review.
          </DialogDescription>
        </DialogHeader>

        {/* How did the research come back? */}
        <div className="grid grid-cols-2 gap-2">
          {(
            [
              {
                id: "per-interviewee" as const,
                label: "Per interviewee",
                hint: "I have notes/quotes from specific people",
              },
              {
                id: "synthesized" as const,
                label: "Overall impressions",
                hint: "Consolidated vibes across several interviews",
              },
            ]
          ).map((opt) => (
            <button
              key={opt.id}
              type="button"
              disabled={analyzing}
              onClick={() => setContributionType(opt.id)}
              className={cn(
                "rounded-lg border p-2.5 text-left transition-colors disabled:opacity-50",
                contributionType === opt.id
                  ? "border-olive-400 bg-olive-100/70 dark:border-olive-600 dark:bg-olive-900/40"
                  : "border-olive-200 hover:border-olive-300 dark:border-neutral-olive-700 dark:hover:border-neutral-olive-600",
              )}
            >
              <span className="block text-sm font-medium text-foreground">
                {opt.label}
              </span>
              <span className="mt-0.5 block text-xs text-muted-foreground">
                {opt.hint}
              </span>
            </button>
          ))}
        </div>

        {contributionType === "per-interviewee" && (
          <p className="text-xs text-muted-foreground">
            🔒 I&apos;ll capture each interviewee&apos;s name and role. Use
            initials or an alias if you don&apos;t have consent to share names.
          </p>
        )}

        <div
          onDrop={handleDrop}
          onDragOver={(e) => {
            e.preventDefault();
            setIsDragging(true);
          }}
          onDragLeave={(e) => {
            e.preventDefault();
            setIsDragging(false);
          }}
          className={cn(
            "relative flex min-h-0 flex-1 flex-col overflow-hidden rounded-lg border-2 border-dashed transition-colors",
            isDragging
              ? "border-olive-500 bg-olive-50/60 dark:border-olive-500 dark:bg-olive-900/30"
              : "border-olive-200 dark:border-neutral-olive-700",
          )}
        >
          <Textarea
            value={text}
            onChange={(e) => setText(e.target.value)}
            disabled={analyzing}
            placeholder="Paste your research here — e.g. notes from three interviews, open-text survey answers, or a meeting transcript…"
            className="field-sizing-fixed h-full min-h-[180px] flex-1 resize-none overflow-y-auto border-0 bg-transparent focus-visible:ring-0 dark:bg-transparent"
          />
          {isDragging && (
            <div className="pointer-events-none absolute inset-0 flex items-center justify-center rounded-lg bg-olive-50/80 text-sm font-medium text-olive-700 dark:bg-neutral-olive-900/80 dark:text-olive-300">
              Drop your .txt / .md file
            </div>
          )}
        </div>

        <div className="flex items-center justify-between text-xs text-muted-foreground">
          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            disabled={analyzing}
            className="inline-flex items-center gap-1.5 rounded-md px-2 py-1 transition-colors hover:bg-olive-50 hover:text-foreground disabled:opacity-50 dark:hover:bg-neutral-olive-800"
          >
            <Icon name="upload" className="h-3.5 w-3.5" />
            Upload a .txt / .md file
          </button>
          <span className={cn(overLimit && "text-destructive")}>
            {text.length.toLocaleString()}
            {overLimit ? ` / ${MAX_CHARS.toLocaleString()} (will be trimmed)` : " characters"}
          </span>
          <input
            ref={fileInputRef}
            type="file"
            accept={ACCEPTED}
            onChange={(e) => {
              if (e.target.files) readFiles(e.target.files);
              e.target.value = "";
            }}
            className="hidden"
          />
        </div>

        <DialogFooter>
          <Button
            variant="ghost"
            onClick={() => onOpenChange(false)}
            disabled={analyzing}
          >
            Cancel
          </Button>
          <Button
            variant="primary"
            onClick={handleAnalyze}
            disabled={!trimmed || analyzing}
          >
            {analyzing ? (
              <>
                <Icon name="spinner" className="h-4 w-4 animate-spin" />
                Analyzing…
              </>
            ) : (
              <>
                <Icon name="sparkles" className="h-4 w-4" />
                Analyze research
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
