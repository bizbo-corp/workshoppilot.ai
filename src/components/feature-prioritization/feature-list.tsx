'use client';

import { useCallback } from 'react';
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
import { Badge } from '@/components/ui/badge';
import { Eyebrow, Text } from '@/components/ui/typography';
import { useFeaturePrioritizationStore, useFeaturePrioritizationStoreApi } from '@/providers/feature-prioritization-store-provider';
import { FeatureCard } from './feature-card';

interface FeatureListProps {
  isReadOnly?: boolean;
}

export function FeatureList({ isReadOnly }: FeatureListProps) {
  const features = useFeaturePrioritizationStore((s) => s.features);
  const storeApi = useFeaturePrioritizationStoreApi();

  const coreFeatures = features.filter((f) => f.category === 'core');
  const peripheralFeatures = features.filter((f) => f.category === 'peripheral');

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
  );

  const handleCoreDragEnd = useCallback((event: DragEndEvent) => {
    const { active, over } = event;
    if (!over || active.id === over.id) return;

    const oldIndex = coreFeatures.findIndex((f) => f.id === active.id);
    const newIndex = coreFeatures.findIndex((f) => f.id === over.id);
    if (oldIndex === -1 || newIndex === -1) return;

    storeApi.getState().reorderFeatures('core', oldIndex, newIndex);
  }, [coreFeatures, storeApi]);

  const handlePeripheralDragEnd = useCallback((event: DragEndEvent) => {
    const { active, over } = event;
    if (!over || active.id === over.id) return;

    const oldIndex = peripheralFeatures.findIndex((f) => f.id === active.id);
    const newIndex = peripheralFeatures.findIndex((f) => f.id === over.id);
    if (oldIndex === -1 || newIndex === -1) return;

    storeApi.getState().reorderFeatures('peripheral', oldIndex, newIndex);
  }, [peripheralFeatures, storeApi]);

  return (
    <div className="space-y-8">
      {/* Core Features */}
      <section className="space-y-3">
        <div className="flex items-center gap-2">
          <Eyebrow>Core Features</Eyebrow>
          <Badge variant="secondary" className="text-xs">
            {coreFeatures.length}
          </Badge>
        </div>

        {coreFeatures.length === 0 ? (
          <Text variant="muted" className="py-4 text-center">No core features</Text>
        ) : isReadOnly ? (
          <div className="space-y-3">
            {coreFeatures.map((feature, index) => (
              <FeatureCard
                key={feature.id}
                feature={feature}
                rank={index + 1}
                isReadOnly={isReadOnly}
              />
            ))}
          </div>
        ) : (
          <DndContext
            sensors={sensors}
            collisionDetection={closestCenter}
            onDragEnd={handleCoreDragEnd}
          >
            <SortableContext
              items={coreFeatures.map((f) => f.id)}
              strategy={verticalListSortingStrategy}
            >
              <div className="space-y-3">
                {coreFeatures.map((feature, index) => (
                  <FeatureCard
                    key={feature.id}
                    feature={feature}
                    rank={index + 1}
                    isReadOnly={isReadOnly}
                  />
                ))}
              </div>
            </SortableContext>
          </DndContext>
        )}
      </section>

      {/* Peripheral Features */}
      {peripheralFeatures.length > 0 && (
        <section className="space-y-3">
          <div className="flex items-center gap-2">
            <Eyebrow>Peripheral Features</Eyebrow>
            <Badge variant="secondary" className="text-xs">
              {peripheralFeatures.length}
            </Badge>
          </div>

          {isReadOnly ? (
            <div className="space-y-3">
              {peripheralFeatures.map((feature, index) => (
                <FeatureCard
                  key={feature.id}
                  feature={feature}
                  rank={coreFeatures.length + index + 1}
                  isReadOnly={isReadOnly}
                />
              ))}
            </div>
          ) : (
            <DndContext
              sensors={sensors}
              collisionDetection={closestCenter}
              onDragEnd={handlePeripheralDragEnd}
              >
              <SortableContext
                items={peripheralFeatures.map((f) => f.id)}
                strategy={verticalListSortingStrategy}
              >
                <div className="space-y-3">
                  {peripheralFeatures.map((feature, index) => (
                    <FeatureCard
                      key={feature.id}
                      feature={feature}
                      rank={coreFeatures.length + index + 1}
                      isReadOnly={isReadOnly}
                    />
                  ))}
                </div>
              </SortableContext>
            </DndContext>
          )}
        </section>
      )}
    </div>
  );
}
