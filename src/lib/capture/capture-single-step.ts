import { toJpeg } from 'html-to-image';

const CAPTURE_FILTER = (node: Node) => {
  if (node instanceof HTMLElement) {
    const cl = node.classList;
    if (
      cl?.contains('react-flow__controls') ||
      cl?.contains('react-flow__minimap') ||
      cl?.contains('react-flow__attribution')
    ) {
      return false;
    }
  }
  return true;
};

/**
 * Captures the actual on-screen canvas as JPEG data URL(s).
 *
 * For the persona step, each persona card is captured individually.
 * For all other steps, the full canvas is captured as a single image.
 *
 * @returns single base64 string, JSON array of base64 strings, or null
 */
export async function captureSingleStep(
  stepId: string,
  _stepData: unknown
): Promise<string | string[] | null> {
  // Small delay to ensure any pending renders have completed
  await new Promise((resolve) => setTimeout(resolve, 200));

  // Persona step: capture each card individually
  if (stepId === 'persona') {
    const cards = document.querySelectorAll('.persona-card');
    if (cards.length === 0) return null;

    const images: string[] = [];
    for (const card of Array.from(cards)) {
      try {
        const dataUrl = await toJpeg(card as HTMLElement, {
          quality: 0.9,
          pixelRatio: 2,
          backgroundColor: '#e8e6e1',
          filter: CAPTURE_FILTER,
        });
        images.push(dataUrl);
      } catch (err) {
        console.error('[step-snapshot] persona card capture failed:', err);
      }
    }
    return images.length > 0 ? images : null;
  }

  // All other steps: capture full canvas
  const canvasEl = document.querySelector('[data-canvas-capture]') as HTMLElement | null;
  if (!canvasEl) return null;

  try {
    const dataUrl = await toJpeg(canvasEl, {
      quality: 0.9,
      pixelRatio: 2,
      backgroundColor: '#e8e6e1',
      filter: CAPTURE_FILTER,
    });
    return dataUrl;
  } catch (err) {
    console.error('[step-snapshot] html-to-image capture failed:', err);
    return null;
  }
}
