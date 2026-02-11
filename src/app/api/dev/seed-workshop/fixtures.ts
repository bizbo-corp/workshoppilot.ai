/**
 * PawPal Pet Care App - Seed Workshop Fixtures
 *
 * Coherent fixture data for all 10 design thinking steps.
 * Scenario: "PawPal" pet care app for busy urban pet owners.
 * Persona: Sarah Chen, 32, product manager in Austin with a dog (Biscuit) and cat (Mochi).
 *
 * All step data references previous steps consistently:
 * - Persona name flows from Step 5 into Steps 6-10
 * - HMW from Step 1 evolves through Step 7 reframe
 * - Journey stages in Step 6 feed into Step 7 insights
 * - Selected ideas in Step 8 become concepts in Step 9
 */

import type { PostIt, PostItColor } from '@/stores/canvas-store';
import type { Quadrant } from '@/lib/canvas/quadrant-detection';
import { getCellBounds, type GridConfig } from '@/lib/canvas/grid-layout';
import { STEP_CANVAS_CONFIGS } from '@/lib/canvas/step-canvas-config';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export type StepFixture = {
  artifact: Record<string, unknown>;
  summary: string;
  canvas?: PostIt[];
};

// ---------------------------------------------------------------------------
// Canvas positioning helpers
// ---------------------------------------------------------------------------

const POST_IT_WIDTH = 160;
const POST_IT_HEIGHT = 100;

/**
 * Position a post-it in the correct quadrant for Steps 2 & 4.
 * Canvas origin (0,0) is the center dividing line.
 *   Y < 0 = top half, Y >= 0 = bottom half
 *   X < 0 = left half, X >= 0 = right half
 */
function quadrantPostIt(
  text: string,
  quadrant: Quadrant,
  offsetIndex: number,
  color: PostItColor = 'yellow',
): PostIt {
  // Base offsets per quadrant (well within the quadrant so center detection works)
  const bases: Record<string, { x: number; y: number }> = {
    // Power-Interest (Step 2)
    'high-power-high-interest': { x: 80, y: -300 },
    'high-power-low-interest': { x: -350, y: -300 },
    'low-power-high-interest': { x: 80, y: 80 },
    'low-power-low-interest': { x: -350, y: 80 },
    // Empathy Map (Step 4)
    thought: { x: -350, y: -300 },
    felt: { x: 80, y: -300 },
    said: { x: -350, y: 80 },
    experienced: { x: 80, y: 80 },
  };

  const base = bases[quadrant] ?? { x: 0, y: 0 };
  // Stagger within the quadrant
  const col = offsetIndex % 2;
  const row = Math.floor(offsetIndex / 2);

  return {
    id: crypto.randomUUID(),
    text,
    position: {
      x: base.x + col * (POST_IT_WIDTH + 20),
      y: base.y + row * (POST_IT_HEIGHT + 20),
    },
    width: POST_IT_WIDTH,
    height: POST_IT_HEIGHT,
    color,
    type: 'postIt',
    quadrant,
  };
}

/**
 * Position a post-it in the correct grid cell for Step 6 (Journey Mapping).
 * Uses getCellBounds() from grid-layout.ts for exact positioning.
 */
function journeyPostIt(
  text: string,
  rowId: string,
  colId: string,
  color: PostItColor = 'yellow',
): PostIt {
  const gridConfig = STEP_CANVAS_CONFIGS['journey-mapping']?.gridConfig as GridConfig;
  const rowIndex = gridConfig.rows.findIndex((r) => r.id === rowId);
  const colIndex = gridConfig.columns.findIndex((c) => c.id === colId);

  const bounds = getCellBounds({ row: rowIndex, col: colIndex }, gridConfig);

  return {
    id: crypto.randomUUID(),
    text,
    position: {
      x: bounds.x + gridConfig.cellPadding,
      y: bounds.y + gridConfig.cellPadding,
    },
    width: POST_IT_WIDTH,
    height: POST_IT_HEIGHT - 20, // Slightly shorter to fit cells
    color,
    type: 'postIt',
    cellAssignment: { row: rowId, col: colId },
  };
}

// ---------------------------------------------------------------------------
// Fixture data
// ---------------------------------------------------------------------------

export const PAWPAL_FIXTURES: Record<string, StepFixture> = {
  // =========================================================================
  // Step 1: Challenge
  // =========================================================================
  challenge: {
    artifact: {
      problemStatement:
        'Busy urban pet owners struggle to manage their pets\' health, nutrition, and daily care needs while juggling demanding work schedules, leading to missed vet appointments, inconsistent feeding routines, and guilt about inadequate pet care.',
      targetUser: 'Busy urban professionals who own one or more pets and work full-time',
      desiredOutcome:
        'Pet owners can confidently manage all aspects of pet care without it feeling like a second job, reducing missed appointments by 80% and care-related stress by 50%',
      hmwStatement:
        'How might we simplify daily pet care management for busy urban professionals so that they can provide consistent, high-quality care without sacrificing their work-life balance?',
      altitude: 'balanced',
    },
    summary:
      '- Core problem: busy urban pet owners can\'t keep up with pet care demands alongside work\n- Target user: full-time urban professionals with pets\n- HMW: simplify daily pet care management so owners provide consistent care without sacrificing work-life balance\n- Scope: balanced altitude covering health, nutrition, and daily routines',
  },

  // =========================================================================
  // Step 2: Stakeholder Mapping
  // =========================================================================
  'stakeholder-mapping': {
    artifact: {
      stakeholders: [
        { name: 'Pet Owners (Primary Users)', category: 'core', power: 'high', interest: 'high', notes: 'Daily active users who manage pets\' needs through the app' },
        { name: 'Veterinarians', category: 'direct', power: 'high', interest: 'high', notes: 'Provide health data, appointment scheduling, and medical advice' },
        { name: 'Pet Food Brands', category: 'indirect', power: 'medium', interest: 'high', notes: 'Potential partners for nutrition recommendations and subscriptions' },
        { name: 'Pet Sitters / Dog Walkers', category: 'direct', power: 'low', interest: 'high', notes: 'Secondary users who receive care instructions and updates' },
        { name: 'Pet Insurance Companies', category: 'indirect', power: 'high', interest: 'low', notes: 'Health data could streamline claims processing' },
        { name: 'Local Pet Stores', category: 'indirect', power: 'low', interest: 'low', notes: 'Potential channel for supplies and recommendations' },
      ],
    },
    summary:
      '- 6 stakeholders mapped across power-interest grid\n- Core: Pet owners as primary users with highest power and interest\n- Key partners: Vets (high power/interest), pet food brands (medium power/high interest)\n- Secondary: Pet sitters, insurance companies, local pet stores',
    canvas: [
      quadrantPostIt('Pet Owners\n(Primary Users)', 'high-power-high-interest', 0, 'yellow'),
      quadrantPostIt('Veterinarians', 'high-power-high-interest', 1, 'blue'),
      quadrantPostIt('Pet Insurance\nCompanies', 'high-power-low-interest', 0, 'pink'),
      quadrantPostIt('Pet Food Brands', 'low-power-high-interest', 0, 'green'),
      quadrantPostIt('Pet Sitters /\nDog Walkers', 'low-power-high-interest', 1, 'orange'),
      quadrantPostIt('Local Pet Stores', 'low-power-low-interest', 0, 'yellow'),
    ],
  },

  // =========================================================================
  // Step 3: User Research
  // =========================================================================
  'user-research': {
    artifact: {
      interviewQuestions: [
        'Walk me through a typical weekday morning with your pet — from waking up to leaving for work.',
        'When was the last time you forgot or missed something important for your pet? What happened?',
        'How do you currently keep track of vet appointments, medications, and feeding schedules?',
        'What\'s the most stressful part of being a pet owner with a busy schedule?',
        'If you could wave a magic wand and fix one thing about pet care, what would it be?',
        'How do you handle pet care when you\'re traveling or working late?',
      ],
      insights: [
        { finding: 'Most pet owners use 3-5 different tools (calendar, notes, vet portal, food delivery) to manage pet care — none talk to each other', source: 'Multiple interviewees', quote: 'I have reminders in my calendar, notes in my phone, and the vet has their own portal. Nothing is in one place.' },
        { finding: 'Guilt is the dominant emotion when pet care tasks are missed — stronger than inconvenience', source: 'Working professionals with pets', quote: 'I feel terrible when I realize Biscuit\'s flea medicine was due three days ago.' },
        { finding: 'Morning routines are the most fragile — a single disruption cascades through the whole day\'s pet care', source: 'Behavioral pattern across interviews' },
        { finding: 'Pet owners want proactive reminders, not reactive ones — they want to be told before something is overdue', source: 'Feature wishlist analysis', quote: 'Don\'t tell me I missed it. Tell me it\'s coming up.' },
        { finding: 'Multi-pet households have exponentially more complexity — different feeding schedules, medications, and vet visits per pet', source: 'Multi-pet owner interviews' },
      ],
    },
    summary:
      '- 6 interview questions covering daily routines, pain points, current tools, and wishlist\n- Key insight: pet owners use 3-5 disconnected tools for pet care management\n- Guilt is the dominant emotion when care tasks are missed\n- Morning routines are fragile — disruptions cascade through the day\n- Multi-pet households face exponentially more complexity',
  },

  // =========================================================================
  // Step 4: Sense Making (Empathy Map)
  // =========================================================================
  'sense-making': {
    artifact: {
      themes: [
        { name: 'Tool Fragmentation', evidence: ['3-5 disconnected tools per owner', 'No single source of truth for pet health', 'Manual data entry across platforms'] },
        { name: 'Guilt-Driven Care', evidence: ['Guilt outweighs inconvenience as primary emotion', 'Overcompensation after missed tasks', 'Emotional bond makes failures feel personal'] },
        { name: 'Routine Fragility', evidence: ['Morning disruptions cascade all day', 'Multi-pet households multiply complexity', 'Work schedule changes break established patterns'] },
      ],
      pains: [
        'Juggling 3-5 disconnected tools for pet care management',
        'Guilt when pet care tasks are missed due to busy schedules',
        'Morning routine disruptions that cascade through the entire day',
        'No proactive alerts — only discovering missed tasks after the fact',
        'Multi-pet complexity with different schedules per animal',
      ],
      gains: [
        'One unified place for all pet care information and tasks',
        'Proactive reminders before tasks become overdue',
        'Peace of mind knowing nothing important will be forgotten',
        'Effortless coordination with vets, sitters, and family members',
        'More quality time with pets instead of managing logistics',
      ],
    },
    summary:
      '- 3 themes: Tool Fragmentation, Guilt-Driven Care, Routine Fragility\n- Top pain: juggling 3-5 disconnected tools with no single source of truth\n- Top gain: one unified place with proactive reminders for all pet care\n- Emotional insight: guilt is stronger than inconvenience when care is missed',
    canvas: [
      // Said quadrant (bottom-left: X<0, Y>=0)
      quadrantPostIt('"Nothing is in\none place"', 'said', 0, 'yellow'),
      quadrantPostIt('"Tell me before\nit\'s overdue"', 'said', 1, 'yellow'),
      quadrantPostIt('"I feel terrible\nwhen I forget"', 'said', 2, 'yellow'),
      // Thought quadrant (top-left: X<0, Y<0)
      quadrantPostIt('Am I a good\npet parent?', 'thought', 0, 'blue'),
      quadrantPostIt('There must be\na better way', 'thought', 1, 'blue'),
      // Felt quadrant (top-right: X>=0, Y<0)
      quadrantPostIt('Guilt when\ntasks are missed', 'felt', 0, 'pink'),
      quadrantPostIt('Overwhelmed by\nmulti-pet logistics', 'felt', 1, 'pink'),
      // Experienced quadrant (bottom-right: X>=0, Y>=0)
      quadrantPostIt('Missed flea\nmedicine by 3 days', 'experienced', 0, 'green'),
      quadrantPostIt('Morning routine\ncascade failures', 'experienced', 1, 'green'),
      quadrantPostIt('Vet portal, calendar,\nnotes app juggle', 'experienced', 2, 'green'),
    ],
  },

  // =========================================================================
  // Step 5: Persona
  // =========================================================================
  persona: {
    artifact: {
      name: 'Sarah Chen',
      age: 32,
      role: 'Product Manager at a mid-size tech company',
      location: 'Austin, TX',
      bio: 'Sarah is a product manager who works 50+ hours a week at a growing tech company. She shares her apartment with Biscuit (a 3-year-old golden retriever) and Mochi (a 2-year-old tabby cat). She adopted both during the pandemic when working from home felt manageable, but now that she\'s back in the office 4 days a week, keeping up with their different care needs has become her biggest source of daily stress.',
      quote: 'I love my pets more than anything, but some days I feel like I need a project manager just for their care.',
      goals: [
        'Never miss a vet appointment or medication dose for either pet',
        'Establish reliable morning and evening pet care routines that survive schedule changes',
        'Spend quality time with Biscuit and Mochi instead of managing logistics',
      ],
      pains: [
        'Uses 4 different apps to track pet care — nothing is connected',
        'Feels intense guilt when she discovers she missed Biscuit\'s heartworm pill by a week',
        'Morning routine falls apart when she has an early meeting, affecting both pets\' care',
        'Can\'t easily share care instructions with her dog walker or cat sitter',
      ],
      gains: [
        'Single dashboard showing both pets\' needs at a glance',
        'Proactive nudges that prevent missed tasks before they happen',
        'Easy sharing with pet sitters so care continues when she\'s busy',
        'Feeling confident she\'s giving Biscuit and Mochi the best care possible',
      ],
      motivations: [
        'Deep emotional bond with both pets — they\'re family',
        'Desire to prove she can handle career ambitions and pet parenthood simultaneously',
        'Fear of health consequences from inconsistent care',
      ],
      frustrations: [
        'Vet portals that don\'t sync with her calendar',
        'Food delivery subscriptions that don\'t account for changing needs',
        'Generic pet care advice that doesn\'t consider her specific schedule',
      ],
      dayInTheLife: 'Sarah\'s alarm goes off at 6:30 AM. She feeds Mochi first (prescription diet, measured portions), then takes Biscuit for a quick walk before showering. On days with early meetings, the walk gets cut short and Biscuit\'s breakfast is rushed. She checks her phone for vet reminders but they\'re buried in calendar noise. By evening, she\'s too tired to remember if she gave Mochi his evening supplement. She falls asleep wondering if she\'s doing enough.',
      behaviors: [
        'Heavy smartphone user — checks phone 80+ times per day',
        'Uses task management apps for work but not personal life',
        'Prefers push notifications over checking apps manually',
        'Researches pet health topics late at night when worried',
      ],
    },
    summary:
      '- Sarah Chen, 32, Product Manager in Austin, TX\n- Two pets: Biscuit (golden retriever) and Mochi (tabby cat)\n- Core pain: juggling 4 disconnected apps, guilt from missed care tasks\n- Key insight: morning routine fragility cascades through entire day\'s pet care',
  },

  // =========================================================================
  // Step 6: Journey Mapping
  // =========================================================================
  'journey-mapping': {
    artifact: {
      personaName: 'Sarah Chen',
      stages: [
        {
          name: 'Awareness',
          action: 'Sarah realizes she\'s struggling to manage Biscuit and Mochi\'s care needs alongside her demanding job',
          goals: 'Acknowledge the problem and start looking for solutions',
          barriers: 'Normalizes the struggle — "every pet owner deals with this"',
          touchpoints: 'Social media pet communities, conversations with other pet owners at dog park',
          emotions: 'neutral' as const,
          momentsOfTruth: 'Seeing another pet owner mention an app that helped them — sparks curiosity',
          opportunities: 'Content marketing showing that pet care chaos is solvable, not inevitable',
        },
        {
          name: 'Consideration',
          action: 'Researches pet care apps, reads reviews, compares features',
          goals: 'Find an app that consolidates all pet care tasks in one place',
          barriers: 'Most apps focus on single features (just vet records OR just feeding). Hard to tell which actually works for multi-pet households.',
          touchpoints: 'App Store, review sites, pet forums, recommendations from friends',
          emotions: 'neutral' as const,
          opportunities: 'Clear messaging about multi-pet support and unified dashboard',
        },
        {
          name: 'Decision',
          action: 'Downloads PawPal and begins onboarding — adds both pets\' profiles',
          goals: 'Get set up quickly without entering a ton of data upfront',
          barriers: 'Long onboarding forms. Needs to find Mochi\'s prescription diet details and Biscuit\'s vaccination records.',
          touchpoints: 'App onboarding flow, pet profile setup, data import (if available)',
          emotions: 'positive' as const,
          momentsOfTruth: 'First 5 minutes of onboarding — does it feel simple or overwhelming?',
          opportunities: 'Progressive onboarding that gets value fast, imports data from vet portals later',
        },
        {
          name: 'First Use',
          action: 'Sets up morning and evening routines, adds upcoming vet appointments',
          goals: 'Experience the "aha moment" of having everything in one place',
          barriers: 'Manually entering existing schedules is tedious. Unclear how to set different routines per pet.',
          touchpoints: 'Routine builder, calendar integration, reminder settings',
          emotions: 'positive' as const,
          opportunities: 'Smart defaults and templates for common pet care routines',
        },
        {
          name: 'Daily Use',
          action: 'Relies on PawPal for morning routine, checks off tasks, gets proactive reminders',
          goals: 'Never miss a care task — feel confident both pets are cared for',
          barriers: 'Notification fatigue if too many alerts. App becomes "just another thing to check" if not truly integrated into routine.',
          touchpoints: 'Push notifications, daily dashboard, quick-check widgets',
          emotions: 'negative' as const,
          isDip: true,
          momentsOfTruth: 'The morning a proactive reminder actually prevents a missed task — or the morning notification fatigue makes her silence the app',
          opportunities: 'Smart notification timing based on routine patterns, widget for home screen glance',
        },
      ],
      dipSummary: 'The critical dip occurs during daily use when notification fatigue threatens to make PawPal "just another app to check." If push notifications feel spammy or poorly timed, Sarah silences them — defeating the entire purpose. The moment of truth is whether proactive reminders feel helpful or annoying.',
      dipRationale: 'Daily Use is the dip because it\'s where the app must prove sustained value. Initial excitement fades and the tool must integrate seamlessly into Sarah\'s hectic mornings without adding friction.',
    },
    summary:
      '- 5-stage journey: Awareness → Consideration → Decision → First Use → Daily Use\n- Critical dip at Daily Use: notification fatigue threatens to make the app "just another thing to check"\n- Key moment of truth: proactive reminders must feel helpful, not spammy\n- Biggest opportunity: smart notification timing and home screen widgets for at-a-glance care status',
    canvas: [
      // Row: actions
      journeyPostIt('Realizes she\'s struggling\nwith pet care', 'actions', 'awareness', 'yellow'),
      journeyPostIt('Researches pet\ncare apps', 'actions', 'consideration', 'yellow'),
      journeyPostIt('Downloads PawPal,\nadds pet profiles', 'actions', 'decision', 'yellow'),
      journeyPostIt('Sets up routines\nand appointments', 'actions', 'purchase', 'yellow'),
      journeyPostIt('Daily check-ins\nand task completion', 'actions', 'onboarding', 'yellow'),
      // Row: goals
      journeyPostIt('Acknowledge the\nproblem exists', 'goals', 'awareness', 'blue'),
      journeyPostIt('Find a unified\npet care solution', 'goals', 'consideration', 'blue'),
      journeyPostIt('Get set up\nquickly', 'goals', 'decision', 'blue'),
      journeyPostIt('Experience the\naha moment', 'goals', 'purchase', 'blue'),
      journeyPostIt('Never miss a\ncare task', 'goals', 'onboarding', 'blue'),
      // Row: barriers
      journeyPostIt('Normalizes the\nstruggle', 'barriers', 'awareness', 'pink'),
      journeyPostIt('Apps focus on\nsingle features', 'barriers', 'consideration', 'pink'),
      journeyPostIt('Long onboarding\nforms', 'barriers', 'decision', 'pink'),
      journeyPostIt('Manual entry\nis tedious', 'barriers', 'purchase', 'pink'),
      journeyPostIt('Notification\nfatigue', 'barriers', 'onboarding', 'pink'),
      // Row: touchpoints
      journeyPostIt('Pet communities,\ndog park chats', 'touchpoints', 'awareness', 'green'),
      journeyPostIt('App Store,\nreviews, forums', 'touchpoints', 'consideration', 'green'),
      journeyPostIt('Onboarding flow,\nprofile setup', 'touchpoints', 'decision', 'green'),
      journeyPostIt('Routine builder,\ncalendar sync', 'touchpoints', 'purchase', 'green'),
      journeyPostIt('Push notifications,\ndashboard, widget', 'touchpoints', 'onboarding', 'green'),
      // Row: emotions
      journeyPostIt('Neutral\n😐', 'emotions', 'awareness', 'orange'),
      journeyPostIt('Neutral\n😐', 'emotions', 'consideration', 'orange'),
      journeyPostIt('Positive\n😊', 'emotions', 'decision', 'orange'),
      journeyPostIt('Positive\n😊', 'emotions', 'purchase', 'orange'),
      journeyPostIt('Negative\n😟 (DIP)', 'emotions', 'onboarding', 'pink'),
    ],
  },

  // =========================================================================
  // Step 7: Reframe
  // =========================================================================
  reframe: {
    artifact: {
      originalHmw: 'How might we simplify daily pet care management for busy urban professionals so that they can provide consistent, high-quality care without sacrificing their work-life balance?',
      hmwStatements: [
        {
          givenThat: 'busy multi-pet owners like Sarah Chen use 4+ disconnected tools and experience guilt-driven anxiety when care tasks slip through the cracks',
          persona: 'Sarah Chen, a time-strapped product manager with two pets',
          immediateGoal: 'receive intelligently-timed, context-aware care nudges that fit into her existing morning routine',
          deeperGoal: 'feel confident she\'s giving Biscuit and Mochi the best care possible without it consuming her mental bandwidth',
          fullStatement: 'Given that busy multi-pet owners use 4+ disconnected tools and feel guilt when tasks slip, how might we help Sarah Chen receive intelligently-timed care nudges that fit her morning routine, so she can feel confident Biscuit and Mochi are well cared for without consuming her mental bandwidth?',
        },
      ],
      selectedForIdeation: [0],
      insightsApplied: [
        'Tool fragmentation: 3-5 disconnected tools create cognitive overhead (Step 3)',
        'Guilt is the dominant emotion, stronger than inconvenience (Step 4)',
        'Morning routine fragility: one disruption cascades all day (Step 6)',
        'Notification fatigue is the critical dip — reminders must feel helpful not spammy (Step 6)',
      ],
      evolution: 'The original HMW was broad and solution-agnostic. After research, we narrowed from "simplify daily pet care" to "intelligently-timed care nudges" because the journey map revealed that notification timing is the make-or-break moment. The reframe also shifts from "management" (reactive) to "nudges" (proactive), directly addressing the research finding that users want to be told before something is overdue.',
    },
    summary:
      '- Reframed HMW from broad "simplify pet care" to specific "intelligently-timed care nudges"\n- Key insight applied: notification fatigue is the critical dip from journey mapping\n- Shift from reactive management to proactive nudges based on user research\n- Persona-specific: Sarah Chen with Biscuit and Mochi',
  },

  // =========================================================================
  // Step 8: Ideation
  // =========================================================================
  ideation: {
    artifact: {
      reframedHmw: 'Given that busy multi-pet owners use 4+ disconnected tools and feel guilt when tasks slip, how might we help Sarah Chen receive intelligently-timed care nudges that fit her morning routine, so she can feel confident Biscuit and Mochi are well cared for without consuming her mental bandwidth?',
      clusters: [
        {
          theme: 'Smart Routine Engine',
          ideas: [
            { title: 'Morning Routine Autopilot', description: 'AI-powered morning routine that sequences pet care tasks based on Sarah\'s calendar, adapting when she has early meetings', source: 'mind-mapping' as const },
            { title: 'Adaptive Notification Timing', description: 'ML-based notification system that learns when Sarah is most responsive and schedules nudges accordingly', source: 'mind-mapping' as const },
            { title: 'Routine Recovery Mode', description: 'When the morning routine is disrupted, automatically reschedule remaining tasks to the next available window', source: 'mind-mapping' as const, isWildCard: true },
          ],
        },
        {
          theme: 'Unified Pet Dashboard',
          ideas: [
            { title: 'Glanceable Widget', description: 'Home screen widget showing today\'s care tasks for all pets with one-tap completion — no app opening needed', source: 'mind-mapping' as const },
            { title: 'Vet Data Bridge', description: 'Automatic sync with vet portals to pull vaccination records, prescriptions, and appointment schedules', source: 'mind-mapping' as const },
            { title: 'Pet Care Score', description: 'Daily care confidence score showing percentage of tasks completed, streaks, and upcoming items', source: 'mind-mapping' as const, isWildCard: true },
          ],
        },
        {
          theme: 'Care Delegation',
          ideas: [
            { title: 'Sitter Share Link', description: 'One-tap shareable care guide for pet sitters with real-time task updates and feeding instructions', source: 'mind-mapping' as const },
            { title: 'Family Care Calendar', description: 'Shared calendar where household members claim pet care tasks to distribute responsibility', source: 'mind-mapping' as const },
          ],
        },
      ],
      brainWrittenIdeas: [
        { originalTitle: 'Morning Routine Autopilot', evolutionDescription: 'Round 1: Added voice assistant integration for hands-free morning routines. Round 2: Combined with calendar sync so it pre-adjusts the night before. Round 3: Added pet mood tracking via smart collar data.', finalVersion: 'Voice-activated morning care autopilot that pre-adjusts the night before based on tomorrow\'s calendar and live pet activity data', source: 'brain-writing' as const },
        { originalTitle: 'Glanceable Widget', evolutionDescription: 'Round 1: Added color-coding by urgency. Round 2: Combined with Biscuit/Mochi photos for emotional engagement. Round 3: Added predictive "tomorrow\'s needs" section.', finalVersion: 'Emotionally engaging home screen widget with pet photos, color-coded urgency, today\'s tasks, and a tomorrow preview', source: 'brain-writing' as const },
      ],
      crazyEightsIdeas: [
        { title: 'Pet Care Pomodoro', description: 'Break pet care into 5-minute focused sessions throughout the day', source: 'crazy-eights' as const },
        { title: 'Guilt-Free Guarantee', description: 'Daily "everything is handled" push notification at 9 PM', source: 'crazy-eights' as const },
        { title: 'Neighborhood Pet Network', description: 'Connect with nearby pet owners for emergency care swaps', source: 'crazy-eights' as const },
        { title: 'Smart Bowl Integration', description: 'Track feeding automatically via smart pet bowls', source: 'crazy-eights' as const },
        { title: 'Vet Video Triage', description: 'Quick video check-in with vet for "is this urgent?" moments', source: 'crazy-eights' as const },
        { title: 'Pet Personality Profiles', description: 'AI-generated pet personality insights based on care patterns', source: 'crazy-eights' as const },
        { title: 'Care Streaks & Badges', description: 'Gamification: maintain care streaks with shareable badges', source: 'crazy-eights' as const },
        { title: 'Auto-Reorder Supplies', description: 'Predict when food/medicine runs low and auto-reorder', source: 'crazy-eights' as const },
      ],
      selectedIdeaTitles: [
        'Morning Routine Autopilot',
        'Glanceable Widget',
        'Sitter Share Link',
      ],
    },
    summary:
      '- 3 idea clusters: Smart Routine Engine, Unified Pet Dashboard, Care Delegation\n- Brain writing evolved top ideas with voice integration and emotional engagement\n- 8 Crazy 8s rapid-fire ideas including gamification and smart device integration\n- 3 selected for concept development: Morning Routine Autopilot, Glanceable Widget, Sitter Share Link',
  },

  // =========================================================================
  // Step 9: Concept Development
  // =========================================================================
  concept: {
    artifact: {
      concepts: [
        {
          ideaSource: 'Morning Routine Autopilot',
          name: 'PawPal Autopilot',
          elevatorPitch: 'PawPal Autopilot is an AI-powered morning routine engine that sequences your pet care tasks around your calendar, adapts when schedules change, and ensures nothing falls through the cracks. It turns chaotic mornings into confident ones.',
          usp: 'Unlike generic reminder apps, Autopilot understands multi-pet care sequences and proactively reschedules when your day changes — before you even realize there\'s a conflict.',
          swot: {
            strengths: ['Directly addresses Sarah\'s #1 pain: morning routine fragility', 'Proactive rather than reactive — prevents guilt before it happens', 'Multi-pet aware: handles different schedules for Biscuit and Mochi simultaneously'],
            weaknesses: ['Requires calendar integration permissions that some users resist', 'AI scheduling accuracy may frustrate early adopters if imperfect', 'Higher development complexity than a simple reminder system'],
            opportunities: ['Pet care app market growing 20% annually with no dominant "smart routine" player', 'Smart home device ecosystem enables richer context signals', 'Corporate pet benefit programs could be a B2B channel'],
            threats: ['Apple/Google could add pet care features to their native reminder apps', 'User trust in AI scheduling is still developing — one bad experience erodes confidence', 'Pet care routines are deeply personal — automated suggestions may feel presumptuous'],
          },
          feasibility: {
            technical: 4,
            technicalRationale: 'Calendar API integration is well-established. ML-based timing optimization requires training data but can start with rule-based heuristics.',
            business: 4,
            businessRationale: 'Clear willingness to pay among pet owners ($50B US pet industry). Subscription model aligned with ongoing care needs.',
            userDesirability: 5,
            userDesirabilityRationale: 'Directly solves Sarah\'s top 3 pains: tool fragmentation, morning routine fragility, and guilt from missed tasks.',
          },
          billboardHero: {
            headline: 'Your Pets Are Cared For. Before You Even Ask.',
            subheadline: 'PawPal Autopilot adapts your pet care routine to your calendar — so Biscuit and Mochi always get what they need, even on your busiest days.',
            cta: 'Start Your Free Autopilot Trial',
          },
        },
        {
          ideaSource: 'Glanceable Widget',
          name: 'PawPal At-a-Glance',
          elevatorPitch: 'PawPal At-a-Glance puts your pets\' care status right on your home screen. One glance shows what\'s done, what\'s next, and what needs attention — no app opening required. It\'s the care dashboard Sarah wished she had.',
          usp: 'The only pet care widget that shows multi-pet status with emotional pet photos, color-coded urgency, and tomorrow\'s preview — turning your lock screen into a care confidence check.',
          swot: {
            strengths: ['Zero-friction: visible without opening app reduces the "another app" problem', 'Emotional engagement through pet photos increases daily interaction', 'Simple concept that\'s easy to understand and adopt immediately'],
            weaknesses: ['Widget real estate is limited on both iOS and Android', 'Dependent on OS widget frameworks that change with each update', 'May not be sufficient as standalone value prop — needs core app behind it'],
            opportunities: ['Lock screen widgets (iOS 16+, Android 14+) are underutilized by pet apps', 'Can serve as the entry point that drives users to deeper features', 'Shareable widget screenshots could drive organic social media growth'],
            threats: ['OS widget API changes could break functionality', 'Users with many widgets may not have room', 'Competitors could replicate basic widget quickly'],
          },
          feasibility: {
            technical: 5,
            technicalRationale: 'Widget frameworks are mature on both platforms. Real-time data sync is the only moderate complexity.',
            business: 3,
            businessRationale: 'Widget alone doesn\'t drive revenue — must convert users to full app features. Good for acquisition, weak for monetization.',
            userDesirability: 4,
            userDesirabilityRationale: 'Addresses tool fragmentation pain by putting status front and center, but doesn\'t solve the deeper routine management need.',
          },
          billboardHero: {
            headline: 'Everything About Your Pet. One Glance Away.',
            subheadline: 'PawPal At-a-Glance shows Biscuit and Mochi\'s care status on your home screen — so you always know what\'s done and what\'s next.',
            cta: 'Add PawPal To Your Home Screen',
          },
        },
      ],
    },
    summary:
      '- 2 concepts developed: PawPal Autopilot (AI morning routine) and PawPal At-a-Glance (home screen widget)\n- Autopilot scores highest: Technical 4, Business 4, Desirability 5\n- At-a-Glance is technically simple (5) but weaker on business (3)\n- Billboard Hero tests: "Your Pets Are Cared For. Before You Even Ask." (Autopilot)',
  },

  // =========================================================================
  // Step 10: Validate
  // =========================================================================
  validate: {
    artifact: {
      narrativeIntro: 'What started as a vague frustration — "pet care is hard for busy people" — has evolved into a focused, research-backed concept. Through 10 design thinking steps, we went from a broad problem space to a specific solution: PawPal Autopilot, an AI-powered morning routine engine that proactively adapts pet care schedules around the owner\'s calendar. Along the way, we discovered that the real problem isn\'t forgetfulness — it\'s tool fragmentation and routine fragility. Sarah Chen doesn\'t need another reminder app; she needs an intelligent system that understands her multi-pet household and prevents care gaps before they create guilt.',
      stepSummaries: [
        { stepNumber: 1, stepName: 'Challenge', keyOutputs: ['HMW: simplify daily pet care for busy urban professionals', 'Target: full-time urban professionals with pets', 'Balanced altitude covering health, nutrition, and daily routines'] },
        { stepNumber: 2, stepName: 'Stakeholder Mapping', keyOutputs: ['6 stakeholders across power-interest grid', 'Key partners: vets and pet food brands', 'Secondary users: pet sitters and dog walkers'] },
        { stepNumber: 3, stepName: 'User Research', keyOutputs: ['3-5 disconnected tools per owner is the norm', 'Guilt stronger than inconvenience as primary emotion', 'Morning routines are the most fragile touchpoint'] },
        { stepNumber: 4, stepName: 'Sense Making', keyOutputs: ['3 themes: Tool Fragmentation, Guilt-Driven Care, Routine Fragility', 'Top gain: single unified place with proactive reminders', 'Empathy map reveals deep emotional component'] },
        { stepNumber: 5, stepName: 'Persona', keyOutputs: ['Sarah Chen, 32, PM in Austin with Biscuit and Mochi', 'Uses 4 disconnected apps for pet care', 'Morning routine disruptions cascade through entire day'] },
        { stepNumber: 6, stepName: 'Journey Mapping', keyOutputs: ['5-stage journey from awareness to daily use', 'Critical dip: notification fatigue during daily use', 'Opportunity: smart notification timing and home screen widgets'] },
        { stepNumber: 7, stepName: 'Reframe', keyOutputs: ['Shifted from "simplify management" to "intelligently-timed care nudges"', 'Incorporated notification fatigue as key constraint', 'Persona-specific HMW for Sarah Chen'] },
        { stepNumber: 8, stepName: 'Ideation', keyOutputs: ['3 idea clusters with 8+ ideas each', '3 selected: Autopilot, Glanceable Widget, Sitter Share Link', 'Brain writing evolved top ideas with voice and emotional engagement'] },
        { stepNumber: 9, stepName: 'Concept Development', keyOutputs: ['PawPal Autopilot: AI morning routine engine (T:4, B:4, D:5)', 'PawPal At-a-Glance: home screen widget (T:5, B:3, D:4)', 'Billboard: "Your Pets Are Cared For. Before You Even Ask."'] },
        { stepNumber: 10, stepName: 'Validate', keyOutputs: ['Confidence: 7/10 (moderate — synthetic research only)', 'Lead concept: PawPal Autopilot with widget as companion feature', 'Next: real user interviews and prototype testing'] },
      ],
      confidenceAssessment: {
        score: 7,
        rationale: 'The concept is well-grounded in logical research synthesis and the persona feels authentic, but all insights come from synthetic interviews — not real users. The journey map dip (notification fatigue) is a genuine risk that the concept acknowledges but hasn\'t tested. Feasibility scores are reasonable but untested with actual technical prototyping. Confidence is moderate: the direction is sound, but real validation is needed.',
        researchQuality: 'thin' as const,
      },
      recommendedNextSteps: [
        'Conduct 5-8 real interviews with multi-pet owners who work 40+ hours/week to validate synthetic research findings',
        'Build a clickable Autopilot prototype and run 3 usability tests focused on the morning routine flow',
        'A/B test notification timing strategies with a small beta group to find the sweet spot before notification fatigue',
        'Partner with one vet clinic to test the Vet Data Bridge integration feasibility',
        'Create a landing page for PawPal Autopilot and measure signup intent with a waitlist campaign',
      ],
    },
    summary:
      '- Journey from vague "pet care is hard" to validated PawPal Autopilot concept\n- Confidence: 7/10 (synthetic research only — needs real user validation)\n- Lead concept: AI morning routine engine with widget companion\n- Top next step: conduct real interviews with multi-pet working professionals',
  },
};
