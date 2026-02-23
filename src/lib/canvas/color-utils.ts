/**
 * Darken a hex color by a given amount.
 * @param hex - Hex color string (e.g. '#b8c9a3')
 * @param amount - 0 = no change, 1 = fully black. Typical: 0.3–0.6
 * @returns Darkened hex color
 */
export function darkenColor(hex: string, amount: number): string {
  // Strip # if present
  const clean = hex.replace('#', '');
  if (clean.length !== 6) return hex;

  const r = parseInt(clean.substring(0, 2), 16);
  const g = parseInt(clean.substring(2, 4), 16);
  const b = parseInt(clean.substring(4, 6), 16);

  const dr = Math.round(r * (1 - amount));
  const dg = Math.round(g * (1 - amount));
  const db = Math.round(b * (1 - amount));

  return `#${dr.toString(16).padStart(2, '0')}${dg.toString(16).padStart(2, '0')}${db.toString(16).padStart(2, '0')}`;
}
