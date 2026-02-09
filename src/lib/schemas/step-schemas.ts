/**
 * Step Artifact Schemas
 *
 * Zod schemas for all 10 design thinking step artifacts.
 * Each schema uses .describe() on every field to guide LLM extraction.
 *
 * Architecture:
 * - Flat structure (max 2 levels nesting)
 * - 3-7 required fields per schema (core essentials only)
 * - Secondary fields marked .optional()
 * - Rich .describe() text for LLM extraction guidance
 */

import { z } from 'zod';

/**
 * Step 1: Challenge Definition
 * Extracts core problem, target user, and HMW statement
 */
export const challengeArtifactSchema = z.object({
  problemStatement: z
    .string()
    .describe('Clear description of the core problem or opportunity being addressed'),
  targetUser: z
    .string()
    .describe('Specific user or stakeholder group who experiences this problem'),
  desiredOutcome: z
    .string()
    .describe('Measurable outcome or goal that indicates success'),
  hmwStatement: z
    .string()
    .describe(
      'Complete How Might We statement: How might we [action] for [who] so that [outcome]?'
    ),
  altitude: z
    .enum(['specific', 'balanced', 'broad'])
    .optional()
    .describe('Scope level of the challenge: specific (narrow), balanced (moderate), broad (wide)'),
});

export type ChallengeArtifact = z.infer<typeof challengeArtifactSchema>;

/**
 * Step 2: Stakeholder Mapping
 * Power-interest grid for identifying key stakeholders
 */
export const stakeholderArtifactSchema = z.object({
  stakeholders: z
    .array(
      z.object({
        name: z.string().describe('Name or title of stakeholder/group'),
        category: z
          .enum(['core', 'direct', 'indirect'])
          .describe(
            'Stakeholder category: core (primary users), direct (directly affected), indirect (peripherally affected)'
          ),
        power: z
          .enum(['high', 'medium', 'low'])
          .describe('Level of power or influence over the project'),
        interest: z
          .enum(['high', 'medium', 'low'])
          .describe('Level of interest or stake in the outcome'),
        notes: z
          .string()
          .optional()
          .describe('Additional context about this stakeholder'),
      })
    )
    .min(1)
    .describe('List of identified stakeholders with power-interest analysis'),
});

export type StakeholderArtifact = z.infer<typeof stakeholderArtifactSchema>;

/**
 * Step 3: User Research
 * Interview questions and key insights from research
 */
export const userResearchArtifactSchema = z.object({
  interviewQuestions: z
    .array(z.string())
    .min(1)
    .max(8)
    .describe('List of interview questions used to gather user insights'),
  insights: z
    .array(
      z.object({
        finding: z
          .string()
          .describe('Key insight or finding from user research'),
        source: z
          .string()
          .optional()
          .describe('Source of the insight (e.g., which stakeholder or research method)'),
        quote: z
          .string()
          .optional()
          .describe('Supporting quote or verbatim from user'),
      })
    )
    .min(1)
    .describe('Key insights discovered from user research'),
});

export type UserResearchArtifact = z.infer<typeof userResearchArtifactSchema>;

/**
 * Step 4: Sense Making
 * Themes, pain points, and gains from research synthesis
 */
export const senseMakingArtifactSchema = z.object({
  themes: z
    .array(
      z.object({
        name: z.string().describe('Theme or pattern name'),
        evidence: z
          .array(z.string())
          .min(1)
          .describe('Supporting evidence or observations for this theme'),
      })
    )
    .min(2)
    .max(5)
    .describe('Major themes or patterns identified in research'),
  pains: z
    .array(z.string())
    .min(1)
    .max(5)
    .describe('Top pain points or frustrations users experience'),
  gains: z
    .array(z.string())
    .min(1)
    .max(5)
    .describe('Desired gains or outcomes users are seeking'),
});

export type SenseMakingArtifact = z.infer<typeof senseMakingArtifactSchema>;

/**
 * Step 5: Persona Development
 * Research-grounded user persona
 */
export const personaArtifactSchema = z.object({
  name: z.string().describe('Persona name (first name or full name)'),
  age: z
    .number()
    .int()
    .min(18)
    .max(100)
    .optional()
    .describe('Age in years'),
  role: z
    .string()
    .describe('Job title, occupation, or primary role'),
  location: z
    .string()
    .optional()
    .describe('Geographic location (city, region, or country)'),
  bio: z
    .string()
    .describe(
      'Brief background story capturing context, situation, and relevant experiences'
    ),
  quote: z
    .string()
    .describe(
      'A representative quote that captures their perspective or mindset'
    ),
  goals: z
    .array(z.string())
    .min(1)
    .max(5)
    .describe('Primary goals or objectives this persona is trying to achieve'),
  pains: z
    .array(z.string())
    .min(1)
    .max(5)
    .describe('Key pain points, frustrations, or obstacles they face'),
  gains: z
    .array(z.string())
    .min(1)
    .max(5)
    .describe('Desired gains, outcomes, or improvements this persona seeks'),
  motivations: z
    .array(z.string())
    .optional()
    .describe('What drives this persona — their motivations for seeking a solution'),
  frustrations: z
    .array(z.string())
    .optional()
    .describe('Specific frustrations beyond pain points — daily annoyances and friction'),
  dayInTheLife: z
    .string()
    .optional()
    .describe('Brief day-in-the-life scenario showing how the problem manifests in their routine'),
  behaviors: z
    .array(z.string())
    .optional()
    .describe('Relevant behavior patterns, habits, or technology usage'),
});

export type PersonaArtifact = z.infer<typeof personaArtifactSchema>;

/**
 * Step 6: Journey Mapping
 * Current user experience with critical dip identification
 */
export const journeyMappingArtifactSchema = z.object({
  personaName: z
    .string()
    .describe('Name of the persona whose journey is being mapped'),
  stages: z
    .array(
      z.object({
        name: z.string().describe('Stage name or phase'),
        action: z
          .string()
          .describe('What the user does in this stage'),
        goals: z
          .string()
          .describe('What the user is trying to achieve in this stage'),
        barriers: z
          .string()
          .describe('Obstacles, pain points, or friction the user encounters in this stage'),
        touchpoints: z
          .string()
          .describe('Tools, systems, people, or interfaces the user interacts with in this stage'),
        emotions: z
          .enum(['positive', 'neutral', 'negative'])
          .describe(
            'Emotional state using traffic light: positive (green/good), neutral (orange/ok), negative (red/pain)'
          ),
        momentsOfTruth: z
          .string()
          .optional()
          .describe('Critical moments where user forms strong opinions or makes key decisions'),
        opportunities: z
          .string()
          .optional()
          .describe('Potential opportunities for improvement or intervention in this stage'),
        isDip: z
          .boolean()
          .optional()
          .default(false)
          .describe('Whether this stage is the critical dip (the low point in experience)'),
      })
    )
    .min(4)
    .max(8)
    .describe('Stages of the user journey from start to end with 7 layers per stage'),
  dipSummary: z
    .string()
    .describe(
      'Summary of the critical dip: the key breakdown point or frustration in the journey'
    ),
  dipRationale: z
    .string()
    .optional()
    .describe('Explanation for why this stage was identified as the critical dip'),
});

export type JourneyMappingArtifact = z.infer<typeof journeyMappingArtifactSchema>;

/**
 * Step 7: Reframe Challenge
 * Fresh HMW using 4-part builder based on research insights
 */
export const reframeArtifactSchema = z.object({
  originalHmw: z
    .string()
    .describe('The original How Might We statement from Step 1'),
  hmwStatements: z
    .array(
      z.object({
        givenThat: z
          .string()
          .describe('Context or situation from research (Given that...)'),
        persona: z
          .string()
          .describe('Specific persona or user type (How might we help [persona]...)'),
        immediateGoal: z
          .string()
          .describe('Immediate action or outcome (do/be/feel/achieve...)'),
        deeperGoal: z
          .string()
          .describe('Deeper emotional or broader outcome (So they can...)'),
        fullStatement: z
          .string()
          .describe('Complete HMW statement combining all 4 parts'),
      })
    )
    .min(1)
    .describe('One or more reframed HMW statements built using the 4-part template'),
  selectedForIdeation: z
    .array(z.number())
    .optional()
    .describe('Array of indices indicating which HMW statements to carry into Step 8 ideation'),
  insightsApplied: z
    .array(z.string())
    .min(1)
    .describe(
      'Key insights from research (Steps 3-6) that informed the reframe'
    ),
  evolution: z
    .string()
    .optional()
    .describe(
      'Explanation of how and why the HMW evolved from original to reframed'
    ),
});

export type ReframeArtifact = z.infer<typeof reframeArtifactSchema>;

/**
 * Step 8: Ideation
 * Multi-round ideation with clusters, brain writing, and Crazy 8s
 */
export const ideationArtifactSchema = z.object({
  hmwPrompt: z
    .string()
    .describe('The reframed HMW statement from Step 7 used as the ideation prompt'),
  clusters: z
    .array(
      z.object({
        theme: z.string().describe('Theme name for this idea cluster'),
        ideas: z
          .array(
            z.object({
              title: z.string().describe('Short, memorable idea title'),
              description: z.string().describe('Clear description of the idea and how it addresses the HMW'),
              isWildCard: z
                .boolean()
                .optional()
                .default(false)
                .describe('Whether this is a deliberately provocative wild card idea'),
            })
          )
          .min(2)
          .describe('Ideas within this themed cluster (3-4 per cluster, including 1-2 wild cards)'),
      })
    )
    .min(2)
    .describe('3-4 themed idea clusters generated from the HMW statement'),
  userIdeas: z
    .array(
      z.object({
        title: z.string().describe('User-contributed idea title'),
        description: z.string().describe('Description of the user-contributed idea'),
      })
    )
    .optional()
    .describe('Ideas contributed by the user during the input round'),
  brainWrittenIdeas: z
    .array(
      z.object({
        originalTitle: z.string().describe('Title of the original idea that was built upon'),
        evolution: z.string().describe('How the idea evolved through 3 rounds of "Yes, and..." building'),
        finalVersion: z.string().describe('The idea after 3 rounds of brain writing enhancement'),
      })
    )
    .optional()
    .describe('Ideas evolved through 3 rounds of brain writing using "Yes, and..." technique'),
  crazyEightsIdeas: z
    .array(
      z.object({
        title: z.string().describe('Quick rapid-fire idea title'),
        description: z.string().describe('Brief description from the Crazy 8s round'),
      })
    )
    .optional()
    .describe('8 rapid-fire ideas from the Crazy 8s round'),
  selectedIdeas: z
    .array(z.string())
    .min(1)
    .max(4)
    .describe('Titles of the 1-4 ideas selected for concept development in Step 9 (hard limit: max 3-4)'),
});

export type IdeationArtifact = z.infer<typeof ideationArtifactSchema>;

/**
 * Step 9: Concept Development
 * Complete concept sheet with SWOT (3 bullets/quadrant), 1-5 feasibility, and Billboard Hero
 */
export const conceptArtifactSchema = z.object({
  concepts: z
    .array(
      z.object({
        ideaSource: z
          .string()
          .describe('Title of the Step 8 selected idea this concept develops'),
        name: z
          .string()
          .describe('Marketable concept name (2-4 words, evocative)'),
        elevatorPitch: z
          .string()
          .describe('2-3 sentence elevator pitch: Problem, Solution, Benefit'),
        usp: z
          .string()
          .describe('Unique Selling Proposition: what makes this different from the current state'),
        swot: z
          .object({
            strengths: z
              .array(z.string())
              .min(3)
              .max(3)
              .describe('3 internal strengths referencing persona gains or research evidence'),
            weaknesses: z
              .array(z.string())
              .min(3)
              .max(3)
              .describe('3 internal weaknesses referencing persona pains or limitations'),
            opportunities: z
              .array(z.string())
              .min(3)
              .max(3)
              .describe('3 external opportunities referencing market/domain context from research'),
            threats: z
              .array(z.string())
              .min(3)
              .max(3)
              .describe('3 external threats referencing challenges from stakeholder map or research'),
          })
          .describe('SWOT analysis with exactly 3 evidence-based bullets per quadrant'),
        feasibility: z
          .object({
            technical: z
              .number()
              .int()
              .min(1)
              .max(5)
              .describe('Technical feasibility score (1=very difficult, 5=straightforward)'),
            technicalRationale: z
              .string()
              .describe('Rationale for technical score with evidence from prior steps'),
            business: z
              .number()
              .int()
              .min(1)
              .max(5)
              .describe('Business viability score (1=weak case, 5=strong case)'),
            businessRationale: z
              .string()
              .describe('Rationale for business score with evidence from prior steps'),
            userDesirability: z
              .number()
              .int()
              .min(1)
              .max(5)
              .describe('User desirability score (1=low demand, 5=high demand)'),
            userDesirabilityRationale: z
              .string()
              .describe('Rationale for user desirability score citing persona pains/gains'),
          })
          .describe('Feasibility assessment with 1-5 numeric scores and evidence-based rationale per dimension'),
        billboardHero: z
          .object({
            headline: z
              .string()
              .describe('6-10 word benefit-focused billboard headline'),
            subheadline: z
              .string()
              .describe('1-2 sentence explanation of how it solves persona pain'),
            cta: z
              .string()
              .describe('Verb-driven, specific call to action'),
          })
          .optional()
          .describe('Billboard Hero exercise testing if the concept pitch is clear and compelling'),
      })
    )
    .min(1)
    .max(3)
    .describe('1-3 developed concepts, each from a separate Step 8 selected idea'),
});

export type ConceptArtifact = z.infer<typeof conceptArtifactSchema>;

/**
 * Step 10: Validate & Synthesis
 * Dual-format synthesis: narrative + structured summary with confidence assessment
 */
export const validateArtifactSchema = z.object({
  narrativeIntro: z
    .string()
    .describe('1-2 paragraph storytelling narrative of the journey from vague idea to validated concept'),
  stepSummaries: z
    .array(
      z.object({
        stepNumber: z.number().int().min(1).max(10).describe('Step number (1-10)'),
        stepName: z.string().describe('Step name (e.g., Challenge, Stakeholder Mapping)'),
        keyOutputs: z
          .array(z.string())
          .min(1)
          .max(3)
          .describe('2-3 most important outputs from this step'),
      })
    )
    .min(9)
    .max(10)
    .describe('Structured summary of key outputs from each step of the journey'),
  confidenceAssessment: z
    .object({
      score: z
        .number()
        .int()
        .min(1)
        .max(10)
        .describe('Confidence score 1-10 rating how well-validated the concept is'),
      rationale: z
        .string()
        .describe('Honest explanation of why this score — what was strong, what was weak'),
      researchQuality: z
        .enum(['thin', 'moderate', 'strong'])
        .describe('Assessment of research quality: thin (synthetic only), moderate (some real data), strong (real interviews + data)'),
    })
    .describe('Honest confidence assessment of how well-validated the concept is based on research quality'),
  recommendedNextSteps: z
    .array(z.string())
    .min(3)
    .max(5)
    .describe('3-5 concrete, specific next actions based on concept and gaps identified — NOT generic advice'),
});

export type ValidateArtifact = z.infer<typeof validateArtifactSchema>;
