'use client';

import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogDescription,
} from '@/components/ui/dialog';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Icon } from '@/components/ui/icon';
import type { JourneyFlowNode, JourneyFlowUiType, JourneyFlowPriority } from '@/lib/journey-flow/types';
import { UI_TYPE_LABELS, PRIORITY_LABELS } from '@/lib/journey-flow/types';

const PRIORITY_DOT_COLOR: Record<JourneyFlowPriority, string> = {
  'must-have': 'var(--destructive)',
  'should-have': 'var(--primary)',
  'nice-to-have': 'var(--muted-foreground)',
};

interface JourneyFlowNodeDetailProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  node: JourneyFlowNode | null;
  isReadOnly?: boolean;
  onFieldChange?: (id: string, updates: Partial<JourneyFlowNode>) => void;
  onDeleteNode?: (id: string) => void;
}

export function JourneyFlowNodeDetail({
  open,
  onOpenChange,
  node,
  isReadOnly = false,
  onFieldChange,
  onDeleteNode,
}: JourneyFlowNodeDetailProps) {
  if (!node) return null;

  function handleOpenChange(nextOpen: boolean) {
    if (!nextOpen && node) {
      // Filter blank lines on close rather than on every keystroke
      const cleaned = node.keyElements.map((s) => s.trim()).filter(Boolean);
      onFieldChange?.(node.id, { keyElements: cleaned });
    }
    onOpenChange(nextOpen);
  }

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="sm:max-w-[480px]">
        <DialogHeader>
          <DialogTitle className="sr-only">Screen Details</DialogTitle>
          <DialogDescription className="sr-only">
            Edit screen details for {node.name || 'Untitled Screen'}
          </DialogDescription>
          <Input
            value={node.name}
            onChange={(e) => onFieldChange?.(node.id, { name: e.target.value })}
            className="text-lg font-semibold border-none shadow-none px-0 focus-visible:ring-0"
            placeholder="Screen name"
            disabled={isReadOnly}
          />
        </DialogHeader>

        <div className="space-y-4 py-2">
          {/* UI Type */}
          <div className="flex items-center justify-between text-sm">
            <span className="text-muted-foreground">UI Type</span>
            {isReadOnly ? (
              <span className="inline-flex items-center rounded-full bg-muted px-2.5 py-0.5 text-xs font-medium text-muted-foreground">
                {UI_TYPE_LABELS[node.uiType]}
              </span>
            ) : (
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="outline" size="sm" className="h-7 gap-1 text-xs">
                    {UI_TYPE_LABELS[node.uiType]}
                    <Icon name="chevron-down" className="h-3 w-3" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  {(Object.entries(UI_TYPE_LABELS) as [JourneyFlowUiType, string][]).map(
                    ([uiType, label]) => (
                      <DropdownMenuItem
                        key={uiType}
                        onClick={() => onFieldChange?.(node.id, { uiType })}
                      >
                        {label}
                      </DropdownMenuItem>
                    )
                  )}
                </DropdownMenuContent>
              </DropdownMenu>
            )}
          </div>

          {/* Priority */}
          <div className="flex items-center justify-between text-sm">
            <span className="text-muted-foreground">Priority</span>
            {isReadOnly ? (
              <div className="flex items-center gap-1.5">
                <span
                  className="w-2 h-2 rounded-full"
                  style={{ backgroundColor: PRIORITY_DOT_COLOR[node.priority] }}
                />
                <span className="text-sm">{PRIORITY_LABELS[node.priority]}</span>
              </div>
            ) : (
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="outline" size="sm" className="h-7 gap-1.5 text-xs">
                    <span
                      className="w-2 h-2 rounded-full"
                      style={{ backgroundColor: PRIORITY_DOT_COLOR[node.priority] }}
                    />
                    {PRIORITY_LABELS[node.priority]}
                    <Icon name="chevron-down" className="h-3 w-3" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  {(Object.entries(PRIORITY_LABELS) as [JourneyFlowPriority, string][]).map(
                    ([priority, label]) => (
                      <DropdownMenuItem
                        key={priority}
                        onClick={() => onFieldChange?.(node.id, { priority })}
                      >
                        <span
                          className="w-2 h-2 rounded-full mr-1.5"
                          style={{ backgroundColor: PRIORITY_DOT_COLOR[priority] }}
                        />
                        {label}
                      </DropdownMenuItem>
                    )
                  )}
                </DropdownMenuContent>
              </DropdownMenu>
            )}
          </div>

          {/* Purpose */}
          <div className="text-sm">
            <span className="text-muted-foreground block mb-1">Purpose</span>
            <Textarea
              value={node.purpose}
              onChange={(e) => onFieldChange?.(node.id, { purpose: e.target.value })}
              placeholder="What does this screen do for the user?"
              rows={3}
              disabled={isReadOnly}
            />
          </div>

          {/* Key Elements */}
          <div className="text-sm">
            <span className="text-muted-foreground block mb-1">Key Elements</span>
            <Textarea
              value={node.keyElements.join('\n')}
              onChange={(e) =>
                onFieldChange?.(node.id, { keyElements: e.target.value.split('\n') })
              }
              placeholder="One element per line…"
              rows={4}
              disabled={isReadOnly}
            />
          </div>

          {/* Addresses Pain — read-only, AI-populated in Phase 64 */}
          {node.addressesPain && (
            <div className="text-sm">
              <span className="text-muted-foreground block mb-1">Addresses Pain</span>
              <p className="text-foreground">{node.addressesPain}</p>
            </div>
          )}
        </div>

        <DialogFooter className="flex-row justify-between sm:justify-between">
          {!isReadOnly && onDeleteNode && (
            <Button
              variant="destructive"
              size="sm"
              onClick={() => {
                onDeleteNode(node.id);
                onOpenChange(false);
              }}
            >
              <Icon name="trash" className="h-4 w-4 mr-1.5" />
              Delete screen
            </Button>
          )}
          <Button variant="outline" size="sm" onClick={() => handleOpenChange(false)}>
            Close
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
