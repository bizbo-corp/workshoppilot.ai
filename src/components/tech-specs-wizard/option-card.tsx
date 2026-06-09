'use client';

import { Icon, type IconName } from '@/components/ui/icon';
import { cn } from '@/lib/utils';

interface OptionCardProps {
  label: string;
  description?: string;
  icon?: IconName;
  selected: boolean;
  onSelect: () => void;
}

export function OptionCard({ label, description, icon, selected, onSelect }: OptionCardProps) {
  return (
    <button
      type="button"
      role="radio"
      aria-checked={selected}
      onClick={onSelect}
      className={cn(
        'relative flex w-full items-start gap-3 rounded-xl border p-4 text-left transition-all duration-150',
        'hover:-translate-y-0.5 hover:shadow-sm',
        selected
          ? 'border-primary bg-primary/5 shadow-sm'
          : 'border-border hover:border-primary/40'
      )}
    >
      {icon && (
        <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-muted">
          <Icon name={icon} className="h-4 w-4 text-muted-foreground" />
        </div>
      )}
      <div className="flex-1 space-y-0.5">
        <span className="text-sm font-medium">{label}</span>
        {description && (
          <p className="text-xs text-muted-foreground leading-relaxed">{description}</p>
        )}
      </div>
      {selected && (
        <div className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-primary text-primary-foreground">
          <Icon name="check" className="h-3 w-3" />
        </div>
      )}
    </button>
  );
}
