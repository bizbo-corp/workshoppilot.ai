'use client';

import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogDescription,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Icon } from '@/components/ui/icon';
import type { JourneyMapperNode, UiType, Priority } from '@/lib/journey-mapper/types';

const UI_TYPE_LABELS: Record<UiType, string> = {
  dashboard: 'Dashboard',
  'landing-page': 'Landing Page',
  form: 'Form',
  table: 'Table',
  'detail-view': 'Detail View',
  wizard: 'Wizard',
  modal: 'Modal',
  settings: 'Settings',
  auth: 'Auth',
  onboarding: 'Onboarding',
  search: 'Search',
  error: 'Error Page',
};

const PRIORITY_STYLES: Record<Priority, { dot: string; label: string }> = {
  'must-have': { dot: 'bg-red-500', label: 'Must Have' },
  'should-have': { dot: 'bg-amber-500', label: 'Should Have' },
  'nice-to-have': { dot: 'bg-blue-400', label: 'Nice to Have' },
};

interface JourneyNodeDetailDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  node: JourneyMapperNode | null;
  onFieldChange?: (id: string, field: keyof JourneyMapperNode, value: string) => void;
  onDeleteNode?: (id: string) => void;
}

export function JourneyNodeDetailDialog({
  open,
  onOpenChange,
  node,
  onFieldChange,
  onDeleteNode,
}: JourneyNodeDetailDialogProps) {
  if (!node) return null;

  const priority = PRIORITY_STYLES[node.priority] ?? PRIORITY_STYLES['should-have'];

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[480px]">
        <DialogHeader>
          <DialogTitle className="sr-only">Feature Details</DialogTitle>
          <DialogDescription className="sr-only">
            Edit feature details for {node.featureName}
          </DialogDescription>
          <Input
            value={node.featureName}
            onChange={(e) => onFieldChange?.(node.id, 'featureName', e.target.value)}
            className="text-lg font-semibold border-none shadow-none px-0 focus-visible:ring-0"
            placeholder="Feature name"
          />
        </DialogHeader>

        <div className="space-y-4 py-2">
          {/* Concept */}
          <div className="flex items-center justify-between text-sm">
            <span className="text-muted-foreground">Concept</span>
            <span className="font-medium">{node.conceptName}</span>
          </div>

          {/* Stage */}
          <div className="flex items-center justify-between text-sm">
            <span className="text-muted-foreground">Stage</span>
            <span className="font-medium">{node.stageName}</span>
          </div>

          {/* UI Type */}
          <div className="flex items-center justify-between text-sm">
            <span className="text-muted-foreground">UI Type</span>
            <span className="inline-flex items-center rounded-full bg-muted px-2.5 py-0.5 text-xs font-medium text-muted-foreground">
              {UI_TYPE_LABELS[node.uiType] || node.uiType}
            </span>
          </div>

          {/* Priority */}
          <div className="flex items-center justify-between text-sm">
            <span className="text-muted-foreground">Priority</span>
            <div className="flex items-center gap-1.5">
              <span className={`w-2 h-2 rounded-full ${priority.dot}`} />
              <span className="text-sm">{priority.label}</span>
            </div>
          </div>

          {/* Addresses Pain */}
          {node.addressesPain && (
            <div className="text-sm">
              <span className="text-muted-foreground block mb-1">Addresses Pain</span>
              <p className="text-foreground">{node.addressesPain}</p>
            </div>
          )}

          {/* Description */}
          <div className="text-sm">
            <span className="text-muted-foreground block mb-1">Description</span>
            <textarea
              value={node.featureDescription}
              onChange={(e) => onFieldChange?.(node.id, 'featureDescription', e.target.value)}
              placeholder="Add a description..."
              rows={3}
              className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring resize-none"
            />
          </div>
        </div>

        <DialogFooter className="flex-row justify-between sm:justify-between">
          {onDeleteNode && (
            <Button
              variant="destructive"
              size="sm"
              onClick={() => {
                onDeleteNode(node.id);
                onOpenChange(false);
              }}
            >
              <Icon name="trash" className="h-4 w-4 mr-1.5" />
              Delete
            </Button>
          )}
          <Button variant="outline" size="sm" onClick={() => onOpenChange(false)}>
            Close
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
