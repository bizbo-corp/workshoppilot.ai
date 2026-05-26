/**
 * Static "canned" example suggestions for the Step 1 "Set up your workshop" cards.
 *
 * These appear instantly (zero AI cost) on the Idea / Problem / Audience cards so a
 * new user has something to riff on. Once any card has content, the WorkshopSetup
 * component fetches contextual replacements for the still-empty cards from
 * /api/ai/setup-suggestions — these statics are the cold-start fallback.
 */

export type SetupField = 'idea' | 'problem' | 'audience';

export const STATIC_SETUP_SUGGESTIONS: Record<SetupField, string[]> = {
  idea: [
    'A mobile app for booking last-minute dog walkers',
    'A storytelling framework for first-time founders',
    'A community space for remote freelancers',
    'A subscription box for independent coffee roasters',
    'A redesign of how new hires get onboarded',
    'A podcast that demystifies personal finance',
  ],
  problem: [
    "People can't find trustworthy help on short notice",
    'Great ideas die because no one can explain them clearly',
    'Remote workers feel isolated and lose momentum',
    "Shoppers can't tell genuine quality from marketing hype",
    'New hires feel lost and unsupported in their first month',
    'Managing money feels stressful and confusing',
  ],
  // Short group labels — these render as multi-select pills that compose into a
  // sentence, so they read well both alone and combined ("Dog walkers and CEOs").
  audience: [
    'Busy pet owners',
    'Small business owners',
    'Remote freelancers',
    'Marketing teams',
    'New employees',
    'Work-from-home professionals',
  ],
};

/** Pick `n` distinct random suggestions for a field from the static pool. */
export function getRandomStaticSuggestions(field: SetupField, n = 3): string[] {
  const pool = [...STATIC_SETUP_SUGGESTIONS[field]];
  // Fisher–Yates partial shuffle
  for (let i = pool.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [pool[i], pool[j]] = [pool[j], pool[i]];
  }
  return pool.slice(0, n);
}
