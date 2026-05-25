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

// Vibrant Figma-sticky palette — matches canvas/sticky-note tints
export const WORKSHOP_COLORS: WorkshopColor[] = [
  { id: 'blue',   label: 'Sky',      hex: '#a8daff', bgHex: 'rgba(168, 218, 255, 0.30)', bgHexStrong: 'rgba(168, 218, 255, 0.55)', textHex: '#0a1f4a' },
  { id: 'green',  label: 'Sage',     hex: '#b3efbd', bgHex: 'rgba(179, 239, 189, 0.30)', bgHexStrong: 'rgba(179, 239, 189, 0.55)', textHex: '#0a3818' },
  { id: 'purple', label: 'Lavender', hex: '#d3bdff', bgHex: 'rgba(211, 189, 255, 0.30)', bgHexStrong: 'rgba(211, 189, 255, 0.55)', textHex: '#2a1252' },
  { id: 'orange', label: 'Amber',    hex: '#ffd3a8', bgHex: 'rgba(255, 211, 168, 0.30)', bgHexStrong: 'rgba(255, 211, 168, 0.55)', textHex: '#4a2805' },
  { id: 'pink',   label: 'Rose',     hex: '#ffa8db', bgHex: 'rgba(255, 168, 219, 0.30)', bgHexStrong: 'rgba(255, 168, 219, 0.55)', textHex: '#5a1438' },
  { id: 'yellow', label: 'Gold',     hex: '#ffe299', bgHex: 'rgba(255, 226, 153, 0.30)', bgHexStrong: 'rgba(255, 226, 153, 0.55)', textHex: '#3d2a00' },
  { id: 'teal',   label: 'Teal',     hex: '#b3f4ef', bgHex: 'rgba(179, 244, 239, 0.30)', bgHexStrong: 'rgba(179, 244, 239, 0.55)', textHex: '#0a3a35' },
  { id: 'red',    label: 'Clay',     hex: '#ffafa3', bgHex: 'rgba(255, 175, 163, 0.30)', bgHexStrong: 'rgba(255, 175, 163, 0.55)', textHex: '#4a1408' },
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

/** Returns a random color from the palette (used as the new-workshop default) */
export function getRandomWorkshopColor(): WorkshopColor {
  return WORKSHOP_COLORS[Math.floor(Math.random() * WORKSHOP_COLORS.length)];
}

// Curated set of cheerful, everyday emojis for new-workshop defaults.
// Vehicles, fruit/food, space & stars, nature, friendly animals, fun objects.
// Deliberately no flags, faces, or anything that could read as loaded.
export const WORKSHOP_EMOJIS: string[] = [
  // Vehicles & travel
  '🚀', '🚗', '🚙', '🚌', '🚲', '🛵', '🏍️', '✈️', '🚁', '⛵', '🚤', '🚂', '🚜', '🛸', '🪂', '🎈',
  // Fruit & food
  '🍎', '🍊', '🍋', '🍌', '🍉', '🍇', '🍓', '🫐', '🍒', '🍑', '🥭', '🍍', '🥝', '🥑', '🌽', '🥕', '🍄', '🍕', '🌮', '🍔', '🍦', '🍩', '🍪', '🎂', '🍫', '🍿',
  // Space, sky & weather
  '⭐', '🌟', '✨', '🌙', '☀️', '🌈', '⚡', '🔥', '❄️', '🌊', '☁️', '🪐', '🌍',
  // Nature & plants
  '🌸', '🌻', '🌵', '🌴', '🍀', '🌲', '🍁', '🌷', '🌺',
  // Friendly animals
  '🐶', '🐱', '🦊', '🐻', '🐼', '🐸', '🐝', '🦋', '🐢', '🐙', '🐳', '🦁', '🦉', '🦄', '🐬',
  // Fun objects
  '🎁', '🎨', '🎸', '🎯', '🧩', '🔑', '💡', '🔮', '🎲', '🧭', '📦', '⚓', '🪁', '🎪', '🏆', '💎', '🔔', '🧲',
];

/** Returns a random emoji from the curated set (used as the new-workshop default) */
export function getRandomWorkshopEmoji(): string {
  return WORKSHOP_EMOJIS[Math.floor(Math.random() * WORKSHOP_EMOJIS.length)];
}
