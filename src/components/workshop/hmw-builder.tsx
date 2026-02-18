'use client';

import * as React from 'react';
import { cn } from '@/lib/utils';

interface HMWBuilderProps {
  artifact: Record<string, unknown>;
  onFieldEdit?: (statementIndex: number, field: string, value: string) => void;
}

interface HMWStatement {
  givenThat: string;
  persona: string;
  immediateGoal: string;
  deeperGoal: string;
  fullStatement: string;
}

/**
 * Editable field component with color-coded background
 */
function EditableField({
  label,
  value,
  onSave,
  isEditable,
  colorClass,
}: {
  label: string;
  value: string;
  onSave?: (newValue: string) => void;
  isEditable: boolean;
  colorClass: string;
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

  return (
    <div className={cn('rounded-lg p-3', colorClass)}>
      <label className="mb-1 block text-xs font-semibold uppercase tracking-wide text-muted-foreground">
        {label}
      </label>
      {isEditing && isEditable ? (
        <textarea
          ref={textareaRef}
          value={editValue}
          onChange={(e) => setEditValue(e.target.value)}
          onBlur={handleSave}
          onKeyDown={handleKeyDown}
          className="w-full resize-none rounded border bg-background p-2 text-sm"
          rows={2}
        />
      ) : (
        <div
          onClick={() => isEditable && setIsEditing(true)}
          className={cn(
            'text-sm',
            isEditable && 'cursor-pointer hover:ring-2 hover:ring-primary/50 rounded'
          )}
        >
          {value || <span className="text-muted-foreground italic">Click to edit</span>}
        </div>
      )}
    </div>
  );
}

/**
 * HMWBuilder component
 * Renders 4-field mad-libs form for reframed HMW statements
 */
export function HMWBuilder({ artifact, onFieldEdit }: HMWBuilderProps) {
  const originalHmw = artifact.originalHmw as string | undefined;
  const hmwStatements = (artifact.hmwStatements as HMWStatement[]) || [];
  const selectedForIdeation = artifact.selectedForIdeation as number[] | undefined;
  const insightsApplied = (artifact.insightsApplied as string[]) || [];
  const evolution = artifact.evolution as string | undefined;

  const isEditable = !!onFieldEdit;

  // Empty state
  if (hmwStatements.length === 0) {
    return (
      <div className="flex items-center justify-center rounded-lg border bg-card p-12">
        <p className="text-sm text-muted-foreground">
          Your reframed HMW will appear here after the AI helps you build it
        </p>
      </div>
    );
  }

  const handleFieldEdit = (statementIndex: number, field: string, newValue: string) => {
    if (onFieldEdit) {
      onFieldEdit(statementIndex, field, newValue);
    }
  };

  return (
    <div className="space-y-6">
      {/* Original HMW reference */}
      {originalHmw && (
        <div className="rounded-lg border border-dashed bg-muted/30 p-4">
          <p className="mb-1 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
            Original Challenge (Step 1)
          </p>
          <p className="text-sm text-muted-foreground italic">{originalHmw}</p>
        </div>
      )}

      {/* HMW Statement cards */}
      {hmwStatements.map((statement, idx) => {
        const isSelected = selectedForIdeation?.includes(idx);

        return (
          <div
            key={idx}
            className={cn(
              'rounded-lg border bg-card p-6 shadow-xs',
              isSelected && 'ring-2 ring-green-500/50'
            )}
          >
            {/* Card header */}
            <div className="mb-4 flex items-start justify-between">
              <h4 className="font-semibold">
                {hmwStatements.length > 1 ? `HMW #${idx + 1}` : 'Reframed HMW'}
              </h4>
              {isSelected && (
                <span className="flex items-center gap-1 rounded-md bg-green-500/10 px-2 py-1 text-xs font-medium text-green-700 dark:text-green-400">
                  <svg
                    className="h-3 w-3"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M5 13l4 4L19 7"
                    />
                  </svg>
                  Selected for Ideation
                </span>
              )}
            </div>

            {/* 4-field mad-libs form */}
            <div className="space-y-3">
              <EditableField
                label="Given that"
                value={statement.givenThat}
                onSave={(newValue) =>
                  handleFieldEdit(idx, 'givenThat', newValue)
                }
                isEditable={isEditable}
                colorClass="bg-olive-50 dark:bg-olive-950/20"
              />

              <EditableField
                label="How might we help"
                value={statement.persona}
                onSave={(newValue) =>
                  handleFieldEdit(idx, 'persona', newValue)
                }
                isEditable={isEditable}
                colorClass="bg-purple-50 dark:bg-purple-950/20"
              />

              <EditableField
                label="do/be/feel/achieve"
                value={statement.immediateGoal}
                onSave={(newValue) =>
                  handleFieldEdit(idx, 'immediateGoal', newValue)
                }
                isEditable={isEditable}
                colorClass="bg-amber-50 dark:bg-amber-950/20"
              />

              <EditableField
                label="So they can"
                value={statement.deeperGoal}
                onSave={(newValue) =>
                  handleFieldEdit(idx, 'deeperGoal', newValue)
                }
                isEditable={isEditable}
                colorClass="bg-green-50 dark:bg-green-950/20"
              />
            </div>

            {/* Full statement summary */}
            <div className="mt-4 rounded-lg border border-primary/30 bg-primary/5 p-4">
              <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground mb-2">
                Complete Statement
              </p>
              <p className="font-medium text-sm leading-relaxed">
                {statement.fullStatement}
              </p>
            </div>
          </div>
        );
      })}

      {/* Insights Applied */}
      {insightsApplied.length > 0 && (
        <div className="rounded-lg border bg-card p-4">
          <h4 className="mb-3 font-semibold text-sm">Research Insights Applied</h4>
          <ul className="space-y-2">
            {insightsApplied.map((insight, idx) => (
              <li key={idx} className="flex gap-2 text-sm">
                <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-primary" />
                <span>{insight}</span>
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* Evolution explanation */}
      {evolution && (
        <div className="rounded-lg border border-dashed bg-muted/30 p-4">
          <h4 className="mb-2 font-semibold text-sm">How the HMW Evolved</h4>
          <p className="text-sm text-muted-foreground">{evolution}</p>
        </div>
      )}
    </div>
  );
}
