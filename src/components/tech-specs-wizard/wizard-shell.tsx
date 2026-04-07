'use client';

import { AnimatePresence, motion } from 'framer-motion';
import type { TechSpecsPreferences } from '@/lib/tech-specs-wizard/types';
import type { WizardPageConfig } from '@/lib/tech-specs-wizard/types';
import { WizardProgress } from './wizard-progress';
import { WizardNavigation } from './wizard-navigation';
import { WizardPage } from './wizard-page';
import { SummaryPage } from './summary-page';

interface WizardShellProps {
  pages: WizardPageConfig[];
  currentPage: number;
  direction: 1 | -1;
  isSummary: boolean;
  isGenerating: boolean;
  preferences: TechSpecsPreferences;
  onUpdate: <K extends keyof TechSpecsPreferences>(key: K, value: TechSpecsPreferences[K]) => void;
  onNext: () => void;
  onBack: () => void;
  onGenerate: () => void;
  onJumpToPage: (page: number) => void;
}

export function WizardShell({
  pages,
  currentPage,
  direction,
  isSummary,
  isGenerating,
  preferences,
  onUpdate,
  onNext,
  onBack,
  onGenerate,
  onJumpToPage,
}: WizardShellProps) {
  return (
    <div className="flex flex-col h-full">
      {/* Progress bar */}
      <div className="px-1 pb-6">
        <WizardProgress currentPage={currentPage} isSummary={isSummary} />
      </div>

      {/* Page content (animated) */}
      <div className="flex-1 overflow-y-auto min-h-0">
        <AnimatePresence mode="wait" custom={direction}>
          <motion.div
            key={isSummary ? 'summary' : currentPage}
            custom={direction}
            initial={{ opacity: 0, x: direction * 40 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: direction * -40 }}
            transition={{ duration: 0.2, ease: 'easeInOut' }}
          >
            {isSummary ? (
              <SummaryPage
                pages={pages}
                preferences={preferences}
                onJumpToPage={onJumpToPage}
              />
            ) : (
              <WizardPage
                config={pages[currentPage]}
                preferences={preferences}
                onUpdate={onUpdate}
              />
            )}
          </motion.div>
        </AnimatePresence>
      </div>

      {/* Navigation buttons */}
      <WizardNavigation
        currentPage={currentPage}
        totalPages={pages.length}
        isSummary={isSummary}
        isGenerating={isGenerating}
        onBack={onBack}
        onNext={onNext}
        onGenerate={onGenerate}
      />
    </div>
  );
}
