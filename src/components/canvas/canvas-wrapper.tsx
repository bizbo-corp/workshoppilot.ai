'use client';

import dynamic from 'next/dynamic';
import { CanvasLoadingSkeleton } from './canvas-loading-skeleton';

const ReactFlowCanvas = dynamic(
  () => import('./react-flow-canvas').then((mod) => mod.ReactFlowCanvas),
  { ssr: false, loading: () => <CanvasLoadingSkeleton /> }
);

export interface CanvasWrapperProps {
  sessionId: string;
  stepId: string;
}

export function CanvasWrapper({ sessionId, stepId }: CanvasWrapperProps) {
  return <ReactFlowCanvas sessionId={sessionId} stepId={stepId} />;
}
