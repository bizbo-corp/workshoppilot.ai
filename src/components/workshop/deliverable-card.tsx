'use client';

import * as React from 'react';
import { FileText, Presentation, Users, Code, Download, Loader2 } from 'lucide-react';
import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardFooter,
} from '@/components/ui/card';
import { Button } from '@/components/ui/button';

export const DELIVERABLES = [
  {
    id: 'prd',
    title: 'Product Requirements Document',
    description:
      'Complete PRD with objectives, target users, core features, success metrics, and technical constraints — ready for development.',
    iconName: 'FileText' as const,
  },
  {
    id: 'stakeholder-ppt',
    title: 'Stakeholder Presentation',
    description:
      'Executive summary deck covering the problem, research insights, proposed solution, and implementation roadmap.',
    iconName: 'Presentation' as const,
  },
  {
    id: 'user-stories',
    title: 'User Stories',
    description:
      'Prioritized user stories with acceptance criteria, mapped to personas and journey stages from your research.',
    iconName: 'Users' as const,
  },
  {
    id: 'tech-specs',
    title: 'Technical Specifications',
    description:
      'Architecture overview, API contracts, data models, and integration requirements derived from your concept.',
    iconName: 'Code' as const,
  },
];

type IconName = 'FileText' | 'Presentation' | 'Users' | 'Code';

const ICON_MAP: Record<IconName, React.ReactNode> = {
  FileText: <FileText className="h-5 w-5" />,
  Presentation: <Presentation className="h-5 w-5" />,
  Users: <Users className="h-5 w-5" />,
  Code: <Code className="h-5 w-5" />,
};

/**
 * Get a Lucide icon element by name string.
 */
export function getDeliverableIcon(iconName: string): React.ReactNode {
  return ICON_MAP[iconName as IconName] ?? <FileText className="h-5 w-5" />;
}

interface DeliverableCardProps {
  /** e.g. "Product Requirements Document" */
  title: string;
  /** e.g. "Complete PRD with objectives, user personas, features..." */
  description: string;
  /** Lucide icon passed as JSX */
  icon: React.ReactNode;
  /** When true (default), shows "Coming Soon" button */
  disabled?: boolean;
  /** Override button text (e.g. "Generate Prototype") */
  buttonLabel?: string;
  /** Show loading spinner on button */
  isLoading?: boolean;
  /** Future: callback when download is enabled */
  onDownload?: () => void;
}

/**
 * DeliverableCard
 * Renders a single deliverable preview card with a disabled download button.
 * Presentational-only — no state or side effects.
 */
export function DeliverableCard({
  title,
  description,
  icon,
  disabled = true,
  buttonLabel,
  isLoading,
  onDownload,
}: DeliverableCardProps) {
  const label = buttonLabel ?? (disabled ? 'Coming Soon' : 'Download');

  return (
    <Card className="flex flex-col justify-between gap-4 py-5">
      <CardHeader className="gap-3 pb-0">
        {/* Icon circle */}
        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary">
          {icon}
        </div>
        <div className="space-y-1">
          <CardTitle className="text-sm">{title}</CardTitle>
          <CardDescription>{description}</CardDescription>
        </div>
      </CardHeader>
      <CardFooter className="pt-0">
        <Button
          variant="outline"
          size="sm"
          className="w-full"
          disabled={disabled || isLoading}
          onClick={disabled ? undefined : onDownload}
        >
          {isLoading ? <Loader2 className="animate-spin" /> : <Download />}
          {label}
        </Button>
      </CardFooter>
    </Card>
  );
}
