'use client';

/**
 * SelectionToolbar Component
 * Floating action bar shown when 2+ post-its are selected.
 * Renders above the bounding box of selected nodes.
 */

import { Layers, Trash2 } from 'lucide-react';
import { cn } from '@/lib/utils';

interface SelectionToolbarProps {
  /** Number of selected items */
  count: number;
  /** Screen position (centered above selection bounding box) */
  position: { x: number; y: number };
  /** Handler for "Cluster" action */
  onCluster: () => void;
  /** Handler for "Delete" action */
  onDelete: () => void;
}

export function SelectionToolbar({ count, position, onCluster, onDelete }: SelectionToolbarProps) {
  return (
    <div
      className="fixed z-50 flex items-center bg-white dark:bg-zinc-800 rounded-xl shadow-lg border border-gray-200 dark:border-zinc-700 px-1 py-1 gap-0.5"
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
          'text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-zinc-700 hover:text-gray-800 dark:hover:text-gray-200',
        )}
      >
        <Layers className="w-4 h-4" />
        <span>Cluster</span>
      </button>

      <div className="w-px h-5 bg-gray-200 dark:bg-zinc-600 mx-0.5" />

      <button
        onClick={onDelete}
        title="Delete selected items"
        className={cn(
          'flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-sm font-medium transition-colors',
          'text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-zinc-700 hover:text-red-600 dark:hover:text-red-400',
        )}
      >
        <Trash2 className="w-4 h-4" />
        <span>Delete</span>
      </button>

      <div className="w-px h-5 bg-gray-200 dark:bg-zinc-600 mx-0.5" />

      <span className="px-2 py-1 text-xs font-medium text-gray-400 dark:text-gray-500">
        {count}
      </span>
    </div>
  );
}
