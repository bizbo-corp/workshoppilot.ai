'use client';

import * as React from 'react';
import { Icon } from '@/components/ui/icon';
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
    id: 'tech-specs',
    title: 'Technical Specifications',
    description:
      'Architecture overview, API contracts, data models, and integration requirements derived from your concept.',
    iconName: 'Code' as const,
  },
];

type IconName = 'FileText' | 'Presentation' | 'Users' | 'Code';

const ICON_MAP: Record<IconName, React.ReactNode> = {
  FileText: <Icon name="file-text" className="h-5 w-5" />,
  Presentation: <Icon name="presentation" className="h-5 w-5" />,
  Users: <Icon name="users" className="h-5 w-5" />,
  Code: <Icon name="code" className="h-5 w-5" />,
};

/**
 * Get a Lucide icon element by name string.
 */
export function getDeliverableIcon(iconName: string): React.ReactNode {
  return ICON_MAP[iconName as IconName] ?? <Icon name="file-text" className="h-5 w-5" />;
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
    <Card className="flex flex-col justify-between gap-4 py-5 transition-all duration-150 hover:-translate-y-0.5 hover:shadow-md">
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
          {isLoading ? <Icon name="spinner" className="animate-spin" /> : <Icon name="download" />}
          {label}
        </Button>
      </CardFooter>
    </Card>
  );
}
