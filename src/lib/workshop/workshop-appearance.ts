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
  bgHex: string;     // Light background for dot hover states
}

export const WORKSHOP_COLORS: WorkshopColor[] = [
  { id: 'blue',   label: 'Blue',   hex: '#3B82F6', bgHex: '#EFF6FF' },
  { id: 'green',  label: 'Green',  hex: '#22C55E', bgHex: '#F0FDF4' },
  { id: 'purple', label: 'Purple', hex: '#A855F7', bgHex: '#FAF5FF' },
  { id: 'orange', label: 'Orange', hex: '#F97316', bgHex: '#FFF7ED' },
  { id: 'pink',   label: 'Pink',   hex: '#EC4899', bgHex: '#FDF2F8' },
  { id: 'yellow', label: 'Yellow', hex: '#EAB308', bgHex: '#FEFCE8' },
  { id: 'teal',   label: 'Teal',   hex: '#14B8A6', bgHex: '#F0FDFA' },
  { id: 'red',    label: 'Red',    hex: '#EF4444', bgHex: '#FEF2F2' },
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
