/**
 * Extract all Vercel Blob URLs from a stepArtifacts.artifact JSONB structure.
 *
 * Walks the entire artifact to find image references across all canvas features:
 * - drawings[].pngUrl
 * - drawings[].vectorJson → backgroundImageUrl
 * - _canvas.crazy8sSlots[].imageUrl
 * - _canvas.brainRewritingMatrices[].sourceImageUrl
 * - _canvas.brainRewritingMatrices[].cells[].imageUrl
 * - _canvas.conceptCards[].sketchImageUrl
 * - _canvas.personaTemplates[].avatarUrl
 * - _canvas.drawingNodes[].imageUrl
 *
 * Returns a deduplicated array of valid blob URLs (https:// only).
 */
export function extractBlobUrlsFromArtifact(
  artifact: Record<string, unknown>
): string[] {
  const urls = new Set<string>();

  function addIfBlobUrl(value: unknown) {
    if (typeof value === 'string' && value.startsWith('https://')) {
      urls.add(value);
    }
  }

  // 1. drawings[].pngUrl and vectorJson backgroundImageUrl
  const drawings = artifact.drawings as
    | Array<{ pngUrl?: string; vectorJson?: string }>
    | undefined;

  if (Array.isArray(drawings)) {
    for (const drawing of drawings) {
      addIfBlobUrl(drawing.pngUrl);

      // Parse vectorJson to find backgroundImageUrl
      if (typeof drawing.vectorJson === 'string') {
        try {
          const parsed = JSON.parse(drawing.vectorJson);
          // New wrapper format has backgroundImageUrl at top level
          if (parsed && typeof parsed === 'object' && !Array.isArray(parsed)) {
            addIfBlobUrl(parsed.backgroundImageUrl);
          }
        } catch {
          // Malformed JSON — skip
        }
      }
    }
  }

  // 2. _canvas sub-object (canvas state persisted alongside step artifacts)
  const canvas = artifact._canvas as Record<string, unknown> | undefined;
  if (!canvas) return Array.from(urls);

  // crazy8sSlots[].imageUrl
  const slots = canvas.crazy8sSlots as Array<{ imageUrl?: string }> | undefined;
  if (Array.isArray(slots)) {
    for (const slot of slots) {
      addIfBlobUrl(slot.imageUrl);
    }
  }

  // brainRewritingMatrices[].sourceImageUrl and .cells[].imageUrl
  const matrices = canvas.brainRewritingMatrices as
    | Array<{
        sourceImageUrl?: string;
        cells?: Array<{ imageUrl?: string }>;
      }>
    | undefined;

  if (Array.isArray(matrices)) {
    for (const matrix of matrices) {
      addIfBlobUrl(matrix.sourceImageUrl);
      if (Array.isArray(matrix.cells)) {
        for (const cell of matrix.cells) {
          addIfBlobUrl(cell.imageUrl);
        }
      }
    }
  }

  // conceptCards[].sketchImageUrl
  const concepts = canvas.conceptCards as
    | Array<{ sketchImageUrl?: string }>
    | undefined;

  if (Array.isArray(concepts)) {
    for (const card of concepts) {
      addIfBlobUrl(card.sketchImageUrl);
    }
  }

  // personaTemplates[].avatarUrl
  const personas = canvas.personaTemplates as
    | Array<{ avatarUrl?: string }>
    | undefined;

  if (Array.isArray(personas)) {
    for (const persona of personas) {
      addIfBlobUrl(persona.avatarUrl);
    }
  }

  // drawingNodes[].imageUrl
  const drawingNodes = canvas.drawingNodes as
    | Array<{ imageUrl?: string }>
    | undefined;

  if (Array.isArray(drawingNodes)) {
    for (const node of drawingNodes) {
      addIfBlobUrl(node.imageUrl);
    }
  }

  return Array.from(urls);
}
