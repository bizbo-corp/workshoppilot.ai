/**
 * Type definitions for EzyDraw drawing elements
 *
 * All drawing elements use a discriminated union based on the `type` field.
 * Supports: pencil (freehand), rectangle, circle, arrow, line, diamond, text
 */

/**
 * Available drawing tools
 */
export type DrawingTool =
  | 'pencil'
  | 'rectangle'
  | 'circle'
  | 'arrow'
  | 'line'
  | 'diamond'
  | 'text'
  | 'select'
  | 'eraser'
  | 'speechBubble'
  | 'emoji';

/**
 * Base properties shared by all drawing elements
 */
export type BaseElement = {
  id: string;
  x: number;
  y: number;
  rotation: number;
  scaleX: number;
  scaleY: number;
  opacity: number;
  groupId?: string; // Links multiple elements that form a single UI kit component
};

/**
 * Pencil/freehand stroke element using perfect-freehand
 */
export type StrokeElement = BaseElement & {
  type: 'pencil';
  points: number[]; // Flat array from perfect-freehand: [x1, y1, x2, y2, ...]
  stroke: string;
  strokeWidth: number;
  fill: string; // For filled path from getStroke()
};

/**
 * Rectangle element
 */
export type RectangleElement = BaseElement & {
  type: 'rectangle';
  width: number;
  height: number;
  fill: string;
  stroke: string;
  strokeWidth: number;
};

/**
 * Circle/ellipse element
 */
export type CircleElement = BaseElement & {
  type: 'circle';
  radiusX: number;
  radiusY: number;
  fill: string;
  stroke: string;
  strokeWidth: number;
};

/**
 * Arrow element with customizable pointer
 */
export type ArrowElement = BaseElement & {
  type: 'arrow';
  points: number[]; // Start/end as [x1, y1, x2, y2]
  stroke: string;
  strokeWidth: number;
  pointerLength: number;
  pointerWidth: number;
};

/**
 * Line element
 */
export type LineElement = BaseElement & {
  type: 'line';
  points: number[]; // Array of [x1, y1, x2, y2, ...]
  stroke: string;
  strokeWidth: number;
};

/**
 * Diamond (rhombus) element
 */
export type DiamondElement = BaseElement & {
  type: 'diamond';
  width: number;
  height: number;
  fill: string;
  stroke: string;
  strokeWidth: number;
};

/**
 * Text element
 */
export type TextElement = BaseElement & {
  type: 'text';
  text: string;
  fontSize: number;
  fill: string;
  width: number;
  fontFamily: string;
};

/**
 * Speech bubble element with customizable tail
 */
export type SpeechBubbleElement = BaseElement & {
  type: 'speechBubble';
  width: number;
  height: number;
  tailX: number;  // Tail tip x offset relative to bubble origin
  tailY: number;  // Tail tip y offset relative to bubble origin
  text: string;
  fontSize: number;
  fill: string;
  stroke: string;
  strokeWidth: number;
  cornerRadius: number;
};

/**
 * Emoji element (stamp-style, renders as large text)
 */
export type EmojiElement = BaseElement & {
  type: 'emoji';
  emoji: string;    // Native emoji character (e.g., "⭐")
  fontSize: number; // Display size (default 48)
};

/**
 * Discriminated union of all drawing elements
 */
export type DrawingElement =
  | StrokeElement
  | RectangleElement
  | CircleElement
  | ArrowElement
  | LineElement
  | DiamondElement
  | TextElement
  | SpeechBubbleElement
  | EmojiElement;

/**
 * Complete drawing state
 */
export type DrawingState = {
  elements: DrawingElement[];
  selectedElementId: string | null;
  activeTool: DrawingTool;
  strokeColor: string;
  fillColor: string;
  strokeWidth: number;
  fontSize: number;
};

/**
 * Generate a unique element ID using crypto.randomUUID()
 */
export function createElementId(): string {
  return crypto.randomUUID();
}

/**
 * Element that belongs to a compound UI kit component
 */
export type UIKitGroupElement = DrawingElement & { groupId: string };
