'use client';

import { useEffect, useRef, useState } from 'react';
import type Konva from 'konva';

/**
 * TextTool: Manages text element creation and inline editing
 *
 * Responsibilities:
 * - Provide text editing overlay when a text element is double-clicked
 * - Position HTML textarea exactly over the Konva text node
 * - Handle blur/Enter to update text content
 *
 * This component only manages the editing UI. Text creation on click
 * is handled in EzyDrawStage event delegation.
 */

interface TextToolProps {
  editingTextId: string | null;
  editingText: string;
  editingPosition: { x: number; y: number; width: number; fontSize: number } | null;
  onTextChange: (newText: string) => void;
  onFinishEditing: () => void;
}

export function TextTool({
  editingTextId,
  editingText,
  editingPosition,
  onTextChange,
  onFinishEditing,
}: TextToolProps) {
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // Auto-focus textarea when editing starts
  useEffect(() => {
    if (editingTextId && textareaRef.current) {
      textareaRef.current.focus();
      textareaRef.current.select();
    }
  }, [editingTextId]);

  if (!editingTextId || !editingPosition) {
    return null;
  }

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    // Enter without shift = finish editing
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      onFinishEditing();
    }
    // Escape = cancel
    if (e.key === 'Escape') {
      onFinishEditing();
    }
  };

  return (
    <textarea
      ref={textareaRef}
      value={editingText}
      onChange={(e) => onTextChange(e.target.value)}
      onBlur={onFinishEditing}
      onKeyDown={handleKeyDown}
      style={{
        position: 'absolute',
        top: `${editingPosition.y}px`,
        left: `${editingPosition.x}px`,
        width: `${editingPosition.width}px`,
        fontSize: `${editingPosition.fontSize}px`,
        fontFamily: 'sans-serif',
        border: '2px solid #0ea5e9',
        outline: 'none',
        padding: '2px',
        margin: '0',
        resize: 'none',
        background: 'white',
        overflow: 'hidden',
        lineHeight: '1.2',
        whiteSpace: 'pre-wrap',
        wordWrap: 'break-word',
      }}
      rows={1}
    />
  );
}
