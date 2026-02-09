'use client';

import * as React from 'react';
import ReactMarkdown from 'react-markdown';
import { Loader2 } from 'lucide-react';
import { getStepByOrder } from '@/lib/workshop/step-metadata';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { PersonaCard } from './persona-card';
import { JourneyMapGrid } from './journey-map-grid';
import { HMWBuilder } from './hmw-builder';

interface OutputPanelProps {
  stepOrder: number;
  artifact: Record<string, unknown> | null;
  isExtracting: boolean;
  extractionError: string | null;
  onRetry?: () => void;
}

/**
 * Format artifact as Markdown for display
 * Generic formatter that handles any step artifact structure
 */
function formatArtifactAsMarkdown(
  artifact: Record<string, unknown>,
  stepOrder: number
): string {
  const step = getStepByOrder(stepOrder);
  if (!step) return 'Step not found';

  let markdown = `# ${step.name}\n\n`;

  // Recursively format values
  function formatValue(value: unknown, indent = 0): string {
    const indentStr = '  '.repeat(indent);

    if (value === null || value === undefined) {
      return `${indentStr}_Not specified_\n`;
    }

    if (Array.isArray(value)) {
      if (value.length === 0) return `${indentStr}_Empty list_\n`;
      return value
        .map((item, idx) => {
          if (typeof item === 'object' && item !== null) {
            // Object in array: format as numbered item with nested properties
            let result = `${indentStr}${idx + 1}. `;
            const obj = item as Record<string, unknown>;
            const keys = Object.keys(obj);
            if (keys.length > 0) {
              result += `**${obj[keys[0]]}**\n`;
              keys.slice(1).forEach((key) => {
                result += `${indentStr}   - ${key}: ${obj[key]}\n`;
              });
            }
            return result;
          } else {
            // Primitive in array: bullet list
            return `${indentStr}- ${item}\n`;
          }
        })
        .join('');
    }

    if (typeof value === 'object') {
      // Nested object: format as indented key-value pairs
      const obj = value as Record<string, unknown>;
      return Object.entries(obj)
        .map(([key, val]) => {
          const formattedKey = key.replace(/([A-Z])/g, ' $1').trim();
          const capitalizedKey =
            formattedKey.charAt(0).toUpperCase() + formattedKey.slice(1);
          return `${indentStr}- **${capitalizedKey}:** ${val}\n`;
        })
        .join('');
    }

    // Primitive value
    return `${indentStr}${value}\n`;
  }

  // Format each top-level field
  Object.entries(artifact).forEach(([key, value]) => {
    // Format key: convert camelCase to Title Case
    const formattedKey = key.replace(/([A-Z])/g, ' $1').trim();
    const capitalizedKey =
      formattedKey.charAt(0).toUpperCase() + formattedKey.slice(1);

    markdown += `## ${capitalizedKey}\n\n`;
    markdown += formatValue(value);
    markdown += '\n';
  });

  return markdown;
}

export function OutputPanel({
  stepOrder,
  artifact,
  isExtracting,
  extractionError,
  onRetry,
}: OutputPanelProps) {
  const step = getStepByOrder(stepOrder);

  if (!step) {
    return (
      <div className="flex h-full items-center justify-center">
        <p className="text-muted-foreground">Step not found</p>
      </div>
    );
  }

  // State 2: Extracting (loading)
  if (isExtracting) {
    return (
      <div className="flex h-full flex-col overflow-y-auto p-6">
        <div className="mb-4">
          <div className="flex items-center gap-2">
            <h3 className="text-lg font-semibold">{step.mockOutputType}</h3>
            <span className="rounded-md bg-muted px-2 py-0.5 text-xs text-muted-foreground">
              Extracting...
            </span>
          </div>
        </div>
        <div className="flex flex-1 flex-col items-center justify-center gap-4 rounded-lg border bg-card p-8">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
          <p className="text-sm text-muted-foreground">
            Extracting your output...
          </p>
        </div>
      </div>
    );
  }

  // State 3: Extraction error
  if (extractionError) {
    return (
      <div className="flex h-full flex-col overflow-y-auto p-6">
        <div className="mb-4">
          <div className="flex items-center gap-2">
            <h3 className="text-lg font-semibold">{step.mockOutputType}</h3>
            <span className="rounded-md bg-destructive/10 px-2 py-0.5 text-xs text-destructive">
              Error
            </span>
          </div>
        </div>
        <div className="flex flex-1 flex-col items-center justify-center gap-4 rounded-lg border border-destructive/50 bg-card p-8">
          <p className="text-center text-sm text-muted-foreground">
            I had trouble extracting your output. You can try again or continue
            chatting to refine.
          </p>
          <p className="text-center text-xs text-muted-foreground">
            {extractionError}
          </p>
          {onRetry && (
            <Button onClick={onRetry} variant="outline" size="sm">
              Try Again
            </Button>
          )}
        </div>
      </div>
    );
  }

  // State 4: Artifact available
  if (artifact) {
    // Step-specific rendering for Definition steps (5-7)
    if (stepOrder === 5) {
      return (
        <div className="flex h-full flex-col overflow-y-auto p-6">
          <div className="mb-4">
            <div className="flex items-center gap-2">
              <h3 className="text-lg font-semibold">{step.mockOutputType}</h3>
              <span className="rounded-md bg-green-500/10 px-2 py-0.5 text-xs text-green-700 dark:text-green-400">
                Extracted
              </span>
            </div>
            <p className="mt-1 text-sm text-muted-foreground">
              Review your extracted output below
            </p>
          </div>
          <PersonaCard persona={artifact} />
        </div>
      );
    }

    if (stepOrder === 6) {
      return (
        <div className="flex h-full flex-col overflow-y-auto p-6">
          <div className="mb-4">
            <div className="flex items-center gap-2">
              <h3 className="text-lg font-semibold">{step.mockOutputType}</h3>
              <span className="rounded-md bg-green-500/10 px-2 py-0.5 text-xs text-green-700 dark:text-green-400">
                Extracted
              </span>
            </div>
            <p className="mt-1 text-sm text-muted-foreground">
              Review your extracted output below
            </p>
          </div>
          <JourneyMapGrid artifact={artifact} />
        </div>
      );
    }

    if (stepOrder === 7) {
      return (
        <div className="flex h-full flex-col overflow-y-auto p-6">
          <div className="mb-4">
            <div className="flex items-center gap-2">
              <h3 className="text-lg font-semibold">{step.mockOutputType}</h3>
              <span className="rounded-md bg-green-500/10 px-2 py-0.5 text-xs text-green-700 dark:text-green-400">
                Extracted
              </span>
            </div>
            <p className="mt-1 text-sm text-muted-foreground">
              Review your extracted output below
            </p>
          </div>
          <HMWBuilder artifact={artifact} />
        </div>
      );
    }

    // Default: Generic markdown rendering for other steps
    const markdown = formatArtifactAsMarkdown(artifact, stepOrder);

    return (
      <div className="flex h-full flex-col overflow-y-auto p-6">
        <div className="mb-4">
          <div className="flex items-center gap-2">
            <h3 className="text-lg font-semibold">{step.mockOutputType}</h3>
            <span className="rounded-md bg-green-500/10 px-2 py-0.5 text-xs text-green-700 dark:text-green-400">
              Extracted
            </span>
          </div>
          <p className="mt-1 text-sm text-muted-foreground">
            Review your extracted output below
          </p>
        </div>
        <div
          className={cn(
            'flex-1 rounded-lg border bg-card p-6 shadow-xs',
            'prose prose-sm dark:prose-invert max-w-none'
          )}
        >
          <ReactMarkdown>{markdown}</ReactMarkdown>
        </div>
      </div>
    );
  }

  // State 1: Default (no artifact, not extracting - show mock content)
  return (
    <div className="flex h-full flex-col overflow-y-auto p-6">
      {/* Header */}
      <div className="mb-4">
        <div className="flex items-center gap-2">
          <h3 className="text-lg font-semibold">{step.mockOutputType}</h3>
          <span className="rounded-md bg-muted px-2 py-0.5 text-xs text-muted-foreground">
            Preview
          </span>
        </div>
        <p className="mt-1 text-sm text-muted-foreground">
          AI-generated content will appear here
        </p>
      </div>

      {/* Mock content */}
      <div
        className={cn(
          'flex-1 rounded-lg border bg-card p-4 shadow-xs',
          'prose prose-sm dark:prose-invert max-w-none'
        )}
      >
        <pre className="whitespace-pre-wrap font-sans text-sm leading-relaxed text-muted-foreground">
          {step.mockOutputContent}
        </pre>
      </div>
    </div>
  );
}
