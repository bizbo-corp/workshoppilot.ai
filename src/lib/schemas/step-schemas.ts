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
        actions: z
          .string()
          .describe('What the user does in this stage'),
        thoughts: z
          .string()
          .describe('What the user is thinking during this stage'),
        emotions: z
          .string()
          .describe(
            'How the user feels (emotional state: positive, neutral, negative, frustrated, etc.)'
          ),
        isDip: z
          .boolean()
          .optional()
          .default(false)
          .describe('Whether this stage is the critical dip (the low point in experience)'),
      })
    )
    .min(4)
    .max(8)
    .describe('Stages of the user journey from start to end'),
  dipSummary: z
    .string()
    .describe(
      'Summary of the critical dip: the key breakdown point or frustration in the journey'
    ),
});

export type JourneyMappingArtifact = z.infer<typeof journeyMappingArtifactSchema>;

/**
 * Step 7: Reframe Challenge
 * Refined HMW based on research insights
 */
export const reframeArtifactSchema = z.object({
  originalHmw: z
    .string()
    .describe('The original How Might We statement from Step 1'),
  insightsApplied: z
    .array(z.string())
    .min(1)
    .describe(
      'Key insights from research (Steps 3-6) that informed the reframe'
    ),
  refinedHmw: z
    .string()
    .describe(
      'The refined How Might We statement incorporating research insights and focusing on the critical dip'
    ),
  evolution: z
    .string()
    .optional()
    .describe(
      'Explanation of how and why the HMW evolved from original to refined'
    ),
});

export type ReframeArtifact = z.infer<typeof reframeArtifactSchema>;

/**
 * Step 8: Ideation
 * Generated ideas addressing the refined HMW
 */
export const ideationArtifactSchema = z.object({
  hmwPrompt: z
    .string()
    .describe('The HMW statement used as the ideation prompt'),
  ideas: z
    .array(
      z.object({
        title: z.string().describe('Short, memorable idea title'),
        description: z
          .string()
          .describe('Clear description of the idea and how it works'),
        category: z
          .string()
          .optional()
          .describe(
            'Category or type of idea (e.g., digital tool, process change, service, etc.)'
          ),
      })
    )
    .min(1)
    .describe('List of generated ideas from ideation techniques'),
  topIdeas: z
    .array(z.string())
    .max(3)
    .optional()
    .describe('Top 3 idea titles selected for further development'),
});

export type IdeationArtifact = z.infer<typeof ideationArtifactSchema>;

/**
 * Step 9: Concept Development
 * Developed concept with SWOT and feasibility analysis
 */
export const conceptArtifactSchema = z.object({
  name: z.string().describe('Concept name or title'),
  elevatorPitch: z
    .string()
    .describe(
      'One or two sentence elevator pitch explaining the concept value proposition'
    ),
  usp: z
    .string()
    .optional()
    .describe('Unique Selling Proposition: what makes this concept distinctive'),
  swot: z
    .object({
      strengths: z
        .array(z.string())
        .min(1)
        .describe('Internal strengths of the concept'),
      weaknesses: z
        .array(z.string())
        .min(1)
        .describe('Internal weaknesses or limitations'),
      opportunities: z
        .array(z.string())
        .min(1)
        .describe('External opportunities for the concept'),
      threats: z
        .array(z.string())
        .min(1)
        .describe('External threats or risks'),
    })
    .describe('SWOT analysis (Strengths, Weaknesses, Opportunities, Threats)'),
  feasibility: z
    .object({
      technical: z
        .enum(['high', 'medium', 'low'])
        .describe('Technical feasibility: can we build it?'),
      business: z
        .enum(['high', 'medium', 'low'])
        .describe('Business feasibility: is it viable?'),
      userDesirability: z
        .enum(['high', 'medium', 'low'])
        .describe('User desirability: do users want it?'),
      rationale: z
        .string()
        .optional()
        .describe('Rationale or explanation for feasibility ratings'),
    })
    .optional()
    .describe('Feasibility assessment across technical, business, and user dimensions'),
  nextSteps: z
    .array(z.string())
    .optional()
    .describe('Recommended next steps or action items'),
});

export type ConceptArtifact = z.infer<typeof conceptArtifactSchema>;

/**
 * Step 10: Validate & Build Pack
 * User flows, PRD outline, and build pack components
 */
export const validateArtifactSchema = z.object({
  userFlow: z
    .string()
    .describe(
      'User flow diagram or description showing how users interact with the solution'
    ),
  prdOutline: z
    .object({
      overview: z
        .string()
        .describe('Product overview and objectives'),
      targetUsers: z
        .string()
        .describe('Target user segments and personas'),
      coreFeatures: z
        .array(z.string())
        .min(2)
        .describe('Core features for MVP'),
      userStories: z
        .array(z.string())
        .optional()
        .describe('User stories in format: As a [who], I want [what], so that [why]'),
      technicalRequirements: z
        .string()
        .optional()
        .describe('High-level technical requirements or stack'),
      successMetrics: z
        .array(z.string())
        .optional()
        .describe('Key metrics to measure success'),
    })
    .describe('PRD outline for the Build Pack'),
  journeySummary: z
    .string()
    .optional()
    .describe('Summary of the entire design thinking journey and key outcomes'),
});

export type ValidateArtifact = z.infer<typeof validateArtifactSchema>;
