'use client';

import { useState } from 'react';
import { PlusCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface AddColumnButtonProps {
  onAdd: (label: string) => void;
  disabled?: boolean;
}

export function AddColumnButton({ onAdd, disabled = false }: AddColumnButtonProps) {
  const [isAdding, setIsAdding] = useState(false);
  const [newColumnLabel, setNewColumnLabel] = useState('');

  const handleConfirm = () => {
    const trimmed = newColumnLabel.trim();
    if (trimmed) {
      onAdd(trimmed);
      setNewColumnLabel('');
      setIsAdding(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      handleConfirm();
    } else if (e.key === 'Escape') {
      e.preventDefault();
      setNewColumnLabel('');
      setIsAdding(false);
    }
  };

  const handleBlur = () => {
    handleConfirm();
  };

  if (isAdding) {
    return (
      <input
        type="text"
        value={newColumnLabel}
        onChange={(e) => setNewColumnLabel(e.target.value)}
        onKeyDown={handleKeyDown}
        onBlur={handleBlur}
        placeholder="Stage name..."
        maxLength={30}
        autoFocus
        className="nodrag nopan px-1 py-0.5 text-xs font-semibold border-b-2 border-olive-600 bg-card/90 text-foreground outline-none w-[120px]"
      />
    );
  }

  return (
    <Button
      variant="ghost"
      size="xs"
      onClick={() => !disabled && setIsAdding(true)}
      disabled={disabled}
      className="text-muted-foreground disabled:opacity-30"
      title={disabled ? 'Maximum 12 stages' : 'Add a new stage column'}
    >
      <PlusCircle />
      Add Stage
    </Button>
  );
}
