/**
 * Grid Layout Module
 * Pure coordinate system for grid-based canvas layouts (Step 6: Journey Mapping)
 * Provides types and pure functions for cell-based positioning and snapping
 */

/**
 * Configuration for a grid layout with dynamic rows and columns
 */
export type GridConfig = {
  rows: Array<{ id: string; label: string; height: number }>;
  columns: Array<{ id: string; label: string; width: number }>;
  origin: { x: number; y: number }; // Grid top-left in canvas coordinates
  cellPadding: number; // Padding inside cell for node placement (10px)
};

/**
 * Zero-indexed cell coordinate (row, col)
 */
export type CellCoordinate = { row: number; col: number };

/**
 * Pixel bounds of a cell
 */
export type CellBounds = { x: number; y: number; width: number; height: number };

/**
 * Get pixel bounds for a specific cell
 * @param coord - Zero-indexed cell coordinate
 * @param config - Grid configuration
 * @returns Pixel bounds of the cell
 */
export function getCellBounds(coord: CellCoordinate, config: GridConfig): CellBounds {
  // Calculate x position by summing preceding column widths
  let x = config.origin.x;
  for (let i = 0; i < coord.col; i++) {
    x += config.columns[i].width;
  }

  // Calculate y position by summing preceding row heights
  let y = config.origin.y;
  for (let i = 0; i < coord.row; i++) {
    y += config.rows[i].height;
  }

  // Get current cell dimensions
  const width = config.columns[coord.col].width;
  const height = config.rows[coord.row].height;

  return { x, y, width, height };
}

/**
 * Detect which cell a canvas position falls in
 * @param position - Canvas position (x, y)
 * @param config - Grid configuration
 * @returns Cell coordinate or null if outside grid bounds
 */
export function positionToCell(
  position: { x: number; y: number },
  config: GridConfig
): CellCoordinate | null {
  // Calculate relative position from grid origin
  const relativeX = position.x - config.origin.x;
  const relativeY = position.y - config.origin.y;

  // Check if position is before grid origin (negative relative position)
  if (relativeX < 0 || relativeY < 0) {
    return null;
  }

  // Find column by accumulating widths
  let accumulatedWidth = 0;
  let col = -1;
  for (let i = 0; i < config.columns.length; i++) {
    accumulatedWidth += config.columns[i].width;
    if (relativeX < accumulatedWidth) {
      col = i;
      break;
    }
  }

  // Find row by accumulating heights
  let accumulatedHeight = 0;
  let row = -1;
  for (let i = 0; i < config.rows.length; i++) {
    accumulatedHeight += config.rows[i].height;
    if (relativeY < accumulatedHeight) {
      row = i;
      break;
    }
  }

  // Return null if position is beyond grid bounds
  if (row === -1 || col === -1) {
    return null;
  }

  return { row, col };
}

/**
 * Snap a position to the nearest cell's padded top-left corner
 * @param position - Canvas position (x, y)
 * @param config - Grid configuration
 * @returns Snapped position (cell origin + padding) or original position if outside grid
 */
export function snapToCell(
  position: { x: number; y: number },
  config: GridConfig
): { x: number; y: number } {
  // Detect which cell the position falls in
  const cell = positionToCell(position, config);

  // If outside grid, return original position (no snap)
  if (!cell) {
    return position;
  }

  // Get cell bounds
  const bounds = getCellBounds(cell, config);

  // Return cell origin plus padding (prevents nodes from touching cell borders)
  return {
    x: bounds.x + config.cellPadding,
    y: bounds.y + config.cellPadding,
  };
}

/**
 * Get total grid dimensions
 * @param config - Grid configuration
 * @returns Total width and height of the grid
 */
export function getGridDimensions(config: GridConfig): { width: number; height: number } {
  const width = config.columns.reduce((sum, col) => sum + col.width, 0);
  const height = config.rows.reduce((sum, row) => sum + row.height, 0);
  return { width, height };
}
