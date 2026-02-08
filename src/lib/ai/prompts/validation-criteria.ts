/**
 * Validation Criteria Module
 *
 * Each design thinking step has quality criteria the AI uses during the Validate arc phase
 * to assess output quality before allowing progression to the next step.
 *
 * Criteria include:
 * - name: Short label for the criterion
 * - description: What this criterion checks for
 * - checkPrompt: A specific yes/no question the AI evaluates (not generic "Is this good?")
 */

export interface ValidationCriterion {
  name: string;
  description: string;
  checkPrompt: string;
}

/**
 * Get validation criteria for a specific step
 *
 * @param stepId - Semantic step ID from step-metadata.ts
 * @returns Array of validation criteria for this step, or empty array if unknown
 */
export function getValidationCriteria(stepId: string): ValidationCriterion[] {
  const criteria: Record<string, ValidationCriterion[]> = {
    'challenge': [
      {
        name: 'Specificity',
        description: 'HMW statement is neither too broad nor too narrow',
        checkPrompt: 'Does this HMW avoid being a vague vision statement (too broad like "fix poverty") or a specific feature request (too narrow like "add blue buttons")?'
      },
      {
        name: 'Target User Identified',
        description: 'HMW clearly identifies who it is for',
        checkPrompt: 'Does this HMW explicitly name or describe the target user or stakeholder group?'
      },
      {
        name: 'Measurable Outcome',
        description: 'HMW implies a measurable outcome or benefit',
        checkPrompt: 'Does this HMW suggest a concrete outcome that could be validated or measured (even if metrics aren\'t specified yet)?'
      },
      {
        name: 'Avoids Solution Bias',
        description: 'HMW focuses on the problem, not a predetermined solution',
        checkPrompt: 'Is this HMW framed as a problem to solve rather than disguising a solution ("we need an app" is a solution, not a problem)?'
      },
      {
        name: 'Altitude Check',
        description: 'HMW is at balanced altitude -- not a feature request and not a vision statement',
        checkPrompt: 'Has the HMW been assessed for altitude? It should not describe a specific feature or technology (too narrow) nor be an unsolvable vision statement (too broad). Did the user see multiple altitude options?'
      }
    ],

    'stakeholder-mapping': [
      {
        name: 'Category Coverage',
        description: 'Core, Direct, and Indirect stakeholder categories are populated',
        checkPrompt: 'Are stakeholders identified across all three categories: Core (direct users), Direct (decision-makers/influencers), and Indirect (affected but distant)?'
      },
      {
        name: 'Power/Interest Mapped',
        description: 'Stakeholders are assessed for power and interest levels',
        checkPrompt: 'Has each stakeholder been evaluated for their power (ability to influence) and interest (level of concern)?'
      },
      {
        name: 'Relevance to Challenge',
        description: 'Stakeholders connect to the Step 1 challenge',
        checkPrompt: 'Are the identified stakeholders clearly relevant to the HMW challenge from Step 1?'
      },
      {
        name: 'Completeness Check',
        description: 'Missing stakeholder categories have been explored',
        checkPrompt: 'Have we proactively checked for potentially missing stakeholders? Were decision-makers, regulators, internal team, partners, and indirect stakeholders explicitly considered (even if none exist for this project)?'
      }
    ],

    'user-research': [
      {
        name: 'Question Quality',
        description: 'Questions are open-ended and not leading',
        checkPrompt: 'Are the research questions open-ended (not yes/no) and neutral (not leading the user toward a predetermined answer)?'
      },
      {
        name: 'Insight Depth',
        description: 'Findings are specific, not generic platitudes',
        checkPrompt: 'Do the research insights contain specific observations, behaviors, or quotes rather than generic statements like "users want it to be easy"?'
      },
      {
        name: 'Stakeholder Coverage',
        description: 'Research covers multiple stakeholder types from Step 2',
        checkPrompt: 'Does the research include insights from different stakeholder types identified in Step 2 (not just one user type)?'
      },
      {
        name: 'Source Attribution',
        description: 'Each insight is attributed to a specific stakeholder or source',
        checkPrompt: 'Does each research insight identify which stakeholder or source it came from? Can we trace each finding back to a specific interview or data source?'
      },
      {
        name: 'Behavioral Depth',
        description: 'Research captures behaviors and workarounds, not just opinions',
        checkPrompt: 'Do the insights include specific behaviors, workarounds, or concrete examples (not just abstract opinions like "users want it to be better")?'
      }
    ],

    'sense-making': [
      {
        name: 'Theme Coherence',
        description: 'Themes are supported by evidence from Step 3',
        checkPrompt: 'Does each theme trace back to specific research findings from Step 3, with clear supporting evidence?'
      },
      {
        name: 'Pain/Gain Balance',
        description: 'Both pains and gains are identified (5 each) with evidence',
        checkPrompt: 'Are there 5 pain points and 5 gains identified, each grounded in research evidence (not assumptions)?'
      },
      {
        name: 'Research Grounding',
        description: 'All insights trace back to Step 3 research findings',
        checkPrompt: 'Can each pain, gain, and theme be directly linked to specific insights or quotes from Step 3 user research?'
      },
      {
        name: 'Evidence Chain',
        description: 'Every pain and gain traces to specific Step 3 research findings',
        checkPrompt: 'Can every identified pain point and gain be directly linked to specific research findings from Step 3? Are there any insights that appear unsupported by the research data?'
      },
      {
        name: 'Challenge Relevance',
        description: 'Themes connect back to the original HMW from Step 1',
        checkPrompt: 'Do the identified themes relate to the core challenge from Step 1? Is it clear how these research findings deepen our understanding of the original problem?'
      }
    ],

    'persona': [
      {
        name: 'Research Grounding',
        description: 'Persona traits trace back to Step 4 pains/gains',
        checkPrompt: 'Are the persona\'s pain points and desired gains directly from the research findings in Step 4 (not invented or generic)?'
      },
      {
        name: 'Specificity',
        description: 'Persona has concrete details (name, role, context)',
        checkPrompt: 'Does the persona feel like a real, specific person with concrete details (name, age, role, location, bio, quote) rather than a generic archetype like "busy professional"?'
      },
      {
        name: 'Actionability',
        description: 'Persona provides enough detail to inform design decisions',
        checkPrompt: 'Could a designer or developer use this persona to make specific product decisions about features, language, or experience design?'
      },
      {
        name: 'Internal Consistency',
        description: 'Persona traits don\'t conflict (no Frankenstein persona)',
        checkPrompt: 'Are all the persona traits consistent with each other, or are there conflicting characteristics that suggest merging incompatible user types?'
      }
    ],

    'journey-mapping': [
      {
        name: 'Stage Coverage',
        description: 'Journey has 4-8 stages from awareness to resolution',
        checkPrompt: 'Does the journey map include 4-8 distinct stages covering the persona\'s experience from awareness through to current resolution or workaround?'
      },
      {
        name: 'Multi-Layer Depth',
        description: 'Each stage has actions, thoughts, and emotions',
        checkPrompt: 'Does each journey stage include all three layers: what the persona does (actions), what they think (thoughts), and how they feel (emotions)?'
      },
      {
        name: 'Dip Identification',
        description: 'The critical pain point (dip) is clearly marked',
        checkPrompt: 'Is there a clear "dip" stage where the persona experiences the most acute pain or breakdown, and is this explicitly identified as the critical opportunity?'
      },
      {
        name: 'Persona Grounding',
        description: 'Journey reflects the specific persona from Step 5',
        checkPrompt: 'Is this journey specific to the persona from Step 5 (using their name, context, and behaviors) rather than a generic user journey?'
      }
    ],

    'reframe': [
      {
        name: 'Research Alignment',
        description: 'Reframed HMW references persona and journey dip',
        checkPrompt: 'Does the reframed HMW explicitly reference insights from the persona (Step 5) and the journey map dip (Step 6)?'
      },
      {
        name: 'Narrower Focus',
        description: 'Reframed HMW is more specific than original Challenge',
        checkPrompt: 'Is the reframed HMW statement more focused and specific than the original HMW from Step 1 (not just a restatement)?'
      },
      {
        name: 'Actionability',
        description: 'Reframed HMW implies a clear solution space',
        checkPrompt: 'Does the reframed HMW suggest a clear direction for ideation without prescribing a specific solution?'
      },
      {
        name: 'Context Specificity',
        description: 'HMW includes specific context (who/when/so that)',
        checkPrompt: 'Does the HMW include specific context: who (persona), when (journey stage or context), and so that (measurable outcome)?'
      }
    ],

    'ideation': [
      {
        name: 'Quantity Threshold',
        description: 'Minimum 8-10 distinct ideas generated',
        checkPrompt: 'Are there at least 8-10 distinct ideas (not variations of the same concept)?'
      },
      {
        name: 'Category Diversity',
        description: 'Ideas span different approaches and categories',
        checkPrompt: 'Do the ideas explore different categories or approaches (e.g., tech solutions, service design, process changes, education) rather than just variations of one approach?'
      },
      {
        name: 'HMW Alignment',
        description: 'Ideas address the reframed challenge from Step 7',
        checkPrompt: 'Does each idea clearly address the reframed HMW statement from Step 7?'
      }
    ],

    'concept': [
      {
        name: 'Completeness',
        description: 'Concept has all required elements',
        checkPrompt: 'Does the concept sheet include: name, elevator pitch, unique selling proposition, SWOT analysis, and feasibility scores (technical, business, user desirability)?'
      },
      {
        name: 'Evidence-Based SWOT',
        description: 'SWOT elements reference research and persona',
        checkPrompt: 'Are the SWOT elements (strengths, weaknesses, opportunities, threats) grounded in evidence from prior research (Steps 3-7) rather than generic assumptions?'
      },
      {
        name: 'Feasibility Realism',
        description: 'Feasibility scores have clear rationale',
        checkPrompt: 'Do the feasibility scores (technical, business, user desirability) include specific reasoning rather than just gut-feeling ratings?'
      },
      {
        name: 'Dip Solution',
        description: 'Concept addresses the journey map dip from Step 6',
        checkPrompt: 'Does the concept clearly address the critical pain point (dip) identified in the journey map from Step 6?'
      }
    ],

    'validate': [
      {
        name: 'Comprehensiveness',
        description: 'Validation references all 10 prior steps',
        checkPrompt: 'Does the validation documentation reference outputs from all prior steps (challenge, stakeholders, research, sense-making, persona, journey, reframe, ideation, concept)?'
      },
      {
        name: 'Narrative Coherence',
        description: 'Story flows from problem through research to solution',
        checkPrompt: 'Does the Build Pack tell a coherent story from the original problem (Step 1) through research and insights (Steps 2-7) to the validated solution (Steps 8-10)?'
      },
      {
        name: 'Actionability',
        description: 'PRD and user stories are developer-ready',
        checkPrompt: 'Are the PRD and user stories specific and complete enough for a developer to understand what to build without needing to ask clarifying questions?'
      },
      {
        name: 'Flow Diagram Completeness',
        description: 'User flow covers persona entry to outcome',
        checkPrompt: 'Does the user flow diagram show the complete path from the persona\'s entry point through core actions to achieving the desired outcome from the HMW?'
      }
    ]
  };

  return criteria[stepId] || [];
}
