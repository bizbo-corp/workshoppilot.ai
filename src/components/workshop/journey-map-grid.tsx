'use client';

import * as React from 'react';
import { cn } from '@/lib/utils';

interface JourneyMapGridProps {
  artifact: Record<string, unknown>;
  onCellEdit?: (stageIndex: number, layer: string, value: string) => void;
}

interface Stage {
  name: string;
  action: string;
  goals: string;
  barriers: string;
  touchpoints: string;
  emotions: 'positive' | 'neutral' | 'negative';
  momentsOfTruth?: string;
  opportunities?: string;
  isDip?: boolean;
}

const LAYERS = [
  { key: 'action', label: 'Action' },
  { key: 'goals', label: 'Goals' },
  { key: 'barriers', label: 'Barriers' },
  { key: 'touchpoints', label: 'Touchpoints' },
  { key: 'emotions', label: 'Emotions' },
  { key: 'momentsOfTruth', label: 'Moments of Truth' },
  { key: 'opportunities', label: 'Opportunities' },
] as const;

/**
 * Get emotion color classes for traffic light display
 */
function getEmotionColors(emotion: 'positive' | 'neutral' | 'negative') {
  switch (emotion) {
    case 'positive':
      return 'bg-green-100 dark:bg-green-900/30 text-green-800 dark:text-green-200 border-green-300 dark:border-green-700';
    case 'neutral':
      return 'bg-orange-100 dark:bg-orange-900/30 text-orange-800 dark:text-orange-200 border-orange-300 dark:border-orange-700';
    case 'negative':
      return 'bg-red-100 dark:bg-red-900/30 text-red-800 dark:text-red-200 border-red-300 dark:border-red-700';
  }
}

/**
 * Get emotion dot indicator
 */
function getEmotionDot(emotion: 'positive' | 'neutral' | 'negative') {
  const colors = {
    positive: 'bg-green-600',
    neutral: 'bg-orange-600',
    negative: 'bg-red-600',
  };

  return (
    <span className={cn('inline-block h-2 w-2 rounded-full', colors[emotion])} />
  );
}

/**
 * Editable cell component
 */
function EditableCell({
  value,
  onSave,
  isEditable,
  className,
}: {
  value: string;
  onSave?: (newValue: string) => void;
  isEditable: boolean;
  className?: string;
}) {
  const [isEditing, setIsEditing] = React.useState(false);
  const [editValue, setEditValue] = React.useState(value);
  const textareaRef = React.useRef<HTMLTextAreaElement>(null);

  React.useEffect(() => {
    if (isEditing && textareaRef.current) {
      textareaRef.current.focus();
      textareaRef.current.select();
    }
  }, [isEditing]);

  const handleSave = () => {
    if (onSave && editValue !== value) {
      onSave(editValue);
    }
    setIsEditing(false);
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSave();
    }
    if (e.key === 'Escape') {
      setEditValue(value);
      setIsEditing(false);
    }
  };

  if (isEditing && isEditable) {
    return (
      <textarea
        ref={textareaRef}
        value={editValue}
        onChange={(e) => setEditValue(e.target.value)}
        onBlur={handleSave}
        onKeyDown={handleKeyDown}
        className={cn(
          'w-full resize-none rounded border bg-background p-2 text-sm',
          className
        )}
        rows={3}
      />
    );
  }

  return (
    <div
      onClick={() => isEditable && setIsEditing(true)}
      className={cn(
        'min-h-[60px] text-sm leading-relaxed',
        isEditable && 'cursor-pointer hover:ring-2 hover:ring-primary/50',
        className
      )}
    >
      {value || <span className="text-muted-foreground italic">Click to edit</span>}
    </div>
  );
}

/**
 * JourneyMapGrid component
 * Renders a 7-layer scrollable journey map with traffic light emotions and dip highlighting
 */
export function JourneyMapGrid({ artifact, onCellEdit }: JourneyMapGridProps) {
  const stages = (artifact.stages as Stage[]) || [];
  const personaName = artifact.personaName as string | undefined;
  const dipSummary = artifact.dipSummary as string | undefined;
  const dipRationale = artifact.dipRationale as string | undefined;

  const isEditable = !!onCellEdit;

  // Empty state
  if (stages.length === 0) {
    return (
      <div className="flex items-center justify-center rounded-lg border bg-card p-12">
        <p className="text-sm text-muted-foreground">
          Journey map will appear here after AI generates stages
        </p>
      </div>
    );
  }

  const handleCellEdit = (stageIndex: number, layerKey: string, newValue: string) => {
    if (onCellEdit) {
      onCellEdit(stageIndex, layerKey, newValue);
    }
  };

  return (
    <div className="space-y-4">
      {/* Header */}
      {personaName && (
        <div className="mb-2">
          <p className="text-sm text-muted-foreground">
            Journey for <span className="font-semibold">{personaName}</span>
          </p>
        </div>
      )}

      {/* Scrollable grid container */}
      <div className="overflow-x-auto rounded-lg border bg-card shadow-xs">
        <div className="min-w-max">
          {/* Grid using table for sticky columns */}
          <table className="w-full border-collapse">
            <thead>
              <tr>
                {/* Empty corner cell */}
                <th className="sticky left-0 z-10 min-w-[140px] border-b border-r bg-background p-3" />

                {/* Stage headers */}
                {stages.map((stage, stageIdx) => (
                  <th
                    key={stageIdx}
                    className={cn(
                      'min-w-[180px] border-b border-r p-3 text-left font-semibold',
                      stage.isDip &&
                        'border-l-4 border-l-red-500 bg-red-50 dark:bg-red-950/20'
                    )}
                  >
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <span>{stage.name}</span>
                        {stage.isDip && (
                          <span className="rounded bg-red-500 px-1.5 py-0.5 text-xs font-medium text-white">
                            The Dip
                          </span>
                        )}
                      </div>
                    </div>
                  </th>
                ))}
              </tr>
            </thead>

            <tbody>
              {/* Layer rows */}
              {LAYERS.map((layer) => (
                <tr key={layer.key}>
                  {/* Layer label (sticky) */}
                  <td className="sticky left-0 z-10 min-w-[140px] border-b border-r bg-background p-3 align-top font-medium text-sm">
                    {layer.label}
                  </td>

                  {/* Stage cells */}
                  {stages.map((stage, stageIdx) => {
                    const cellValue = stage[layer.key as keyof Stage] as string;
                    const isEmotionRow = layer.key === 'emotions';
                    const isDipStage = stage.isDip;

                    return (
                      <td
                        key={stageIdx}
                        className={cn(
                          'border-b border-r p-3 align-top',
                          isEmotionRow && cellValue
                            ? getEmotionColors(cellValue as 'positive' | 'neutral' | 'negative')
                            : 'bg-card',
                          isDipStage && !isEmotionRow && 'bg-red-50/30 dark:bg-red-950/10'
                        )}
                      >
                        {isEmotionRow ? (
                          // Emotion cell with traffic light
                          <div className="flex items-center gap-2">
                            {cellValue && getEmotionDot(cellValue as 'positive' | 'neutral' | 'negative')}
                            <span className="capitalize">{cellValue || 'N/A'}</span>
                          </div>
                        ) : (
                          // Regular editable cell
                          <EditableCell
                            value={cellValue || ''}
                            onSave={(newValue) =>
                              handleCellEdit(stageIdx, layer.key, newValue)
                            }
                            isEditable={isEditable}
                          />
                        )}
                      </td>
                    );
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Dip Summary */}
      {dipSummary && (
        <div className="rounded-lg border border-red-500/50 bg-red-50/50 p-4 dark:bg-red-950/20">
          <h4 className="mb-2 font-semibold text-sm text-red-900 dark:text-red-100">
            Critical Dip Summary
          </h4>
          <p className="mb-2 text-sm text-red-800 dark:text-red-200">
            {dipSummary}
          </p>
          {dipRationale && (
            <p className="text-xs text-red-700 dark:text-red-300">
              <span className="font-medium">Rationale:</span> {dipRationale}
            </p>
          )}
        </div>
      )}
    </div>
  );
}
