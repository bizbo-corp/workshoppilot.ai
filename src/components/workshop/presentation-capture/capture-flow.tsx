'use client';

/**
 * CaptureFlow Component
 *
 * Renders each step in a hidden off-screen container, captures it as a JPEG
 * using html-to-image, and returns a map of step keys to base64 JPEG strings.
 */

import { useState, useRef, useCallback, useEffect } from 'react';
import { createRoot } from 'react-dom/client';
import { toJpeg } from 'html-to-image';
import { STEP_RENDERERS, STEP_ORDER, type StepData } from './step-renderers';

interface CaptureFlowProps {
  /** Canvas data for all steps: { [stepKey]: { artifact, canvas } } */
  stepsData: Record<string, StepData>;
  /** Called when capture begins */
  onStart?: () => void;
  /** Called with progress updates */
  onProgress?: (current: number, total: number, stepName: string) => void;
  /** Called when all captures complete */
  onComplete: (images: Record<string, string>) => void;
  /** Called on error */
  onError?: (error: Error) => void;
  /** Set to true to trigger the capture */
  trigger: boolean;
}

export function CaptureFlow({
  stepsData,
  onStart,
  onProgress,
  onComplete,
  onError,
  trigger,
}: CaptureFlowProps) {
  const [capturing, setCapturing] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const hasTriggered = useRef(false);

  const runCapture = useCallback(async () => {
    if (capturing || !containerRef.current) return;
    setCapturing(true);
    onStart?.();

    const container = containerRef.current;
    const images: Record<string, string> = {};

    // Find which steps have data
    const stepsToCapture = STEP_ORDER.filter(
      (key) => stepsData[key]?.artifact
    );

    try {
      for (let i = 0; i < stepsToCapture.length; i++) {
        const stepKey = stepsToCapture[i];
        const Renderer = STEP_RENDERERS[stepKey];
        const stepData = stepsData[stepKey];

        if (!Renderer || !stepData) continue;

        onProgress?.(i + 1, stepsToCapture.length, stepKey);

        // Clear container
        container.innerHTML = '';

        // Create a render target
        const renderTarget = document.createElement('div');
        renderTarget.style.width = '1200px';
        renderTarget.style.height = '800px';
        container.appendChild(renderTarget);

        // Render the step component
        const root = createRoot(renderTarget);
        root.render(<Renderer data={stepData} />);

        // Wait for paint
        await new Promise((resolve) => {
          requestAnimationFrame(() => {
            requestAnimationFrame(resolve);
          });
        });

        // Small additional delay for fonts/layout
        await new Promise((resolve) => setTimeout(resolve, 100));

        // Capture as JPEG
        const dataUrl = await toJpeg(renderTarget, {
          quality: 0.85,
          width: 1200,
          height: 800,
          backgroundColor: '#ffffff',
        });

        // Strip data URL prefix to get raw base64
        images[stepKey] = dataUrl;

        // Cleanup
        root.unmount();
      }

      onComplete(images);
    } catch (err) {
      onError?.(err instanceof Error ? err : new Error('Capture failed'));
    } finally {
      setCapturing(false);
      if (container) container.innerHTML = '';
    }
  }, [stepsData, capturing, onStart, onProgress, onComplete, onError]);

  // Trigger capture when prop changes
  useEffect(() => {
    if (trigger && !hasTriggered.current) {
      hasTriggered.current = true;
      runCapture();
    }
    if (!trigger) {
      hasTriggered.current = false;
    }
  }, [trigger, runCapture]);

  return (
    <div
      ref={containerRef}
      style={{
        position: 'fixed',
        left: -9999,
        top: 0,
        width: 1200,
        height: 800,
        overflow: 'hidden',
        pointerEvents: 'none',
        zIndex: -1,
      }}
      aria-hidden="true"
    />
  );
}
