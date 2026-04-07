'use client';

import { Sparkles } from 'lucide-react';
import { cn } from '@/lib/utils';

interface AiDecideOptionProps {
  selected: boolean;
  onSelect: () => void;
}

export function AiDecideOption({ selected, onSelect }: AiDecideOptionProps) {
  return (
    <button
      type="button"
      role="radio"
      aria-checked={selected}
      aria-label="Let AI decide"
      onClick={onSelect}
      className={cn(
        'flex w-full items-center gap-3 rounded-xl border-2 border-dashed p-4 text-left transition-all duration-150',
        'hover:-translate-y-0.5 hover:shadow-sm',
        selected
          ? 'border-primary/50 bg-gradient-to-r from-primary/5 to-primary/10 shadow-sm'
          : 'border-border hover:border-primary/30'
      )}
    >
      <div className={cn(
        'flex h-9 w-9 shrink-0 items-center justify-center rounded-lg transition-colors',
        selected ? 'bg-primary/15' : 'bg-muted'
      )}>
        <Sparkles className={cn('h-4 w-4', selected ? 'text-primary' : 'text-muted-foreground')} />
      </div>
      <div className="flex-1 space-y-0.5">
        <span className="text-sm font-medium">Let AI decide</span>
        <p className="text-xs text-muted-foreground leading-relaxed">
          We&apos;ll choose the best option based on your project
        </p>
      </div>
    </button>
  );
}
