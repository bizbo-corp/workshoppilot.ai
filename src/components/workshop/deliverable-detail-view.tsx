'use client';

import { useState } from 'react';
import ReactMarkdown from 'react-markdown';
import { ArrowLeft, Copy, Check, Download } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { toast } from 'sonner';

interface DeliverableFormat {
  id: string;
  formatType: 'markdown' | 'json' | 'pdf';
  content: string | null;
}

interface DeliverableDetailViewProps {
  title: string;
  type: string;
  formats: DeliverableFormat[];
  onBack: () => void;
}

function downloadFile(content: string, filename: string, mimeType: string) {
  const blob = new Blob([content], { type: mimeType });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

function slugify(text: string): string {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '');
}

export function DeliverableDetailView({
  title,
  type: _type,
  formats,
  onBack,
}: DeliverableDetailViewProps) {
  const [copied, setCopied] = useState(false);

  const markdownFormat = formats.find((f) => f.formatType === 'markdown');
  const jsonFormat = formats.find((f) => f.formatType === 'json');

  const markdownContent = markdownFormat?.content ?? null;
  const jsonContent = jsonFormat?.content ?? null;

  const slug = slugify(title);

  const handleCopyMarkdown = async () => {
    if (!markdownContent) return;
    await navigator.clipboard.writeText(markdownContent);
    setCopied(true);
    toast.success('Copied to clipboard');
    setTimeout(() => setCopied(false), 2000);
  };

  const handleDownloadMd = () => {
    if (!markdownContent) return;
    downloadFile(markdownContent, `${slug}.md`, 'text/markdown');
  };

  const handleDownloadJson = () => {
    if (!jsonContent) return;
    downloadFile(jsonContent, `${slug}.json`, 'application/json');
  };

  return (
    <div className="space-y-6">
      {/* Back button */}
      <button
        onClick={onBack}
        className="inline-flex items-center gap-1.5 text-sm font-medium text-muted-foreground hover:text-foreground transition-colors"
      >
        <ArrowLeft className="h-4 w-4" />
        Back to deliverables
      </button>

      {/* Title */}
      <h2 className="text-xl font-semibold tracking-tight">{title}</h2>

      {/* Action buttons */}
      <div className="flex flex-wrap gap-2">
        <Button
          variant="outline"
          size="sm"
          onClick={handleCopyMarkdown}
          disabled={!markdownContent}
        >
          {copied ? (
            <Check className="h-4 w-4 text-green-600" />
          ) : (
            <Copy className="h-4 w-4" />
          )}
          {copied ? 'Copied!' : 'Copy Markdown'}
        </Button>
        <Button
          variant="outline"
          size="sm"
          onClick={handleDownloadMd}
          disabled={!markdownContent}
        >
          <Download className="h-4 w-4" />
          Download .md
        </Button>
        <Button
          variant="outline"
          size="sm"
          onClick={handleDownloadJson}
          disabled={!jsonContent}
        >
          <Download className="h-4 w-4" />
          Download .json
        </Button>
      </div>

      {/* Content tabs */}
      <div className="rounded-lg border bg-card">
        <Tabs defaultValue="rendered">
          <TabsList className="w-full rounded-b-none border-b">
            <TabsTrigger value="rendered" className="flex-1">
              Rendered
            </TabsTrigger>
            <TabsTrigger value="json" className="flex-1" disabled={!jsonContent}>
              JSON
            </TabsTrigger>
          </TabsList>

          <TabsContent value="rendered" className="p-6">
            {markdownContent ? (
              <div className="prose prose-sm dark:prose-invert max-w-none">
                <ReactMarkdown>{markdownContent}</ReactMarkdown>
              </div>
            ) : (
              <p className="text-sm text-muted-foreground">
                Markdown content not available.
              </p>
            )}
          </TabsContent>

          <TabsContent value="json" className="p-6">
            {jsonContent ? (
              <div className="overflow-auto max-h-[60vh]">
                <pre className="whitespace-pre-wrap break-words text-xs font-mono leading-relaxed">
                  {(() => {
                    try {
                      return JSON.stringify(JSON.parse(jsonContent), null, 2);
                    } catch {
                      return jsonContent;
                    }
                  })()}
                </pre>
              </div>
            ) : (
              <p className="text-sm text-muted-foreground">
                JSON content not available.
              </p>
            )}
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}
