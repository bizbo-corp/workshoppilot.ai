'use client';

/**
 * SelectionToolbar Component
 * Floating action bar shown when 2+ sticky notes are selected.
 * Renders above the bounding box of selected nodes.
 */

import { useState, useRef, useEffect } from 'react';
import { Layers, Trash2, ChevronDown, UserCircle } from 'lucide-react';
import { cn } from '@/lib/utils';

const COLOR_DOT: Record<string, string> = {
  pink: 'bg-pink-400', blue: 'bg-blue-400', green: 'bg-green-400',
  yellow: 'bg-yellow-400', orange: 'bg-orange-400', red: 'bg-red-400',
};

interface SelectionToolbarProps {
  /** Number of selected items */
  count: number;
  /** Screen position (centered above selection bounding box) */
  position: { x: number; y: number };
  /** Handler for "Cluster" action */
  onCluster: () => void;
  /** Handler for "Delete" action */
  onDelete: () => void;
  /** Persona options for "Assign to" dropdown (user-research step only) */
  personaOptions?: { name: string; color: string }[];
  /** Handler for assigning selected items to a persona */
  onAssignToPersona?: (personaName: string) => void;
}

export function SelectionToolbar({ count, position, onCluster, onDelete, personaOptions, onAssignToPersona }: SelectionToolbarProps) {
  const [assignOpen, setAssignOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Close dropdown on outside click
  useEffect(() => {
    if (!assignOpen) return;
    const handleClick = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setAssignOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, [assignOpen]);

  return (
    <div
      className="fixed z-50 flex items-center bg-card rounded-xl shadow-lg border border-border px-1 py-1 gap-0.5"
      style={{
        left: position.x,
        top: position.y,
        transform: 'translate(-50%, -100%) translateY(-12px)',
      }}
    >
      <button
        onClick={onCluster}
        title="Cluster selected items"
        className={cn(
          'flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-sm font-medium transition-colors',
          'text-muted-foreground hover:bg-accent hover:text-accent-foreground',
        )}
      >
        <Layers className="w-4 h-4" />
        <span>Cluster</span>
      </button>

      {/* Assign to persona dropdown — user-research step only */}
      {personaOptions && personaOptions.length > 0 && onAssignToPersona && (
        <>
          <div className="w-px h-5 bg-border mx-0.5" />
          <div className="relative" ref={dropdownRef}>
            <button
              onClick={() => setAssignOpen(!assignOpen)}
              title="Assign to persona"
              className={cn(
                'flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-sm font-medium transition-colors',
                'text-muted-foreground hover:bg-accent hover:text-accent-foreground',
                assignOpen && 'bg-accent text-accent-foreground',
              )}
            >
              <UserCircle className="w-4 h-4" />
              <span>Assign to</span>
              <ChevronDown className="w-3 h-3" />
            </button>

            {assignOpen && (
              <div className="absolute left-1/2 -translate-x-1/2 top-full mt-1 bg-popover rounded-lg shadow-lg border border-border p-1 min-w-[160px] z-[60]">
                {personaOptions.map((persona) => (
                  <button
                    key={persona.name}
                    className="flex items-center gap-2 px-3 py-1.5 text-sm hover:bg-accent rounded w-full text-left"
                    onClick={() => {
                      onAssignToPersona(persona.name);
                      setAssignOpen(false);
                    }}
                  >
                    <span className={cn('inline-block h-2.5 w-2.5 rounded-full', COLOR_DOT[persona.color] || 'bg-yellow-400')} />
                    {persona.name}
                  </button>
                ))}
              </div>
            )}
          </div>
        </>
      )}

      <div className="w-px h-5 bg-border mx-0.5" />

      <button
        onClick={onDelete}
        title="Delete selected items"
        className={cn(
          'flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-sm font-medium transition-colors',
          'text-muted-foreground hover:bg-accent hover:text-red-600 dark:hover:text-red-400',
        )}
      >
        <Trash2 className="w-4 h-4" />
        <span>Delete</span>
      </button>

      <div className="w-px h-5 bg-border mx-0.5" />

      <span className="px-2 py-1 text-xs font-medium text-muted-foreground">
        {count}
      </span>
    </div>
  );
}
