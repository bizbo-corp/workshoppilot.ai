import type { StrategicIntent, JourneyStageColumn } from './types';
import { normalizeIntent } from './types';

// ---------------------------------------------------------------------------
// Multi-intent keyword scoring
// ---------------------------------------------------------------------------

const INTENT_KEYWORDS: Record<string, string[]> = {
  'marketing-site': [
    'sell', 'sales', 'marketing', 'revenue', 'conversion', 'launch', 'promote',
    'awareness', 'brand', 'customers', 'leads', 'acquisition', 'funnel', 'pitch',
    'showcase', 'demo', 'pricing', 'landing page', 'brochure', 'campaign',
    'advertis', 'growth', 'market', 'audience', 'outreach', 'subscriber',
    'ecommerce', 'e-commerce', 'store', 'shop', 'buy', 'purchase', 'checkout',
    'discover', 'attract', 'sign up', 'waitlist',
  ],
  'admin-portal': [
    'admin', 'manage', 'crud', 'users', 'roles', 'permissions', 'back office',
    'content management', 'moderate', 'approve', 'reject', 'configure', 'portal',
    'inventory', 'catalog', 'orders',
  ],
  'dashboard': [
    'dashboard', 'analytics', 'metrics', 'kpi', 'report', 'monitor', 'insight',
    'chart', 'visualization', 'performance', 'trend', 'data', 'statistics',
    'overview', 'real-time',
  ],
  'tool': [
    'calculator', 'converter', 'generator', 'validator', 'checker', 'scanner',
    'linter', 'formatter', 'utility', 'single-purpose', 'widget',
  ],
  'web-app': [
    'platform', 'workflow', 'automate', 'collaborate', 'integrate', 'track',
    'saas', 'application', 'product', 'feature', 'authentication', 'api',
    'backend', 'database',
  ],
};

const MIN_SCORE_THRESHOLD = 2;

// ---------------------------------------------------------------------------
// Verb pattern signals (~20% weight)
// ---------------------------------------------------------------------------

const VERB_PATTERNS: Record<string, string[]> = {
  'admin-portal': ['manage', 'administer', 'configure', 'moderate', 'approve', 'assign'],
  'dashboard': ['track', 'monitor', 'measure', 'analyze', 'report', 'visualize'],
  'marketing-site': ['sell', 'market', 'promote', 'launch', 'advertise', 'attract'],
  'tool': ['calculate', 'convert', 'generate', 'validate', 'check', 'scan', 'format'],
  'web-app': ['build', 'create', 'collaborate', 'automate', 'integrate', 'connect'],
};

// ---------------------------------------------------------------------------
// Persona role signals (~20% weight)
// ---------------------------------------------------------------------------

const PERSONA_ROLE_SIGNALS: Record<string, string[]> = {
  'admin-portal': ['admin', 'administrator', 'manager', 'moderator', 'operator', 'supervisor'],
  'dashboard': ['analyst', 'executive', 'director', 'cfo', 'ceo', 'head of', 'vp of'],
  'marketing-site': ['marketer', 'growth', 'sales', 'customer', 'buyer', 'shopper', 'visitor'],
  'tool': ['developer', 'engineer', 'designer', 'writer', 'creator'],
  'web-app': ['user', 'member', 'participant', 'subscriber', 'team'],
};

// ---------------------------------------------------------------------------
// Journey stage name signals (~20% weight)
// ---------------------------------------------------------------------------

const STAGE_NAME_SIGNALS: Record<string, string[]> = {
  'web-app': ['onboarding', 'active-use', 'active use', 'retention', 'engagement'],
  'marketing-site': ['awareness', 'consideration', 'decision', 'purchase', 'conversion'],
  'admin-portal': ['auth', 'manage', 'configure', 'audit'],
  'dashboard': ['load', 'overview', 'drill-down', 'drill down', 'kpi'],
  'tool': ['input', 'process', 'result', 'export'],
};

/**
 * Detect strategic intent using weighted multi-signal scoring.
 * - Keyword matching (~40%)
 * - Verb patterns (~20%)
 * - Persona role (~20%)
 * - Journey stage names (~20%)
 *
 * Accepts optional persona and journeyStageNames for enhanced accuracy.
 */
export function detectStrategicIntent(
  challengeContext: string,
  concepts: Array<Record<string, unknown>>,
  persona?: string | null,
  journeyStageNames?: string[]
): StrategicIntent {
  const allText = [
    challengeContext,
    ...concepts.map((c) => [
      c.name, c.conceptName, c.usp, c.elevatorPitch,
      ...(Array.isArray(c.features) ? c.features.map(String) : []),
    ].filter(Boolean).join(' ')),
  ].join(' ').toLowerCase();

  const scores: Record<string, number> = {};

  // Signal 1: Keyword matching (~40% weight, up to 2 points per keyword)
  for (const [intent, keywords] of Object.entries(INTENT_KEYWORDS)) {
    let kwScore = 0;
    for (const kw of keywords) {
      if (allText.includes(kw)) kwScore++;
    }
    scores[intent] = (scores[intent] || 0) + kwScore * 0.4;
  }

  // Signal 2: Verb patterns (~20% weight)
  for (const [intent, verbs] of Object.entries(VERB_PATTERNS)) {
    let verbScore = 0;
    for (const verb of verbs) {
      if (allText.includes(verb)) verbScore++;
    }
    scores[intent] = (scores[intent] || 0) + verbScore * 0.2;
  }

  // Signal 3: Persona role (~20% weight)
  if (persona) {
    const personaLower = persona.toLowerCase();
    for (const [intent, roles] of Object.entries(PERSONA_ROLE_SIGNALS)) {
      for (const role of roles) {
        if (personaLower.includes(role)) {
          scores[intent] = (scores[intent] || 0) + 1.0;
          break;
        }
      }
    }
  }

  // Signal 4: Journey stage name matching (~20% weight)
  if (journeyStageNames && journeyStageNames.length > 0) {
    const stageText = journeyStageNames.join(' ').toLowerCase();
    for (const [intent, stageKeywords] of Object.entries(STAGE_NAME_SIGNALS)) {
      let stageScore = 0;
      for (const sk of stageKeywords) {
        if (stageText.includes(sk)) stageScore++;
      }
      scores[intent] = (scores[intent] || 0) + stageScore * 0.2;
    }
  }

  let bestIntent: StrategicIntent = 'web-app';
  let bestScore = 0;

  for (const [intent, score] of Object.entries(scores)) {
    if (score > bestScore) {
      bestScore = score;
      bestIntent = intent as StrategicIntent;
    }
  }

  return bestScore >= MIN_SCORE_THRESHOLD ? bestIntent : 'web-app';
}

// ---------------------------------------------------------------------------
// Concept-driven section generator (replaces static BROCHURE_SECTIONS)
// ---------------------------------------------------------------------------

interface ConceptInput {
  name?: string;
  conceptName?: string;
  elevatorPitch?: string;
  usp?: string;
  swot?: {
    strengths?: string[];
    weaknesses?: string[];
    opportunities?: string[];
    threats?: string[];
  };
  swotStrengths?: string[];
  swotOpportunities?: string[];
  swotThreats?: string[];
  features?: unknown[];
}

interface GeneratedSection {
  featureName: string;
  featureDescription: string;
  uiPatternSuggestion: string;
  priority: 'must-have' | 'should-have' | 'nice-to-have';
  stageId: string;
  conceptIndex: number;
  conceptName: string;
  addressesPain: string;
}

/**
 * Generate concept-driven marketing site sections from workshop concept data.
 * Maps each concept's USP, elevator pitch, and SWOT data to funnel stages.
 */
export function generateConceptDrivenSections(
  concepts: ConceptInput[],
  personaPains?: string[]
): GeneratedSection[] {
  const sections: GeneratedSection[] = [];

  // Primary concept (index 0) dominates Hero + Final CTA
  const primary = concepts[0];
  const primaryName = primary?.name || primary?.conceptName || 'Product';

  // --- AWARENESS STAGE ---
  // Hero from primary concept elevator pitch
  if (primary?.elevatorPitch) {
    sections.push({
      featureName: `Hero: ${primaryName}`,
      featureDescription: `Bold headline from elevator pitch: "${primary.elevatorPitch.slice(0, 120)}"`,
      uiPatternSuggestion: 'Full-width hero with gradient background, headline from elevator pitch, subtext, and primary CTA button',
      priority: 'must-have',
      stageId: 'awareness',
      conceptIndex: 0,
      conceptName: primaryName,
      addressesPain: 'Unclear value proposition',
    });
  }

  // Problem statement from persona pains
  if (personaPains && personaPains.length > 0) {
    sections.push({
      featureName: 'Problem Statement',
      featureDescription: `Articulate pain points: ${personaPains.slice(0, 3).join('; ')}`,
      uiPatternSuggestion: 'Centered text block with empathetic copy addressing persona frustrations and supporting illustration',
      priority: 'should-have',
      stageId: 'awareness',
      conceptIndex: 0,
      conceptName: primaryName,
      addressesPain: personaPains[0] || 'Visitor drop-off',
    });
  }

  // --- CONSIDERATION STAGE ---
  // Each concept contributes sections
  for (let ci = 0; ci < concepts.length; ci++) {
    const concept = concepts[ci];
    const cName = concept.name || concept.conceptName || `Concept ${ci + 1}`;
    const strengths = concept.swot?.strengths || concept.swotStrengths || [];
    const opportunities = concept.swot?.opportunities || concept.swotOpportunities || [];

    // "How It Works" from USP
    if (concept.usp) {
      sections.push({
        featureName: `How ${cName} Works`,
        featureDescription: `3-step breakdown derived from USP: "${concept.usp.slice(0, 120)}"`,
        uiPatternSuggestion: 'Numbered 3-step process section with icons, step titles derived from USP clauses, and brief descriptions',
        priority: ci === 0 ? 'must-have' : 'should-have',
        stageId: 'consideration',
        conceptIndex: ci,
        conceptName: cName,
        addressesPain: 'Skepticism about how it works',
      });
    }

    // Benefit grid from SWOT strengths
    if (strengths.length > 0) {
      sections.push({
        featureName: `Why ${cName}`,
        featureDescription: `Benefit cards from strengths: ${strengths.slice(0, 4).join(', ')}`,
        uiPatternSuggestion: `${Math.min(strengths.length, 4)}-column card grid with icon, marketing-rewritten strength title, and benefit description`,
        priority: 'must-have',
        stageId: 'consideration',
        conceptIndex: ci,
        conceptName: cName,
        addressesPain: 'Comparison shopping',
      });
    }

    // Social proof themes from opportunities
    if (opportunities.length > 0) {
      sections.push({
        featureName: `${cName} Social Proof`,
        featureDescription: `Testimonial themes from opportunities: ${opportunities.slice(0, 3).join(', ')}`,
        uiPatternSuggestion: 'Carousel or grid of testimonial cards themed around opportunity areas, with avatar, quote, and attribution',
        priority: 'should-have',
        stageId: 'consideration',
        conceptIndex: ci,
        conceptName: cName,
        addressesPain: 'Lack of trust signals',
      });
    }
  }

  // --- DECISION STAGE ---
  // FAQ from SWOT threats (all concepts)
  const allThreats: string[] = [];
  for (const concept of concepts) {
    const threats = concept.swot?.threats || concept.swotThreats || [];
    allThreats.push(...threats);
  }
  if (allThreats.length > 0) {
    sections.push({
      featureName: 'FAQ & Objection Handling',
      featureDescription: `Address objections from SWOT threats: ${allThreats.slice(0, 5).join('; ')}`,
      uiPatternSuggestion: 'Accordion FAQ section where each threat is reframed as a question with a reassuring answer',
      priority: 'must-have',
      stageId: 'decision',
      conceptIndex: 0,
      conceptName: primaryName,
      addressesPain: 'Unaddressed concerns block conversion',
    });
  }

  // Pricing
  sections.push({
    featureName: 'Pricing',
    featureDescription: 'Clear pricing tiers or value proposition to overcome price objection',
    uiPatternSuggestion: 'Pricing table with tier comparison, feature checklist, and highlighted recommended plan',
    priority: 'must-have',
    stageId: 'decision',
    conceptIndex: 0,
    conceptName: primaryName,
    addressesPain: 'Price objection',
  });

  // --- PURCHASE STAGE ---
  // Final CTA reinforcing primary concept USP
  sections.push({
    featureName: `Final CTA: ${primaryName}`,
    featureDescription: `Strong closing CTA reinforcing USP${primary?.usp ? `: "${primary.usp.slice(0, 80)}"` : ''}`,
    uiPatternSuggestion: 'Full-width banner with headline reinforcing core USP, benefit summary, and prominent CTA button',
    priority: 'must-have',
    stageId: 'purchase',
    conceptIndex: 0,
    conceptName: primaryName,
    addressesPain: 'Visitor leaves without converting',
  });

  return sections;
}

// ---------------------------------------------------------------------------
// Default stages per intent type
// ---------------------------------------------------------------------------

/** Marketing funnel stages for marketing-site intent */
export const BROCHURE_STAGES: JourneyStageColumn[] = [
  {
    id: 'awareness',
    name: 'Awareness',
    description: 'Visitor discovers the product — first impression and hook',
    emotion: 'neutral',
    isDip: false,
    barriers: ['Short attention span', 'Unclear value'],
    opportunities: ['Strong headline', 'Visual hook'],
  },
  {
    id: 'consideration',
    name: 'Consideration',
    description: 'Visitor evaluates the offering — benefits, proof, differentiation',
    emotion: 'neutral',
    isDip: true,
    barriers: ['Skepticism', 'Comparison shopping'],
    opportunities: ['Social proof', 'Clear benefits'],
  },
  {
    id: 'decision',
    name: 'Decision',
    description: 'Visitor decides to act — pricing, risk reversal, urgency',
    emotion: 'negative',
    isDip: true,
    barriers: ['Price objection', 'Trust concerns'],
    opportunities: ['Transparent pricing', 'Guarantees'],
  },
  {
    id: 'purchase',
    name: 'Purchase / Sign-up',
    description: 'Visitor converts — minimal friction checkout or sign-up',
    emotion: 'positive',
    isDip: false,
    barriers: ['Complex forms', 'Hidden fees'],
    opportunities: ['Streamlined flow', 'Confirmation delight'],
  },
];

const ADMIN_PORTAL_STAGES: JourneyStageColumn[] = [
  { id: 'auth', name: 'Authentication', description: 'Admin logs in with role-based access', emotion: 'neutral', isDip: false, barriers: ['Forgotten credentials'], opportunities: ['SSO integration'] },
  { id: 'overview', name: 'Overview', description: 'Admin sees dashboard summary of key entities', emotion: 'positive', isDip: false, barriers: ['Information overload'], opportunities: ['Key metrics at a glance'] },
  { id: 'manage', name: 'Manage', description: 'Admin performs CRUD operations on resources', emotion: 'neutral', isDip: true, barriers: ['Complex data entry', 'Bulk operations'], opportunities: ['Inline editing', 'Batch actions'] },
  { id: 'configure', name: 'Configure', description: 'Admin configures settings and permissions', emotion: 'neutral', isDip: true, barriers: ['Unclear impact of settings'], opportunities: ['Live preview', 'Undo'] },
  { id: 'audit', name: 'Audit & Reports', description: 'Admin reviews activity logs and exports reports', emotion: 'positive', isDip: false, barriers: ['Finding specific events'], opportunities: ['Filterable logs', 'Export'] },
];

const DASHBOARD_STAGES: JourneyStageColumn[] = [
  { id: 'load', name: 'Data Load', description: 'Dashboard loads and fetches latest data', emotion: 'neutral', isDip: false, barriers: ['Slow load times'], opportunities: ['Progressive loading'] },
  { id: 'overview', name: 'KPI Overview', description: 'User sees high-level metrics and trends', emotion: 'positive', isDip: false, barriers: ['Metric overload'], opportunities: ['Highlighted anomalies'] },
  { id: 'drill-down', name: 'Drill-Down', description: 'User explores specific metrics in detail', emotion: 'neutral', isDip: true, barriers: ['Lost context', 'Complex filters'], opportunities: ['Breadcrumb navigation', 'Linked charts'] },
  { id: 'action', name: 'Take Action', description: 'User acts on insights — share, export, or trigger workflow', emotion: 'positive', isDip: false, barriers: ['Unclear next steps'], opportunities: ['Actionable recommendations'] },
];

const TOOL_STAGES: JourneyStageColumn[] = [
  { id: 'input', name: 'Input', description: 'User provides input data or configuration', emotion: 'neutral', isDip: false, barriers: ['Unclear format'], opportunities: ['Smart defaults', 'Examples'] },
  { id: 'process', name: 'Processing', description: 'Tool processes input and shows progress', emotion: 'neutral', isDip: true, barriers: ['Long wait times', 'Uncertainty'], opportunities: ['Progress bar', 'Cancel option'] },
  { id: 'result', name: 'Result', description: 'User views and evaluates the output', emotion: 'positive', isDip: false, barriers: ['Hard to interpret results'], opportunities: ['Visual output', 'Explanation'] },
  { id: 'export', name: 'Export', description: 'User exports, shares, or applies the result', emotion: 'positive', isDip: false, barriers: ['Limited export formats'], opportunities: ['One-click copy', 'Multiple formats'] },
];

const DEFAULT_APP_STAGES: JourneyStageColumn[] = [
  { id: 'awareness', name: 'Awareness', description: 'User discovers the product', emotion: 'neutral', isDip: false, barriers: ['Lack of awareness'], opportunities: ['First impression'] },
  { id: 'consideration', name: 'Consideration', description: 'User evaluates options', emotion: 'neutral', isDip: false, barriers: ['Information overload'], opportunities: ['Clear value proposition'] },
  { id: 'onboarding', name: 'Onboarding', description: 'User starts using the product', emotion: 'negative', isDip: true, barriers: ['Complexity', 'Learning curve'], opportunities: ['Guided setup'] },
  { id: 'active-use', name: 'Active Use', description: 'User engages with core features', emotion: 'positive', isDip: false, barriers: ['Feature discovery'], opportunities: ['Power user features'] },
  { id: 'advocacy', name: 'Advocacy', description: 'User recommends to others', emotion: 'positive', isDip: false, barriers: ['Lack of sharing tools'], opportunities: ['Referral programs'] },
];

/** Get default stages for a given intent type */
export function getDefaultStagesForIntent(intent: StrategicIntent): JourneyStageColumn[] {
  const normalized = normalizeIntent(intent);
  switch (normalized) {
    case 'marketing-site': return BROCHURE_STAGES;
    case 'admin-portal': return ADMIN_PORTAL_STAGES;
    case 'dashboard': return DASHBOARD_STAGES;
    case 'tool': return TOOL_STAGES;
    case 'web-app':
    default:
      return DEFAULT_APP_STAGES;
  }
}

// ---------------------------------------------------------------------------
// Backward compatibility — keep static BROCHURE_SECTIONS export (deprecated)
// ---------------------------------------------------------------------------

/** @deprecated Use generateConceptDrivenSections() instead */
export const BROCHURE_SECTIONS: Record<string, Array<{
  featureName: string;
  featureDescription: string;
  uiPatternSuggestion: string;
  priority: 'must-have' | 'should-have' | 'nice-to-have';
}>> = {
  awareness: [
    {
      featureName: 'Hero Section',
      featureDescription: 'Bold headline, subheadline, and primary CTA above the fold',
      uiPatternSuggestion: 'Full-width hero with gradient background, headline, subtext, and CTA button',
      priority: 'must-have',
    },
    {
      featureName: 'Problem Statement',
      featureDescription: 'Articulate the pain point the visitor relates to',
      uiPatternSuggestion: 'Centered text block with empathetic copy and supporting illustration',
      priority: 'should-have',
    },
  ],
  consideration: [
    {
      featureName: 'Benefit Grid',
      featureDescription: 'Key benefits presented as a visual grid with icons',
      uiPatternSuggestion: '3-column card grid with icon, title, and short description per benefit',
      priority: 'must-have',
    },
    {
      featureName: 'Social Proof',
      featureDescription: 'Testimonials, logos, or case study snippets that build trust',
      uiPatternSuggestion: 'Carousel or grid of testimonial cards with avatar, quote, and attribution',
      priority: 'must-have',
    },
  ],
  decision: [
    {
      featureName: 'Pricing Transparency',
      featureDescription: 'Clear pricing tiers or value proposition to overcome price objection',
      uiPatternSuggestion: 'Pricing table with tier comparison, feature checklist, and highlighted recommended plan',
      priority: 'must-have',
    },
    {
      featureName: 'FAQ / Objection Handling',
      featureDescription: 'Address common concerns and reduce purchase anxiety',
      uiPatternSuggestion: 'Accordion FAQ section with concise answers',
      priority: 'should-have',
    },
  ],
  purchase: [
    {
      featureName: 'Final CTA Section',
      featureDescription: 'Strong closing call-to-action with urgency or incentive',
      uiPatternSuggestion: 'Full-width banner with headline, benefit summary, and prominent CTA button',
      priority: 'must-have',
    },
  ],
};
