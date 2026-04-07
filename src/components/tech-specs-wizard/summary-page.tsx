'use client';

import { Pencil, Sparkles } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { AI_DECIDE } from '@/lib/tech-specs-wizard/types';
import type { TechSpecsPreferences, WizardPageConfig, WizardQuestion } from '@/lib/tech-specs-wizard/types';

interface SummaryPageProps {
  pages: WizardPageConfig[];
  preferences: TechSpecsPreferences;
  onJumpToPage: (page: number) => void;
  hideHeader?: boolean;
}

export function SummaryPage({ pages, preferences, onJumpToPage, hideHeader = false }: SummaryPageProps) {
  return (
    <div className="space-y-6">
      {!hideHeader && (
        <div className="space-y-1">
          <h2 className="text-lg font-semibold">Review Your Choices</h2>
          <p className="text-sm text-muted-foreground">
            Check your selections before generating. Click the edit button to change any section.
          </p>
        </div>
      )}

      <div className="space-y-3">
        {pages.map((page, pageIndex) => (
          <SummarySection
            key={page.id}
            page={page}
            pageIndex={pageIndex}
            preferences={preferences}
            onEdit={() => onJumpToPage(pageIndex)}
          />
        ))}
      </div>
    </div>
  );
}

function SummarySection({
  page,
  pageIndex,
  preferences,
  onEdit,
}: {
  page: WizardPageConfig;
  pageIndex: number;
  preferences: TechSpecsPreferences;
  onEdit: () => void;
}) {
  const Icon = page.icon;
  const answers = getPageAnswers(page.questions, preferences);

  return (
    <div className="flex items-start gap-3 rounded-xl border p-4">
      <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-muted">
        <Icon className="h-4 w-4 text-muted-foreground" />
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-center justify-between gap-2">
          <h3 className="text-sm font-medium">{page.title}</h3>
          <Button variant="ghost" size="xs" onClick={onEdit} className="shrink-0 gap-1 text-muted-foreground">
            <Pencil className="h-3 w-3" />
            Edit
          </Button>
        </div>
        <div className="flex flex-wrap gap-1.5 mt-2">
          {answers.length === 0 ? (
            <AiDecideBadge />
          ) : (
            answers.map((answer, i) => (
              <span key={i}>
                {answer.isAiDecide ? (
                  <AiDecideBadge />
                ) : (
                  <Badge variant="secondary" className="text-xs font-normal">
                    {answer.label}
                  </Badge>
                )}
              </span>
            ))
          )}
        </div>
      </div>
    </div>
  );
}

function AiDecideBadge() {
  return (
    <Badge variant="outline" className="text-xs font-normal gap-1 border-dashed text-muted-foreground">
      <Sparkles className="h-3 w-3" />
      AI decides
    </Badge>
  );
}

interface AnswerEntry {
  label: string;
  isAiDecide: boolean;
}

function getPageAnswers(questions: WizardQuestion[], preferences: TechSpecsPreferences): AnswerEntry[] {
  const answers: AnswerEntry[] = [];

  for (const q of questions) {
    if (q.type === 'conditional') {
      // Check visibility
      const parentVal = preferences[q.parentKey];
      const visible = Array.isArray(parentVal)
        ? parentVal.some((v) => q.showWhen.includes(v))
        : q.showWhen.includes(parentVal as string);
      if (!visible) continue;

      const innerAnswers = getQuestionAnswer(q.question, preferences);
      answers.push(...innerAnswers);
      continue;
    }

    answers.push(...getQuestionAnswer(q, preferences));
  }

  return answers;
}

function getQuestionAnswer(
  q: Exclude<WizardQuestion, { type: 'conditional' }>,
  preferences: TechSpecsPreferences
): AnswerEntry[] {
  const value = preferences[q.key];

  if (q.type === 'text-input') {
    const text = value as string;
    if (!text.trim()) return []; // Skip empty text — handled as part of overall "AI decides"
    return [{ label: text.trim(), isAiDecide: false }];
  }

  if (value === AI_DECIDE) {
    return [{ label: 'AI decides', isAiDecide: true }];
  }

  if (q.type === 'single-select') {
    const opt = q.options.find((o) => o.value === value);
    return [{ label: opt?.label ?? (value as string), isAiDecide: false }];
  }

  if (q.type === 'multi-select') {
    const values = value as string[];
    return values.map((v) => {
      const opt = q.options.find((o) => o.value === v);
      return { label: opt?.label ?? v, isAiDecide: false };
    });
  }

  return [];
}
