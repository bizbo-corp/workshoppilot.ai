'use client';

/**
 * EraserTool: Handles element deletion on click
 *
 * Responsibilities:
 * - Provide eraser cursor visual feedback
 * - Handle click on elements to delete them
 *
 * Implementation: Event delegation is in EzyDrawStage.
 * This component only provides event handlers that can be attached to elements.
 */

// EraserTool is implemented via event delegation in EzyDrawStage
// When activeTool === 'eraser', elements get onClick handler to deleteElement(id)
// This file exists for consistency but exports no component since eraser
// is purely event-based with no UI besides cursor change

export const eraserCursor = 'crosshair';
