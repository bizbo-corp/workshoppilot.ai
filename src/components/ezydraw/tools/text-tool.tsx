'use client';

import { useEffect, useRef } from 'react';
import { HANDWRITING_FONT } from '@/lib/drawing/types';

/**
 * TextTool: Manages text element inline editing overlay
 *
 * Responsibilities:
 * - Provide text editing overlay when a text element is double-clicked or created
 * - Position HTML textarea exactly over the Konva text node
 * - Handle blur/Enter to confirm, Escape to cancel
 */

interface TextToolProps {
  editingTextId: string | null;
  editingText: string;
  editingPosition: {
    x: number;
    y: number;
    width: number;
    fontSize: number;
    textAlign?: 'left' | 'center' | 'right';
  } | null;
  onTextChange: (newText: string) => void;
  onFinishEditing: () => void;
  onCancelEditing: () => void;
}

export function TextTool({
  editingTextId,
  editingText,
  editingPosition,
  onTextChange,
  onFinishEditing,
  onCancelEditing,
}: TextToolProps) {
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // Auto-focus textarea when editing starts
  useEffect(() => {
    if (editingTextId && textareaRef.current) {
      textareaRef.current.focus();
      // Select all text for easy replacement (unless empty/new)
      if (editingText) {
        textareaRef.current.select();
      }
    }
  }, [editingTextId]);

  if (!editingTextId || !editingPosition) {
    return null;
  }

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      onFinishEditing();
    }
    if (e.key === 'Escape') {
      e.preventDefault();
      onCancelEditing();
    }
  };

  return (
    <textarea
      ref={textareaRef}
      value={editingText}
      onChange={(e) => onTextChange(e.target.value)}
      onBlur={onFinishEditing}
      onKeyDown={handleKeyDown}
      placeholder="Type here..."
      style={{
        position: 'absolute',
        top: `${editingPosition.y}px`,
        left: `${editingPosition.x}px`,
        width: `${editingPosition.width}px`,
        minHeight: `${editingPosition.fontSize * 1.5}px`,
        fontSize: `${editingPosition.fontSize}px`,
        fontFamily: HANDWRITING_FONT,
        textAlign: editingPosition.textAlign || 'left',
        border: '2px solid #0ea5e9',
        outline: 'none',
        padding: '2px 4px',
        margin: '0',
        resize: 'horizontal',
        background: 'rgba(255, 255, 255, 0.95)',
        overflow: 'hidden',
        lineHeight: '1.2',
        whiteSpace: 'pre-wrap',
        wordWrap: 'break-word',
        color: 'inherit',
      }}
      rows={1}
    />
  );
}
