'use client';

import { Icon, type IconName } from '@/components/ui/icon';
import { cn } from '@/lib/utils';

interface MultiOptionCardProps {
  label: string;
  description?: string;
  icon?: IconName;
  checked: boolean;
  onToggle: () => void;
}

export function MultiOptionCard({ label, description, checked, onToggle }: MultiOptionCardProps) {
  return (
    <button
      type="button"
      role="checkbox"
      aria-checked={checked}
      onClick={onToggle}
      className={cn(
        'relative flex w-full items-start gap-3 rounded-xl border p-4 text-left transition-all duration-150',
        'hover:-translate-y-0.5 hover:shadow-sm',
        checked
          ? 'border-primary bg-primary/5 shadow-sm'
          : 'border-border hover:border-primary/40'
      )}
    >
      <div
        className={cn(
          'flex h-5 w-5 shrink-0 items-center justify-center rounded-md border-2 transition-colors mt-0.5',
          checked
            ? 'border-primary bg-primary text-primary-foreground'
            : 'border-muted-foreground/30'
        )}
      >
        {checked && <Icon name="check" className="h-3 w-3" />}
      </div>
      <div className="flex-1 space-y-0.5">
        <span className="text-sm font-medium">{label}</span>
        {description && (
          <p className="text-xs text-muted-foreground leading-relaxed">{description}</p>
        )}
      </div>
    </button>
  );
}
