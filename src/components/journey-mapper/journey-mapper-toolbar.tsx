'use client';

import { Panel } from '@xyflow/react';
import { RefreshCw, LayoutGrid, Wand2, ArrowLeft, Loader2, CheckCircle2, Rocket, Trash2, Eye, EyeOff, Map, Network, Lock, Unlock, Sparkles, FolderCog, MoreVertical, ChevronDown } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuCheckboxItem,
} from '@/components/ui/dropdown-menu';
import Link from 'next/link';
import type { StrategicIntent, LayoutMode } from '@/lib/journey-mapper/types';
import { INTENT_LABELS } from '@/lib/journey-mapper/types';

export type ViewMode = 'journey' | 'sitemap';

interface JourneyMapperToolbarProps {
  sessionId: string;
  isReadOnly?: boolean;
  isRegenerating?: boolean;
  isApproved?: boolean;
  strategicIntent?: StrategicIntent;
  viewMode?: ViewMode;
  layoutMode?: LayoutMode;
  showPeripherals?: boolean;
  groupCount?: number;
  onRegenerate: () => void;
  onAutoLayout: () => void;
  onAutoTidy?: () => void;
  onGenerateV0Prompt: () => void;
  onApprove: () => void;
  onCreatePrototype: () => void;
  onReset: () => void;
  isResetting?: boolean;
  onTogglePeripherals?: () => void;
  onSetViewMode?: (mode: ViewMode) => void;
  onSetLayoutMode?: (mode: LayoutMode) => void;
  onManageGroups?: () => void;
}

export function JourneyMapperToolbar({
  sessionId,
  isReadOnly,
  isRegenerating,
  isApproved,
  strategicIntent,
  viewMode = 'journey',
  layoutMode = 'auto',
  showPeripherals = true,
  groupCount = 0,
  onRegenerate,
  onAutoLayout,
  onAutoTidy,
  onGenerateV0Prompt,
  onApprove,
  onCreatePrototype,
  onReset,
  isResetting,
  onTogglePeripherals,
  onSetViewMode,
  onSetLayoutMode,
  onManageGroups,
}: JourneyMapperToolbarProps) {
  return (
    <Panel position="top-left" className="flex items-center gap-2 flex-wrap">
      <Link
        href={`/workshop/${sessionId}/outputs`}
        className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors mr-2"
      >
        <ArrowLeft className="h-3.5 w-3.5" />
        Build Pack
      </Link>

      <div className="h-5 w-px bg-border" />

      {/* Intent badge */}
      {strategicIntent && (
        <span className="inline-flex items-center rounded-full border px-2 py-0.5 text-[10px] font-medium bg-muted text-muted-foreground">
          {INTENT_LABELS[strategicIntent]}
        </span>
      )}

      {/* Group count badge */}
      {groupCount > 0 && (
        <span className="inline-flex items-center rounded-full border px-2 py-0.5 text-[10px] font-medium bg-muted text-muted-foreground">
          {groupCount} groups
        </span>
      )}

      {!isReadOnly && onManageGroups && (
        <Button
          variant="outline"
          size="sm"
          onClick={onManageGroups}
          className="h-7 text-xs gap-1.5"
        >
          <FolderCog className="h-3 w-3" />
          Groups
        </Button>
      )}

      <div className="h-5 w-px bg-border" />

      {/* View mode toggle */}
      {onSetViewMode && (
        <div className="inline-flex items-center rounded-md border bg-muted p-0.5">
          <button
            onClick={() => onSetViewMode('journey')}
            className={`inline-flex items-center gap-1 rounded px-2 py-1 text-[10px] font-medium transition-colors ${
              viewMode === 'journey' ? 'bg-background text-foreground shadow-sm' : 'text-muted-foreground hover:text-foreground'
            }`}
          >
            <Map className="h-3 w-3" />
            Journey
          </button>
          <button
            onClick={() => onSetViewMode('sitemap')}
            className={`inline-flex items-center gap-1 rounded px-2 py-1 text-[10px] font-medium transition-colors ${
              viewMode === 'sitemap' ? 'bg-background text-foreground shadow-sm' : 'text-muted-foreground hover:text-foreground'
            }`}
          >
            <Network className="h-3 w-3" />
            Sitemap
          </button>
        </div>
      )}

      {/* Layout mode toggle */}
      {onSetLayoutMode && (
        <div className="inline-flex items-center rounded-md border bg-muted p-0.5">
          <button
            onClick={() => onSetLayoutMode('auto')}
            className={`inline-flex items-center gap-1 rounded px-2 py-1 text-[10px] font-medium transition-colors ${
              layoutMode === 'auto' ? 'bg-background text-foreground shadow-sm' : 'text-muted-foreground hover:text-foreground'
            }`}
          >
            <Lock className="h-3 w-3" />
            Auto
          </button>
          <button
            onClick={() => onSetLayoutMode('freeform')}
            className={`inline-flex items-center gap-1 rounded px-2 py-1 text-[10px] font-medium transition-colors ${
              layoutMode === 'freeform' ? 'bg-background text-foreground shadow-sm' : 'text-muted-foreground hover:text-foreground'
            }`}
          >
            <Unlock className="h-3 w-3" />
            Free-form
          </button>
        </div>
      )}

      {/* View dropdown */}
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="outline" size="sm" className="h-7 text-xs gap-1.5">
            View
            <ChevronDown className="h-3 w-3" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="start">
          {onTogglePeripherals && (
            <DropdownMenuCheckboxItem
              checked={showPeripherals}
              onCheckedChange={() => onTogglePeripherals()}
            >
              {showPeripherals ? (
                <Eye className="h-3.5 w-3.5 mr-2" />
              ) : (
                <EyeOff className="h-3.5 w-3.5 mr-2" />
              )}
              Peripherals
            </DropdownMenuCheckboxItem>
          )}
          {layoutMode === 'freeform' ? (
            <DropdownMenuItem onClick={onAutoTidy}>
              <Sparkles className="h-3.5 w-3.5 mr-2" />
              Auto-tidy
            </DropdownMenuItem>
          ) : (
            <DropdownMenuItem onClick={onAutoLayout}>
              <LayoutGrid className="h-3.5 w-3.5 mr-2" />
              Auto-layout
            </DropdownMenuItem>
          )}
        </DropdownMenuContent>
      </DropdownMenu>

      {/* Approve / Create Prototype flow */}
      {!isReadOnly && !isApproved && (
        <Button
          variant="default"
          size="sm"
          onClick={onApprove}
          className="h-7 text-xs gap-1.5"
        >
          <CheckCircle2 className="h-3 w-3" />
          Approve Journey
        </Button>
      )}

      {/* More options dropdown */}
      {!isReadOnly && (
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="outline" size="sm" className="h-7 w-7 p-0">
              <MoreVertical className="h-3.5 w-3.5" />
              <span className="sr-only">More options</span>
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem
              onClick={onRegenerate}
              disabled={isRegenerating}
            >
              {isRegenerating ? (
                <Loader2 className="h-3.5 w-3.5 mr-2 animate-spin" />
              ) : (
                <RefreshCw className="h-3.5 w-3.5 mr-2" />
              )}
              Re-generate
            </DropdownMenuItem>
            <DropdownMenuItem onClick={onGenerateV0Prompt}>
              <Wand2 className="h-3.5 w-3.5 mr-2" />
              Preview in v0
            </DropdownMenuItem>
            {isApproved && (
              <DropdownMenuItem onClick={onCreatePrototype}>
                <Rocket className="h-3.5 w-3.5 mr-2" />
                Create Prototype
              </DropdownMenuItem>
            )}
            <DropdownMenuSeparator />
            <DropdownMenuItem
              onClick={onReset}
              disabled={isResetting}
              className="text-destructive focus:text-destructive"
            >
              {isResetting ? (
                <Loader2 className="h-3.5 w-3.5 mr-2 animate-spin" />
              ) : (
                <Trash2 className="h-3.5 w-3.5 mr-2" />
              )}
              Reset
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      )}
    </Panel>
  );
}
