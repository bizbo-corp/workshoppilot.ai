'use client';

import { useState } from 'react';
import Link from 'next/link';
import { ArrowLeft, FileText, Code, Package } from 'lucide-react';
import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardFooter,
} from '@/components/ui/card';
import { Button } from '@/components/ui/button';

interface DeliverableFormat {
  id: string;
  formatType: 'markdown' | 'json' | 'pdf';
  content: string | null;
}

interface Deliverable {
  type: string;
  title: string;
  formats: DeliverableFormat[];
}

interface OutputsContentProps {
  sessionId: string;
  workshopId: string;
  workshopTitle: string;
  deliverables: Deliverable[];
}

const FORMAT_LABELS: Record<string, string> = {
  markdown: 'Markdown',
  json: 'JSON',
  pdf: 'PDF',
};

function getDeliverableIcon(type: string) {
  switch (type) {
    case 'prd':
      return <FileText className="h-5 w-5" />;
    case 'tech-specs':
      return <Code className="h-5 w-5" />;
    default:
      return <Package className="h-5 w-5" />;
  }
}

function getDeliverableDisplayTitle(type: string, rawTitle: string): string {
  if (type === 'prd') return 'Product Requirements Document';
  if (type === 'tech-specs') return 'Technical Specifications';
  // Strip known prefixes for display, fallback to raw title
  return rawTitle.replace(/^(PRD:|Tech Specs:)\s*/i, '').trim() || rawTitle;
}

function getDeliverableDescription(type: string): string {
  if (type === 'prd') {
    return 'Complete PRD with objectives, target users, core features, success metrics, and technical constraints — ready for development.';
  }
  if (type === 'tech-specs') {
    return 'Architecture overview, API contracts, data models, and integration requirements derived from your concept.';
  }
  return 'Generated Build Pack deliverable.';
}

export function OutputsContent({
  sessionId,
  deliverables,
  workshopTitle,
}: OutputsContentProps) {
  const [selectedType, setSelectedType] = useState<string | null>(null);

  return (
    <div className="h-full overflow-y-auto">
      <div className="mx-auto max-w-4xl px-6 py-8 space-y-8">
        {/* Header */}
        <div className="space-y-1">
          <h1 className="text-2xl font-semibold tracking-tight">Build Pack</h1>
          <p className="text-muted-foreground text-sm">{workshopTitle}</p>
        </div>

        {/* Back link */}
        <Link
          href={`/workshop/${sessionId}/step/10`}
          className="inline-flex items-center gap-1.5 text-sm font-medium text-primary hover:text-primary/80 transition-colors"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to Workshop
        </Link>

        {/* Deliverables */}
        {deliverables.length === 0 ? (
          <Card>
            <CardHeader>
              <CardTitle className="text-base">No deliverables generated yet</CardTitle>
              <CardDescription>
                Complete your workshop and generate deliverables from Step 10.
              </CardDescription>
            </CardHeader>
            <CardFooter>
              <Button variant="outline" asChild>
                <Link href={`/workshop/${sessionId}/step/10`}>
                  Go to Step 10
                </Link>
              </Button>
            </CardFooter>
          </Card>
        ) : (
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            {deliverables.map((deliverable) => {
              const displayTitle = getDeliverableDisplayTitle(deliverable.type, deliverable.title);
              const description = getDeliverableDescription(deliverable.type);
              const icon = getDeliverableIcon(deliverable.type);
              const isSelected = selectedType === deliverable.type;

              return (
                <Card
                  key={deliverable.type}
                  className={`flex flex-col justify-between gap-4 py-5 cursor-pointer transition-all duration-150 hover:-translate-y-0.5 hover:shadow-md ${
                    isSelected ? 'ring-2 ring-primary ring-offset-2' : ''
                  }`}
                  onClick={() =>
                    setSelectedType(isSelected ? null : deliverable.type)
                  }
                >
                  <CardHeader className="gap-3 pb-0">
                    {/* Icon circle */}
                    <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary">
                      {icon}
                    </div>
                    <div className="space-y-1">
                      <CardTitle className="text-sm">{displayTitle}</CardTitle>
                      <CardDescription className="text-xs leading-relaxed">
                        {description}
                      </CardDescription>
                    </div>

                    {/* Format pills */}
                    {deliverable.formats.length > 0 && (
                      <div className="flex flex-wrap gap-1.5 pt-1">
                        {deliverable.formats.map((f) => (
                          <span
                            key={f.id}
                            className="inline-flex items-center rounded-full border border-border bg-secondary px-2.5 py-0.5 text-xs font-normal text-secondary-foreground"
                          >
                            {FORMAT_LABELS[f.formatType] ?? f.formatType}
                          </span>
                        ))}
                      </div>
                    )}
                  </CardHeader>

                  <CardFooter className="pt-0">
                    <Button
                      variant="outline"
                      size="sm"
                      className="w-full"
                      onClick={(e) => {
                        e.stopPropagation();
                        setSelectedType(isSelected ? null : deliverable.type);
                      }}
                    >
                      View Details
                    </Button>
                  </CardFooter>
                </Card>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
