/**
 * Workshop Appearance Constants & Helpers
 *
 * Color palette and helpers for workshop card visual differentiation.
 * Uses inline hex values (not Tailwind classes) since colors are data-driven.
 */

export interface WorkshopColor {
  id: string;
  label: string;
  hex: string;          // Border/accent color (full saturation)
  bgHex: string;        // Semi-transparent background (0.18 opacity)
  bgHexStrong: string;  // Stronger background for hero/featured cards (0.30 opacity)
  textHex: string;      // Dark shade for text-on-color contexts
}

// Nature-inspired, desaturated palette — matches canvas/sticky-note tints
export const WORKSHOP_COLORS: WorkshopColor[] = [
  { id: 'blue',   label: 'Sky',      hex: '#6888a0', bgHex: 'rgba(104, 136, 160, 0.18)', bgHexStrong: 'rgba(104, 136, 160, 0.30)', textHex: '#344858' },
  { id: 'green',  label: 'Sage',     hex: '#608850', bgHex: 'rgba(96, 136, 80, 0.18)',   bgHexStrong: 'rgba(96, 136, 80, 0.30)',   textHex: '#344a2c' },
  { id: 'purple', label: 'Lavender', hex: '#8878a0', bgHex: 'rgba(136, 120, 160, 0.18)', bgHexStrong: 'rgba(136, 120, 160, 0.30)', textHex: '#484058' },
  { id: 'orange', label: 'Amber',    hex: '#c08030', bgHex: 'rgba(192, 128, 48, 0.18)',  bgHexStrong: 'rgba(192, 128, 48, 0.30)',  textHex: '#6b4420' },
  { id: 'pink',   label: 'Rose',     hex: '#b07068', bgHex: 'rgba(176, 112, 104, 0.18)', bgHexStrong: 'rgba(176, 112, 104, 0.30)', textHex: '#784040' },
  { id: 'yellow', label: 'Gold',     hex: '#c49820', bgHex: 'rgba(196, 152, 32, 0.18)',  bgHexStrong: 'rgba(196, 152, 32, 0.30)',  textHex: '#6b5020' },
  { id: 'teal',   label: 'Teal',     hex: '#5a9888', bgHex: 'rgba(90, 152, 136, 0.18)',  bgHexStrong: 'rgba(90, 152, 136, 0.30)',  textHex: '#2c4a42' },
  { id: 'red',    label: 'Clay',     hex: '#a86050', bgHex: 'rgba(168, 96, 80, 0.18)',   bgHexStrong: 'rgba(168, 96, 80, 0.30)',   textHex: '#684038' },
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
