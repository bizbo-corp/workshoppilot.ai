/**
 * Persona first-name pools used to seed AI-interview persona candidates in
 * Step 3 (User Research). The facilitator and participant pools are kept
 * distinct so a facilitator and a participant in the same workshop never draw
 * the same persona names; both are shuffled at call time.
 *
 * Each name carries a `gender` so downstream avatar generation
 * (`/api/ai/generate-persona-image`) can render a consistent portrait instead
 * of coin-flipping when the name isn't in its own lookup lists — a real problem
 * for Māori and other names absent from those English-centric sets. Names are
 * also chosen to be recognisable to that route's ethnicity inference (e.g. the
 * Māori names here appear in its MAORI_TOKENS set).
 */

export type PersonaGender = 'man' | 'woman';
export type GenderedName = { name: string; gender: PersonaGender };

/** Facilitator-side persona name pool (leans Anglo-Saxon + Māori). */
export const FACILITATOR_NAME_POOL: GenderedName[] = [
  { name: 'Marta', gender: 'woman' },
  { name: 'Tariq', gender: 'man' },
  { name: 'Lila', gender: 'woman' },
  { name: 'Tāne', gender: 'man' },
  { name: 'Jin', gender: 'man' },
  { name: 'Suki', gender: 'woman' },
  { name: 'Rafael', gender: 'man' },
  { name: 'Olga', gender: 'woman' },
  { name: 'Anaru', gender: 'man' },
  { name: 'Petra', gender: 'woman' },
  { name: 'Idris', gender: 'man' },
  { name: 'Anika', gender: 'woman' },
  { name: 'Mateo', gender: 'man' },
  { name: 'Leila', gender: 'woman' },
  { name: 'Edward', gender: 'man' },
  { name: 'Esme', gender: 'woman' },
  { name: 'Ravi', gender: 'man' },
  { name: 'Niamh', gender: 'woman' },
  { name: 'Dmitri', gender: 'man' },
  { name: 'Aaliya', gender: 'woman' },
  { name: 'Oscar', gender: 'man' },
  { name: 'Marama', gender: 'woman' },
  { name: 'Hemi', gender: 'man' },
  { name: 'Harriet', gender: 'woman' },
  { name: 'Anders', gender: 'man' },
  { name: 'Priya', gender: 'woman' },
  { name: 'Ezra', gender: 'man' },
  { name: 'Linnea', gender: 'woman' },
  { name: 'Wiremu', gender: 'man' },
  { name: 'Thalia', gender: 'woman' },
];

/** Participant-side persona name pool (kept diverse and distinct from above). */
export const PARTICIPANT_NAME_POOL: GenderedName[] = [
  { name: 'Rewa', gender: 'woman' },
  { name: 'Davi', gender: 'man' },
  { name: 'Sara', gender: 'woman' },
  { name: 'Odin', gender: 'man' },
  { name: 'Amara', gender: 'woman' },
  { name: 'Felix', gender: 'man' },
  { name: 'Ingrid', gender: 'woman' },
  { name: 'Conor', gender: 'man' },
  { name: 'Yuki', gender: 'woman' },
  { name: 'Sam', gender: 'man' },
  { name: 'Clara', gender: 'woman' },
  { name: 'Ren', gender: 'man' },
  { name: 'Farah', gender: 'woman' },
  { name: 'Elio', gender: 'man' },
  { name: 'Ngaire', gender: 'woman' },
  { name: 'Tomás', gender: 'man' },
  { name: 'Ayo', gender: 'man' },
  { name: 'Mei', gender: 'woman' },
  { name: 'Nora', gender: 'woman' },
  { name: 'Zara', gender: 'woman' },
  { name: 'Luca', gender: 'man' },
  { name: 'Isla', gender: 'woman' },
  { name: 'Rohan', gender: 'man' },
  { name: 'Cleo', gender: 'woman' },
  { name: 'Hana', gender: 'woman' },
  { name: 'Marcus', gender: 'man' },
  { name: 'Sofia', gender: 'woman' },
  { name: 'Jake', gender: 'man' },
  { name: 'Aroha', gender: 'woman' },
  { name: 'Nico', gender: 'man' },
];

/**
 * Normalise a name to a bare lowercase first-name key. NFD decomposition splits
 * accented letters into base + combining mark, and the final [^a-z] strip drops
 * the combining marks — so "Tāne" and "Tomás" key as "tane" / "tomas".
 */
function firstNameKey(name: string): string {
  return name
    .trim()
    .split(/\s+/)[0]
    .normalize('NFD')
    .toLowerCase()
    .replace(/[^a-z]/g, '');
}

const GENDER_BY_FIRST_NAME: Record<string, PersonaGender> = Object.fromEntries(
  [...FACILITATOR_NAME_POOL, ...PARTICIPANT_NAME_POOL].map(({ name, gender }) => [
    firstNameKey(name),
    gender,
  ]),
);

/**
 * Look up the declared gender for a pool persona name (matched on first name,
 * case- and diacritic-insensitive). Returns null for names that aren't from our
 * pools (e.g. a user-typed or AI-invented persona) so callers can fall back to
 * their own inference.
 */
export function genderForPoolName(name: string | undefined | null): PersonaGender | null {
  if (!name) return null;
  const key = firstNameKey(name);
  return key ? GENDER_BY_FIRST_NAME[key] ?? null : null;
}
