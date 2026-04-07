'use client';

import { AI_DECIDE } from '@/lib/tech-specs-wizard/types';
import type { TechSpecsPreferences, WizardPageConfig, WizardQuestion } from '@/lib/tech-specs-wizard/types';
import { OptionCard } from './option-card';
import { MultiOptionCard } from './multi-option-card';
import { AiDecideOption } from './ai-decide-option';
import { TextQuestion } from './text-question';

interface WizardPageProps {
  config: WizardPageConfig;
  preferences: TechSpecsPreferences;
  onUpdate: <K extends keyof TechSpecsPreferences>(key: K, value: TechSpecsPreferences[K]) => void;
}

export function WizardPage({ config, preferences, onUpdate }: WizardPageProps) {
  const Icon = config.icon;

  return (
    <div className="space-y-8">
      {/* Page header */}
      <div className="space-y-2">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary">
            <Icon className="h-5 w-5" />
          </div>
          <div>
            <h2 className="text-lg font-semibold">{config.title}</h2>
            <p className="text-sm text-muted-foreground">{config.description}</p>
          </div>
        </div>
      </div>

      {/* Questions */}
      <div className="space-y-8">
        {config.questions.map((question, idx) => (
          <QuestionRenderer
            key={idx}
            question={question}
            preferences={preferences}
            onUpdate={onUpdate}
          />
        ))}
      </div>
    </div>
  );
}

function QuestionRenderer({
  question,
  preferences,
  onUpdate,
}: {
  question: WizardQuestion;
  preferences: TechSpecsPreferences;
  onUpdate: <K extends keyof TechSpecsPreferences>(key: K, value: TechSpecsPreferences[K]) => void;
}) {
  // Handle conditional questions
  if (question.type === 'conditional') {
    const parentValue = preferences[question.parentKey];
    // For array values (multi-select), check if any showWhen value is in the array
    const isVisible = Array.isArray(parentValue)
      ? parentValue.some((v) => question.showWhen.includes(v))
      : question.showWhen.includes(parentValue as string);

    if (!isVisible) return null;
    return (
      <QuestionRenderer
        question={question.question}
        preferences={preferences}
        onUpdate={onUpdate}
      />
    );
  }

  if (question.type === 'text-input') {
    return (
      <TextQuestion
        label={question.label}
        value={preferences[question.key] as string}
        placeholder={question.placeholder}
        onChange={(v) => onUpdate(question.key, v as TechSpecsPreferences[typeof question.key])}
      />
    );
  }

  if (question.type === 'single-select') {
    const currentValue = preferences[question.key];
    const isAiDecide = currentValue === AI_DECIDE;

    return (
      <div className="space-y-3">
        <div>
          <h3 className="text-sm font-medium">{question.label}</h3>
          {question.description && (
            <p className="text-xs text-muted-foreground mt-0.5">{question.description}</p>
          )}
        </div>
        <div className="grid gap-2 sm:grid-cols-2" role="radiogroup" aria-label={question.label}>
          <AiDecideOption
            selected={isAiDecide}
            onSelect={() => onUpdate(question.key, AI_DECIDE as TechSpecsPreferences[typeof question.key])}
          />
          {question.options.map((opt) => (
            <OptionCard
              key={opt.value}
              label={opt.label}
              description={opt.description}
              icon={opt.icon}
              selected={currentValue === opt.value}
              onSelect={() => onUpdate(question.key, opt.value as TechSpecsPreferences[typeof question.key])}
            />
          ))}
        </div>
      </div>
    );
  }

  if (question.type === 'multi-select') {
    const currentValue = preferences[question.key];
    const isAiDecide = currentValue === AI_DECIDE;
    const selectedValues = isAiDecide ? [] : (currentValue as string[]);

    const handleToggle = (value: string) => {
      const newValues = selectedValues.includes(value)
        ? selectedValues.filter((v) => v !== value)
        : [...selectedValues, value];
      onUpdate(
        question.key,
        (newValues.length === 0 ? AI_DECIDE : newValues) as TechSpecsPreferences[typeof question.key]
      );
    };

    const handleAiDecide = () => {
      onUpdate(question.key, AI_DECIDE as TechSpecsPreferences[typeof question.key]);
    };

    return (
      <div className="space-y-3">
        <div>
          <h3 className="text-sm font-medium">{question.label}</h3>
          {question.description && (
            <p className="text-xs text-muted-foreground mt-0.5">{question.description}</p>
          )}
        </div>
        <div className="grid gap-2 sm:grid-cols-2" role="group" aria-label={question.label}>
          <AiDecideOption
            selected={isAiDecide}
            onSelect={handleAiDecide}
          />
          {question.options.map((opt) => (
            <MultiOptionCard
              key={opt.value}
              label={opt.label}
              description={opt.description}
              icon={opt.icon}
              checked={selectedValues.includes(opt.value)}
              onToggle={() => handleToggle(opt.value)}
            />
          ))}
        </div>
      </div>
    );
  }

  return null;
}
