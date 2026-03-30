'use client';

import { MousePointer2, Hand, Plus } from 'lucide-react';
import { cn } from '@/lib/utils';

export interface JourneyCanvasToolbarProps {
  activeTool: 'pointer' | 'hand';
  onToolChange: (tool: 'pointer' | 'hand') => void;
  onAddScreen: () => void;
  isReadOnly?: boolean;
}

function IconButton({
  onClick,
  title,
  active,
  children,
}: {
  onClick: () => void;
  title: string;
  active?: boolean;
  children: React.ReactNode;
}) {
  return (
    <button
      onClick={onClick}
      title={title}
      className={cn(
        'p-2 rounded-lg transition-colors',
        'text-muted-foreground hover:bg-accent hover:text-accent-foreground',
        active && 'bg-accent text-accent-foreground'
      )}
    >
      {children}
    </button>
  );
}

export function JourneyCanvasToolbar({
  activeTool,
  onToolChange,
  onAddScreen,
  isReadOnly,
}: JourneyCanvasToolbarProps) {
  if (isReadOnly) return null;

  return (
    <div className="absolute bottom-4 left-1/2 -translate-x-1/2 z-10 flex items-center bg-card rounded-xl shadow-md border border-border px-1 py-1 gap-0.5">
      {/* Pointer / Hand tools */}
      <div className="flex items-center">
        <IconButton
          onClick={() => onToolChange('pointer')}
          active={activeTool === 'pointer'}
          title="Pointer tool (V)"
        >
          <MousePointer2 className="w-4 h-4" />
        </IconButton>
        <IconButton
          onClick={() => onToolChange('hand')}
          active={activeTool === 'hand'}
          title="Hand tool (Space)"
        >
          <Hand className="w-4 h-4" />
        </IconButton>
      </div>

      <div className="w-px h-5 bg-border mx-0.5" />

      {/* Add Screen button */}
      <button
        onClick={onAddScreen}
        title="Add a new screen"
        className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-sm font-medium bg-primary text-primary-foreground hover:bg-primary/90 transition-colors"
      >
        <Plus className="w-3.5 h-3.5" />
        <span>Add Screen</span>
      </button>
    </div>
  );
}
