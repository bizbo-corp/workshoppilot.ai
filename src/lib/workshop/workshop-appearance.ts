/**
 * Workshop Appearance Constants & Helpers
 *
 * Color palette and helpers for workshop card visual differentiation.
 * Uses inline hex values (not Tailwind classes) since colors are data-driven.
 */

export interface WorkshopColor {
  id: string;
  label: string;
  hex: string;       // Border/accent color
  bgHex: string;     // Semi-transparent background (adapts to light/dark mode)
}

export const WORKSHOP_COLORS: WorkshopColor[] = [
  { id: 'blue',   label: 'Blue',   hex: '#3B82F6', bgHex: 'rgba(59, 130, 246, 0.10)' },
  { id: 'green',  label: 'Green',  hex: '#22C55E', bgHex: 'rgba(34, 197, 94, 0.10)' },
  { id: 'purple', label: 'Purple', hex: '#A855F7', bgHex: 'rgba(168, 85, 247, 0.10)' },
  { id: 'orange', label: 'Orange', hex: '#F97316', bgHex: 'rgba(249, 115, 22, 0.10)' },
  { id: 'pink',   label: 'Pink',   hex: '#EC4899', bgHex: 'rgba(236, 72, 153, 0.10)' },
  { id: 'yellow', label: 'Yellow', hex: '#EAB308', bgHex: 'rgba(234, 179, 8, 0.10)' },
  { id: 'teal',   label: 'Teal',   hex: '#14B8A6', bgHex: 'rgba(20, 184, 166, 0.10)' },
  { id: 'red',    label: 'Red',    hex: '#EF4444', bgHex: 'rgba(239, 68, 68, 0.10)' },
];

const COLOR_MAP = new Map(WORKSHOP_COLORS.map((c) => [c.id, c]));

/** Returns a color object by ID, defaults to blue for null/unknown */
export function getWorkshopColor(colorId: string | null | undefined): WorkshopColor {
  return COLOR_MAP.get(colorId ?? '') ?? WORKSHOP_COLORS[0];
}

/** Returns the next color in the cycling palette based on existing workshop count */
export function getNextWorkshopColor(count: number): string {
  return WORKSHOP_COLORS[count % WORKSHOP_COLORS.length].id;
}
