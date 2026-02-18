'use client';

import { useEffect, useRef, useState } from 'react';

interface EditableColumnHeaderProps {
  label: string;
  onSave: (newLabel: string) => void;
  className?: string;
}

export function EditableColumnHeader({ label, onSave, className = '' }: EditableColumnHeaderProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [editValue, setEditValue] = useState(label);
  const inputRef = useRef<HTMLInputElement>(null);

  // Sync editValue from label prop changes when not editing
  useEffect(() => {
    if (!isEditing) {
      setEditValue(label);
    }
  }, [label, isEditing]);

  // Auto-focus and select text when entering edit mode
  useEffect(() => {
    if (isEditing && inputRef.current) {
      inputRef.current.focus();
      inputRef.current.select();
    }
  }, [isEditing]);

  const handleSave = () => {
    const trimmed = editValue.trim();
    if (trimmed && trimmed !== label) {
      onSave(trimmed);
    } else if (!trimmed) {
      // Revert to original if empty
      setEditValue(label);
    }
    setIsEditing(false);
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      handleSave();
    } else if (e.key === 'Escape') {
      e.preventDefault();
      setEditValue(label); // Revert
      setIsEditing(false);
    }
  };

  if (isEditing) {
    return (
      <input
        ref={inputRef}
        type="text"
        value={editValue}
        onChange={(e) => setEditValue(e.target.value)}
        onKeyDown={handleKeyDown}
        onBlur={handleSave}
        maxLength={30}
        className={`nodrag nopan px-1 py-0.5 text-xs font-semibold border-b-2 border-blue-500 bg-white/90 dark:bg-zinc-800/90 dark:text-gray-200 outline-none w-[140px] ${className}`}
      />
    );
  }

  return (
    <div
      onClick={() => setIsEditing(true)}
      className={`px-2 py-0.5 text-xs font-semibold cursor-pointer hover:bg-[#8a9a5b]/10 dark:hover:bg-zinc-700/80 hover:rounded transition-colors text-[#4a5a32] dark:text-neutral-olive-200 truncate max-w-[140px] ${className}`}
    >
      {label}
    </div>
  );
}
