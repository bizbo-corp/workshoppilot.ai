import { notFound, redirect } from 'next/navigation';
import { getStepByOrder } from '@/lib/workshop/step-metadata';
import { StepContainer } from '@/components/workshop/step-container';

interface StepPageProps {
  params: Promise<{
    sessionId: string;
    stepId: string;
  }>;
}

export default async function StepPage({ params }: StepPageProps) {
  const { sessionId, stepId } = await params;

  // Parse step number
  const stepNumber = parseInt(stepId, 10);

  // Validate step number (1-10)
  if (isNaN(stepNumber) || stepNumber < 1 || stepNumber > 10) {
    redirect(`/workshop/${sessionId}/step/1`);
  }

  // Get step metadata
  const step = getStepByOrder(stepNumber);

  if (!step) {
    redirect(`/workshop/${sessionId}/step/1`);
  }

  return (
    <div className="flex h-full flex-col">
      {/* Step header */}
      <div className="border-b bg-background px-6 py-4">
        <h1 className="text-xl font-semibold">
          Step {step.order}: {step.name}
        </h1>
        <p className="mt-1 text-sm text-muted-foreground">
          {step.description}
        </p>
      </div>

      {/* Step content area */}
      <div className="flex-1 overflow-hidden">
        <StepContainer stepOrder={stepNumber} />
      </div>
    </div>
  );
}
