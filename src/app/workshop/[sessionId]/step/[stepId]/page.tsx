import { redirect } from 'next/navigation';
import { eq } from 'drizzle-orm';
import { db } from '@/db/client';
import { sessions } from '@/db/schema';
import { getStepByOrder, STEPS } from '@/lib/workshop/step-metadata';
import { loadMessages } from '@/lib/ai/message-persistence';
import { StepContainer } from '@/components/workshop/step-container';
import { StepNavigation } from '@/components/workshop/step-navigation';

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

  // Fetch session with workshop and steps for sequential enforcement
  const session = await db.query.sessions.findFirst({
    where: eq(sessions.id, sessionId),
    with: {
      workshop: {
        with: {
          steps: true,
        },
      },
    },
  });

  if (!session) {
    redirect('/dashboard');
  }

  // Sequential enforcement: redirect if trying to access not_started step
  const stepRecord = session.workshop.steps.find((s) => s.stepId === step.id);

  if (stepRecord?.status === 'not_started') {
    // Find the current in_progress step (or first not_started if none in_progress)
    const activeStep = session.workshop.steps.find(
      (s) => s.status === 'in_progress'
    );
    if (activeStep) {
      const activeStepDef = STEPS.find((s) => s.id === activeStep.stepId);
      redirect(`/workshop/${sessionId}/step/${activeStepDef?.order || 1}`);
    }
    redirect(`/workshop/${sessionId}/step/1`);
  }

  // Load chat messages for this session and step
  const initialMessages = await loadMessages(sessionId, step.id);

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
        <StepContainer
          stepOrder={stepNumber}
          sessionId={sessionId}
          initialMessages={initialMessages}
        />
      </div>

      {/* Navigation buttons */}
      <StepNavigation
        sessionId={sessionId}
        workshopId={session.workshop.id}
        currentStepOrder={stepNumber}
      />
    </div>
  );
}
