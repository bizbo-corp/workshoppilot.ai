/**
 * Drawing export utilities for EzyDraw
 *
 * Handles PNG export with UI layer hiding for clean output
 */

import type Konva from 'konva';

/**
 * Export Konva stage to PNG data URL with retina quality
 *
 * Temporarily hides UI layer (transformers, selection indicators) before export
 *
 * @param stage - Konva Stage instance
 * @param options - Export options (pixelRatio defaults to 2 for retina)
 * @returns Base64 PNG data URL
 */
export function exportToPNG(
  stage: Konva.Stage,
  options: { pixelRatio?: number } = {}
): string {
  const { pixelRatio = 2 } = options;

  // Find UI layer (typically contains transformers and selection indicators)
  const layers = stage.getLayers();
  const uiLayer = layers.find((layer) => layer.getAttr('name') === 'ui-layer');

  // Hide UI layer before export
  const wasVisible = uiLayer?.visible() ?? false;
  if (uiLayer) {
    uiLayer.visible(false);
  }

  // Export to PNG with specified pixel ratio for retina quality
  const dataURL = stage.toDataURL({
    mimeType: 'image/png',
    pixelRatio,
  });

  // Restore UI layer visibility
  if (uiLayer) {
    uiLayer.visible(wasVisible);
  }

  return dataURL;
}

/**
 * Export Konva stage to PNG Blob (for upload to Vercel Blob in Phase 26)
 *
 * @param stage - Konva Stage instance
 * @param options - Export options
 * @returns Promise resolving to Blob
 */
export async function exportToBlob(
  stage: Konva.Stage,
  options: { pixelRatio?: number } = {}
): Promise<Blob> {
  const dataURL = exportToPNG(stage, options);

  // Convert base64 data URL to Blob
  const response = await fetch(dataURL);
  const blob = await response.blob();

  return blob;
}
