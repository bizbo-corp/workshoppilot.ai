/**
 * UI Kit Component Factories
 *
 * Factory functions for creating wireframe UI components.
 * Each component is composed of multiple DrawingElements linked by a shared groupId.
 */

import { createElementId, type DrawingElement } from './types';

/**
 * Create a button component (rect + text)
 */
export function createButtonComponent(x: number, y: number): DrawingElement[] {
  const groupId = `group-${createElementId()}`;

  return [
    {
      id: createElementId(),
      type: 'rectangle',
      x,
      y,
      width: 120,
      height: 40,
      fill: '#3B82F6',
      stroke: '#2563EB',
      strokeWidth: 2,
      rotation: 0,
      scaleX: 1,
      scaleY: 1,
      opacity: 1,
      groupId,
    },
    {
      id: createElementId(),
      type: 'text',
      x: x + 60,
      y: y + 20,
      text: 'Button',
      fontSize: 16,
      fill: '#FFFFFF',
      width: 100,
      fontFamily: 'Inter, sans-serif',
      rotation: 0,
      scaleX: 1,
      scaleY: 1,
      opacity: 1,
      groupId,
    },
  ];
}

/**
 * Create an input field component (rect + text)
 */
export function createInputComponent(x: number, y: number): DrawingElement[] {
  const groupId = `group-${createElementId()}`;

  return [
    {
      id: createElementId(),
      type: 'rectangle',
      x,
      y,
      width: 200,
      height: 36,
      fill: '#FFFFFF',
      stroke: '#D1D5DB',
      strokeWidth: 1,
      rotation: 0,
      scaleX: 1,
      scaleY: 1,
      opacity: 1,
      groupId,
    },
    {
      id: createElementId(),
      type: 'text',
      x: x + 8,
      y: y + 18,
      text: 'Enter text...',
      fontSize: 14,
      fill: '#9CA3AF',
      width: 184,
      fontFamily: 'Inter, sans-serif',
      rotation: 0,
      scaleX: 1,
      scaleY: 1,
      opacity: 1,
      groupId,
    },
  ];
}

/**
 * Create a card component (rect + line + 2 text elements)
 */
export function createCardComponent(x: number, y: number): DrawingElement[] {
  const groupId = `group-${createElementId()}`;

  return [
    {
      id: createElementId(),
      type: 'rectangle',
      x,
      y,
      width: 240,
      height: 160,
      fill: '#FFFFFF',
      stroke: '#E5E7EB',
      strokeWidth: 1,
      rotation: 0,
      scaleX: 1,
      scaleY: 1,
      opacity: 1,
      groupId,
    },
    {
      id: createElementId(),
      type: 'line',
      x,
      y: y + 40,
      points: [0, 0, 240, 0],
      stroke: '#E5E7EB',
      strokeWidth: 1,
      rotation: 0,
      scaleX: 1,
      scaleY: 1,
      opacity: 1,
      groupId,
    },
    {
      id: createElementId(),
      type: 'text',
      x: x + 12,
      y: y + 20,
      text: 'Card Title',
      fontSize: 16,
      fill: '#1F2937',
      width: 216,
      fontFamily: 'Inter, sans-serif',
      rotation: 0,
      scaleX: 1,
      scaleY: 1,
      opacity: 1,
      groupId,
    },
    {
      id: createElementId(),
      type: 'text',
      x: x + 12,
      y: y + 60,
      text: 'Card content',
      fontSize: 14,
      fill: '#6B7280',
      width: 216,
      fontFamily: 'Inter, sans-serif',
      rotation: 0,
      scaleX: 1,
      scaleY: 1,
      opacity: 1,
      groupId,
    },
  ];
}

/**
 * Create a navbar component (rect + 2 text elements)
 */
export function createNavbarComponent(x: number, y: number): DrawingElement[] {
  const groupId = `group-${createElementId()}`;

  return [
    {
      id: createElementId(),
      type: 'rectangle',
      x,
      y,
      width: 400,
      height: 48,
      fill: '#F9FAFB',
      stroke: '#E5E7EB',
      strokeWidth: 1,
      rotation: 0,
      scaleX: 1,
      scaleY: 1,
      opacity: 1,
      groupId,
    },
    {
      id: createElementId(),
      type: 'text',
      x: x + 16,
      y: y + 24,
      text: 'Logo',
      fontSize: 16,
      fill: '#1F2937',
      width: 100,
      fontFamily: 'Inter, sans-serif',
      rotation: 0,
      scaleX: 1,
      scaleY: 1,
      opacity: 1,
      groupId,
    },
    {
      id: createElementId(),
      type: 'text',
      x: x + 220,
      y: y + 24,
      text: 'Nav Item  Nav Item  Nav Item',
      fontSize: 14,
      fill: '#6B7280',
      width: 164,
      fontFamily: 'Inter, sans-serif',
      rotation: 0,
      scaleX: 1,
      scaleY: 1,
      opacity: 1,
      groupId,
    },
  ];
}

/**
 * Create a modal component (rects + line + text elements)
 */
export function createModalComponent(x: number, y: number): DrawingElement[] {
  const groupId = `group-${createElementId()}`;

  return [
    {
      id: createElementId(),
      type: 'rectangle',
      x,
      y,
      width: 300,
      height: 200,
      fill: '#FFFFFF',
      stroke: '#D1D5DB',
      strokeWidth: 2,
      rotation: 0,
      scaleX: 1,
      scaleY: 1,
      opacity: 1,
      groupId,
    },
    {
      id: createElementId(),
      type: 'line',
      x,
      y: y + 40,
      points: [0, 0, 300, 0],
      stroke: '#E5E7EB',
      strokeWidth: 1,
      rotation: 0,
      scaleX: 1,
      scaleY: 1,
      opacity: 1,
      groupId,
    },
    {
      id: createElementId(),
      type: 'text',
      x: x + 16,
      y: y + 20,
      text: 'Modal Title',
      fontSize: 16,
      fill: '#1F2937',
      width: 268,
      fontFamily: 'Inter, sans-serif',
      rotation: 0,
      scaleX: 1,
      scaleY: 1,
      opacity: 1,
      groupId,
    },
    {
      id: createElementId(),
      type: 'text',
      x: x + 16,
      y: y + 80,
      text: 'Modal content area',
      fontSize: 14,
      fill: '#6B7280',
      width: 268,
      fontFamily: 'Inter, sans-serif',
      rotation: 0,
      scaleX: 1,
      scaleY: 1,
      opacity: 1,
      groupId,
    },
    {
      id: createElementId(),
      type: 'rectangle',
      x: x + 204,
      y: y + 152,
      width: 80,
      height: 32,
      fill: '#3B82F6',
      stroke: '#2563EB',
      strokeWidth: 1,
      rotation: 0,
      scaleX: 1,
      scaleY: 1,
      opacity: 1,
      groupId,
    },
    {
      id: createElementId(),
      type: 'text',
      x: x + 228,
      y: y + 168,
      text: 'OK',
      fontSize: 14,
      fill: '#FFFFFF',
      width: 32,
      fontFamily: 'Inter, sans-serif',
      rotation: 0,
      scaleX: 1,
      scaleY: 1,
      opacity: 1,
      groupId,
    },
  ];
}

/**
 * Create a dropdown component (rect + 2 text elements)
 */
export function createDropdownComponent(x: number, y: number): DrawingElement[] {
  const groupId = `group-${createElementId()}`;

  return [
    {
      id: createElementId(),
      type: 'rectangle',
      x,
      y,
      width: 180,
      height: 36,
      fill: '#FFFFFF',
      stroke: '#D1D5DB',
      strokeWidth: 1,
      rotation: 0,
      scaleX: 1,
      scaleY: 1,
      opacity: 1,
      groupId,
    },
    {
      id: createElementId(),
      type: 'text',
      x: x + 8,
      y: y + 18,
      text: 'Select...',
      fontSize: 14,
      fill: '#9CA3AF',
      width: 120,
      fontFamily: 'Inter, sans-serif',
      rotation: 0,
      scaleX: 1,
      scaleY: 1,
      opacity: 1,
      groupId,
    },
    {
      id: createElementId(),
      type: 'text',
      x: x + 156,
      y: y + 18,
      text: 'v',
      fontSize: 14,
      fill: '#6B7280',
      width: 16,
      fontFamily: 'Inter, sans-serif',
      rotation: 0,
      scaleX: 1,
      scaleY: 1,
      opacity: 1,
      groupId,
    },
  ];
}

/**
 * Create a tab component (3 rects + 3 text elements)
 */
export function createTabComponent(x: number, y: number): DrawingElement[] {
  const groupId = `group-${createElementId()}`;

  return [
    // Active tab (first)
    {
      id: createElementId(),
      type: 'rectangle',
      x,
      y,
      width: 100,
      height: 36,
      fill: '#FFFFFF',
      stroke: '#3B82F6',
      strokeWidth: 2,
      rotation: 0,
      scaleX: 1,
      scaleY: 1,
      opacity: 1,
      groupId,
    },
    {
      id: createElementId(),
      type: 'text',
      x: x + 30,
      y: y + 18,
      text: 'Tab 1',
      fontSize: 14,
      fill: '#1F2937',
      width: 40,
      fontFamily: 'Inter, sans-serif',
      rotation: 0,
      scaleX: 1,
      scaleY: 1,
      opacity: 1,
      groupId,
    },
    // Second tab
    {
      id: createElementId(),
      type: 'rectangle',
      x: x + 100,
      y,
      width: 100,
      height: 36,
      fill: '#F3F4F6',
      stroke: '#E5E7EB',
      strokeWidth: 1,
      rotation: 0,
      scaleX: 1,
      scaleY: 1,
      opacity: 1,
      groupId,
    },
    {
      id: createElementId(),
      type: 'text',
      x: x + 130,
      y: y + 18,
      text: 'Tab 2',
      fontSize: 14,
      fill: '#6B7280',
      width: 40,
      fontFamily: 'Inter, sans-serif',
      rotation: 0,
      scaleX: 1,
      scaleY: 1,
      opacity: 1,
      groupId,
    },
    // Third tab
    {
      id: createElementId(),
      type: 'rectangle',
      x: x + 200,
      y,
      width: 100,
      height: 36,
      fill: '#F3F4F6',
      stroke: '#E5E7EB',
      strokeWidth: 1,
      rotation: 0,
      scaleX: 1,
      scaleY: 1,
      opacity: 1,
      groupId,
    },
    {
      id: createElementId(),
      type: 'text',
      x: x + 230,
      y: y + 18,
      text: 'Tab 3',
      fontSize: 14,
      fill: '#6B7280',
      width: 40,
      fontFamily: 'Inter, sans-serif',
      rotation: 0,
      scaleX: 1,
      scaleY: 1,
      opacity: 1,
      groupId,
    },
  ];
}

/**
 * Create an icon placeholder component (rect + text)
 */
export function createIconPlaceholderComponent(x: number, y: number): DrawingElement[] {
  const groupId = `group-${createElementId()}`;

  return [
    {
      id: createElementId(),
      type: 'rectangle',
      x,
      y,
      width: 48,
      height: 48,
      fill: '#F3F4F6',
      stroke: '#D1D5DB',
      strokeWidth: 1,
      rotation: 0,
      scaleX: 1,
      scaleY: 1,
      opacity: 1,
      groupId,
    },
    {
      id: createElementId(),
      type: 'text',
      x: x + 12,
      y: y + 24,
      text: 'icon',
      fontSize: 12,
      fill: '#9CA3AF',
      width: 24,
      fontFamily: 'Inter, sans-serif',
      rotation: 0,
      scaleX: 1,
      scaleY: 1,
      opacity: 1,
      groupId,
    },
  ];
}

/**
 * Create an image placeholder component (rect + 2 lines + text)
 */
export function createImagePlaceholderComponent(x: number, y: number): DrawingElement[] {
  const groupId = `group-${createElementId()}`;

  return [
    {
      id: createElementId(),
      type: 'rectangle',
      x,
      y,
      width: 200,
      height: 120,
      fill: '#F3F4F6',
      stroke: '#D1D5DB',
      strokeWidth: 1,
      rotation: 0,
      scaleX: 1,
      scaleY: 1,
      opacity: 1,
      groupId,
    },
    {
      id: createElementId(),
      type: 'line',
      x,
      y,
      points: [0, 0, 200, 120],
      stroke: '#D1D5DB',
      strokeWidth: 1,
      rotation: 0,
      scaleX: 1,
      scaleY: 1,
      opacity: 1,
      groupId,
    },
    {
      id: createElementId(),
      type: 'line',
      x,
      y,
      points: [200, 0, 0, 120],
      stroke: '#D1D5DB',
      strokeWidth: 1,
      rotation: 0,
      scaleX: 1,
      scaleY: 1,
      opacity: 1,
      groupId,
    },
    {
      id: createElementId(),
      type: 'text',
      x: x + 76,
      y: y + 60,
      text: 'Image',
      fontSize: 14,
      fill: '#9CA3AF',
      width: 48,
      fontFamily: 'Inter, sans-serif',
      rotation: 0,
      scaleX: 1,
      scaleY: 1,
      opacity: 1,
      groupId,
    },
  ];
}

/**
 * Create a list item component (rect + rect + text)
 */
export function createListItemComponent(x: number, y: number): DrawingElement[] {
  const groupId = `group-${createElementId()}`;

  return [
    {
      id: createElementId(),
      type: 'rectangle',
      x,
      y,
      width: 280,
      height: 48,
      fill: '#FFFFFF',
      stroke: '#E5E7EB',
      strokeWidth: 1,
      rotation: 0,
      scaleX: 1,
      scaleY: 1,
      opacity: 1,
      groupId,
    },
    {
      id: createElementId(),
      type: 'rectangle',
      x: x + 8,
      y: y + 8,
      width: 32,
      height: 32,
      fill: '#F3F4F6',
      stroke: '#D1D5DB',
      strokeWidth: 1,
      rotation: 0,
      scaleX: 1,
      scaleY: 1,
      opacity: 1,
      groupId,
    },
    {
      id: createElementId(),
      type: 'text',
      x: x + 48,
      y: y + 24,
      text: 'List item text',
      fontSize: 14,
      fill: '#1F2937',
      width: 220,
      fontFamily: 'Inter, sans-serif',
      rotation: 0,
      scaleX: 1,
      scaleY: 1,
      opacity: 1,
      groupId,
    },
  ];
}

/**
 * Registry of all UI kit component factories
 */
export const UI_KIT_COMPONENTS = {
  button: createButtonComponent,
  input: createInputComponent,
  card: createCardComponent,
  navbar: createNavbarComponent,
  modal: createModalComponent,
  dropdown: createDropdownComponent,
  tab: createTabComponent,
  iconPlaceholder: createIconPlaceholderComponent,
  imagePlaceholder: createImagePlaceholderComponent,
  listItem: createListItemComponent,
} as const;

/**
 * UI Kit component type keys
 */
export type UIKitComponentType = keyof typeof UI_KIT_COMPONENTS;

/**
 * Human-readable display names for UI kit components
 */
export const UI_KIT_LABELS: Record<UIKitComponentType, string> = {
  button: 'Button',
  input: 'Input Field',
  card: 'Card',
  navbar: 'Navigation Bar',
  modal: 'Modal',
  dropdown: 'Dropdown',
  tab: 'Tabs',
  iconPlaceholder: 'Icon Placeholder',
  imagePlaceholder: 'Image Placeholder',
  listItem: 'List Item',
};
