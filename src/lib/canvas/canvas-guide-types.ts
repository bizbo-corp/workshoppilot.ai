/**
 * Shared canvas guide types used by both client and server.
 * This is the canonical type — replaces CanvasGuideDefinition from canvas-guide-config.ts.
 */

export type CanvasGuideVariant = 'card' | 'image' | 'template-sticky-note' | 'frame' | 'arrow';
export type CanvasGuideDismissBehavior = 'auto-dismiss' | 'hover-x' | 'persistent';
export type CanvasGuidePlacementMode = 'pinned' | 'on-canvas';
export type CanvasGuideLayer = 'background' | 'foreground';
export type CanvasGuidePinnedPosition =
  | 'center'
  | 'top-left'
  | 'top-center'
  | 'top-right'
  | 'bottom-center';

export interface CanvasGuideData {
  id: string;
  stepId: string;
  title?: string | null;
  body: string;
  variant: CanvasGuideVariant;
  color?: string | null;
  layer: CanvasGuideLayer;
  placementMode: CanvasGuidePlacementMode;
  pinnedPosition?: CanvasGuidePinnedPosition | string | null;
  canvasX?: number | null;
  canvasY?: number | null;
  dismissBehavior: CanvasGuideDismissBehavior;
  showOnlyWhenEmpty: boolean;
  sortOrder: number;
  width?: number | null;
  height?: number | null;
  rotation?: number | null;
  imageUrl?: string | null;
  imageSvg?: string | null;
  imagePosition?: 'before' | 'above' | 'below' | 'after' | null;
  showStroke?: boolean;
  showFill?: boolean;
  libraryAssetId?: string | null;
  templateKey?: string | null;
  placeholderText?: string | null;
  /** Linked asset data (populated by server join, not stored in DB) */
  linkedAsset?: { inlineSvg?: string | null; blobUrl: string; name: string } | null;
}
