'use client';

import { useState, useCallback } from 'react';
import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  type DragEndEvent,
} from '@dnd-kit/core';
import {
  SortableContext,
  sortableKeyboardCoordinates,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable';
import { Icon } from '@/components/ui/icon';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { useFeaturePrioritizationStoreApi } from '@/providers/feature-prioritization-store-provider';
import { SubfeatureItem } from './subfeature-item';
import type { Feature } from '@/lib/feature-prioritization/types';

interface FeatureCardProps {
  feature: Feature;
  rank: number;
  isReadOnly?: boolean;
}

const PRIORITY_COLORS: Record<string, string> = {
  'must-have': 'bg-red-500/10 text-red-700 border-red-500/20 dark:text-red-400',
  'should-have': 'bg-amber-500/10 text-amber-700 border-amber-500/20 dark:text-amber-400',
  'nice-to-have': 'bg-emerald-500/10 text-emerald-700 border-emerald-500/20 dark:text-emerald-400',
};

export function FeatureCard({ feature, rank, isReadOnly }: FeatureCardProps) {
  const storeApi = useFeaturePrioritizationStoreApi();
  const [isExpanded, setIsExpanded] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [editName, setEditName] = useState(feature.name);
  const [editDescription, setEditDescription] = useState(feature.description);

  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: feature.id, disabled: isReadOnly });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    zIndex: isDragging ? 50 : undefined,
  };

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
  );

  const handleSubfeatureDragEnd = useCallback((event: DragEndEvent) => {
    const { active, over } = event;
    if (!over || active.id === over.id) return;

    const oldIndex = feature.subfeatures.findIndex((sf) => sf.id === active.id);
    const newIndex = feature.subfeatures.findIndex((sf) => sf.id === over.id);
    if (oldIndex === -1 || newIndex === -1) return;

    storeApi.getState().reorderSubfeatures(feature.id, oldIndex, newIndex);
  }, [feature.id, feature.subfeatures, storeApi]);

  const handleSaveEdit = () => {
    storeApi.getState().updateFeature(feature.id, {
      name: editName,
      description: editDescription,
    });
    setIsEditing(false);
  };

  const handleCancelEdit = () => {
    setEditName(feature.name);
    setEditDescription(feature.description);
    setIsEditing(false);
  };

  const handleDelete = () => {
    storeApi.getState().deleteFeature(feature.id);
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={`rounded-lg border bg-card ${isDragging ? 'shadow-lg opacity-90' : 'shadow-sm'}`}
    >
      <div className="flex items-start gap-3 p-4">
        {/* Drag handle */}
        {!isReadOnly && (
          <button
            {...attributes}
            {...listeners}
            className="mt-1 cursor-grab active:cursor-grabbing text-muted-foreground hover:text-foreground touch-none"
          >
            <Icon name="grip-vertical" className="h-4 w-4" />
          </button>
        )}

        {/* Rank number */}
        <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-muted text-xs font-medium">
          {rank}
        </div>

        {/* Content */}
        <div className="flex-1 min-w-0">
          {isEditing ? (
            <div className="space-y-2">
              <Input
                value={editName}
                onChange={(e) => setEditName(e.target.value)}
                className="text-sm font-medium"
                autoFocus
              />
              <Textarea
                value={editDescription}
                onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) => setEditDescription(e.target.value)}
                className="text-sm"
                rows={2}
              />
              <div className="flex gap-2">
                <Button size="sm" variant="default" onClick={handleSaveEdit}>
                  <Icon name="check" className="h-3 w-3 mr-1" />
                  Save
                </Button>
                <Button size="sm" variant="ghost" onClick={handleCancelEdit}>
                  <Icon name="close" className="h-3 w-3 mr-1" />
                  Cancel
                </Button>
              </div>
            </div>
          ) : (
            <>
              <div className="flex items-center gap-2 flex-wrap">
                <span className="text-sm font-medium">{feature.name}</span>
                <Badge
                  variant="outline"
                  className={`text-[10px] ${PRIORITY_COLORS[feature.priority] || ''}`}
                >
                  {feature.priority}
                </Badge>
                {feature.conceptName && (
                  <span className="text-[10px] text-muted-foreground">
                    {feature.conceptName}
                  </span>
                )}
              </div>
              <p className="text-xs text-muted-foreground mt-1 line-clamp-2">
                {feature.description}
              </p>
            </>
          )}

          {/* Subfeatures toggle */}
          {feature.subfeatures.length > 0 && !isEditing && (
            <button
              onClick={() => setIsExpanded(!isExpanded)}
              className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground mt-2 transition-colors"
            >
              {isExpanded ? (
                <Icon name="chevron-down" className="h-3 w-3" />
              ) : (
                <Icon name="chevron-right" className="h-3 w-3" />
              )}
              {feature.subfeatures.length} subfeature{feature.subfeatures.length !== 1 ? 's' : ''}
            </button>
          )}
        </div>

        {/* Actions */}
        {!isReadOnly && !isEditing && (
          <div className="flex items-center gap-1 shrink-0">
            <Button
              variant="ghost"
              size="icon"
              className="h-7 w-7"
              onClick={() => setIsEditing(true)}
            >
              <Icon name="pencil" className="h-3 w-3" />
            </Button>
            <Button
              variant="ghost"
              size="icon"
              className="h-7 w-7 text-destructive hover:text-destructive"
              onClick={handleDelete}
            >
              <Icon name="trash" className="h-3 w-3" />
            </Button>
          </div>
        )}
      </div>

      {/* Expanded subfeatures */}
      {isExpanded && feature.subfeatures.length > 0 && (
        <div className="border-t px-4 py-3 pl-16 space-y-2">
          {isReadOnly ? (
            feature.subfeatures.map((sf) => (
              <SubfeatureItem
                key={sf.id}
                subfeature={sf}
                featureId={feature.id}
                isReadOnly
              />
            ))
          ) : (
            <DndContext
              sensors={sensors}
              collisionDetection={closestCenter}
              onDragEnd={handleSubfeatureDragEnd}
            >
              <SortableContext
                items={feature.subfeatures.map((sf) => sf.id)}
                strategy={verticalListSortingStrategy}
              >
                {feature.subfeatures.map((sf) => (
                  <SubfeatureItem
                    key={sf.id}
                    subfeature={sf}
                    featureId={feature.id}
                    isReadOnly={isReadOnly}
                  />
                ))}
              </SortableContext>
            </DndContext>
          )}
        </div>
      )}
    </div>
  );
}
