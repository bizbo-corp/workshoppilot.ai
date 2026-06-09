'use client';

import { useState } from 'react';
import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { GripVertical, Pencil, Trash2, Check, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useFeaturePrioritizationStoreApi } from '@/providers/feature-prioritization-store-provider';
import type { Subfeature } from '@/lib/feature-prioritization/types';

interface SubfeatureItemProps {
  subfeature: Subfeature;
  featureId: string;
  isReadOnly?: boolean;
}

export function SubfeatureItem({ subfeature, featureId, isReadOnly }: SubfeatureItemProps) {
  const storeApi = useFeaturePrioritizationStoreApi();
  const [isEditing, setIsEditing] = useState(false);
  const [editName, setEditName] = useState(subfeature.name);
  const [editDescription, setEditDescription] = useState(subfeature.description);

  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: subfeature.id, disabled: isReadOnly });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    zIndex: isDragging ? 50 : undefined,
  };

  const handleSave = () => {
    storeApi.getState().updateSubfeature(featureId, subfeature.id, {
      name: editName,
      description: editDescription,
    });
    setIsEditing(false);
  };

  const handleCancel = () => {
    setEditName(subfeature.name);
    setEditDescription(subfeature.description);
    setIsEditing(false);
  };

  const handleDelete = () => {
    storeApi.getState().deleteSubfeature(featureId, subfeature.id);
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={`flex items-start gap-2 rounded-md p-2 ${isDragging ? 'bg-muted/60 shadow' : 'hover:bg-muted/30'}`}
    >
      {/* Drag handle */}
      {!isReadOnly && (
        <button
          {...attributes}
          {...listeners}
          className="mt-0.5 cursor-grab active:cursor-grabbing text-muted-foreground hover:text-foreground touch-none"
        >
          <GripVertical className="h-3 w-3" />
        </button>
      )}

      {/* Content */}
      <div className="flex-1 min-w-0">
        {isEditing ? (
          <div className="space-y-1.5">
            <Input
              value={editName}
              onChange={(e) => setEditName(e.target.value)}
              className="text-xs h-7"
              autoFocus
            />
            <Input
              value={editDescription}
              onChange={(e) => setEditDescription(e.target.value)}
              className="text-xs h-7"
              placeholder="Description"
            />
            <div className="flex gap-1">
              <Button size="sm" variant="primary" className="h-6 text-xs" onClick={handleSave}>
                <Check className="h-3 w-3 mr-1" />
                Save
              </Button>
              <Button size="sm" variant="ghost" className="h-6 text-xs" onClick={handleCancel}>
                <X className="h-3 w-3 mr-1" />
                Cancel
              </Button>
            </div>
          </div>
        ) : (
          <>
            <span className="text-xs font-medium">{subfeature.name}</span>
            {subfeature.description && (
              <p className="text-[11px] text-muted-foreground line-clamp-1">
                {subfeature.description}
              </p>
            )}
          </>
        )}
      </div>

      {/* Actions */}
      {!isReadOnly && !isEditing && (
        <div className="flex items-center gap-0.5 shrink-0">
          <Button
            variant="ghost"
            size="icon"
            className="h-6 w-6"
            onClick={() => setIsEditing(true)}
          >
            <Pencil className="h-2.5 w-2.5" />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            className="h-6 w-6 text-destructive hover:text-destructive"
            onClick={handleDelete}
          >
            <Trash2 className="h-2.5 w-2.5" />
          </Button>
        </div>
      )}
    </div>
  );
}
