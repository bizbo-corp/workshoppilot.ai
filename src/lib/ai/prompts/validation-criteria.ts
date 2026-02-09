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
      },
      {
        name: 'Evidence Traceability',
        description: 'Pains and gains explicitly trace to Step 4 with source attribution',
        checkPrompt: 'Can each pain and gain be directly linked to specific Step 4 research findings? Is the source evidence clear and traceable?'
      },
      {
        name: 'Multi-Persona Coverage',
        description: 'Persona count matches research diversity (1-3 personas as needed)',
        checkPrompt: 'If research shows distinct user types with different needs, are multiple personas created? If research is homogeneous, is a single persona sufficient? Does the persona count match the actual user diversity revealed in research?'
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
        description: 'Each stage has all 7 layers populated',
        checkPrompt: 'Does each journey stage include all 7 layers: action, goals, barriers, touchpoints, emotions (traffic light), moments of truth (if applicable), and opportunities (if applicable)?'
      },
      {
        name: 'Layer Depth',
        description: 'Each layer contains specific, research-grounded details (not generic)',
        checkPrompt: 'Are the layers populated with specific details from research (not generic placeholders like "user is frustrated")? Do barriers reference Step 4 pains? Do goals reference persona goals? Do touchpoints mention specific tools from Step 3?'
      },
      {
        name: 'Emotional Variance',
        description: 'Emotions vary across stages and reflect barrier severity',
        checkPrompt: 'Do emotions vary across the journey (not all negative or all positive)? Do emotions match barrier severity (severe barriers = negative emotion, minimal barriers = positive/neutral emotion)?'
      },
      {
        name: 'Dip Identification',
        description: 'The critical pain point (dip) is clearly marked with rationale',
        checkPrompt: 'Is there a clear "dip" stage where the persona experiences the most acute pain or breakdown? Is there a rationale explaining why this stage is the dip?'
      },
      {
        name: 'Dip Evidence',
        description: 'Dip stage has specific barriers and negative emotion grounded in research',
        checkPrompt: 'Does the dip stage contain specific barriers from Step 4 pains? Is the emotion negative (reflecting the severity)? Can the dip be traced to research evidence (not assumed)?'
      },
      {
        name: 'Persona Grounding',
        description: 'Journey reflects the specific persona from Step 5',
        checkPrompt: 'Is this journey specific to the persona from Step 5 (using their context and behaviors) rather than a generic user journey? Note: The journey should use generic references ("the user") in stage descriptions, but the overall journey should reflect the specific persona\'s context.'
      }
    ],

    'reframe': [
      {
        name: 'Research Alignment',
        description: 'Reframed HMW references persona and journey dip',
        checkPrompt: 'Does the reframed HMW explicitly reference insights from the persona (Step 5) and the journey map dip (Step 6)?'
      },
      {
        name: 'Dip Alignment',
        description: 'HMW "Given that" field traces directly to journey dip barriers',
        checkPrompt: 'Does the "Given that" context trace directly to specific barriers from the journey dip stage (Step 6)? Is the connection explicit and evidence-based?'
      },
      {
        name: 'Evidence Traceability',
        description: 'Each HMW component traces to specific prior research',
        checkPrompt: 'Can each of the 4 HMW parts be traced to specific research? Given that (dip barriers), persona (Step 5), immediate goal (journey goals/persona goals), deeper goal (Step 4 gains)?'
      },
      {
        name: 'Fresh Rewrite',
        description: 'HMW is a fresh rewrite from scratch, not evolution of Step 1',
        checkPrompt: 'Is this HMW drafted fresh from research (not just tweaking Step 1 wording)? Does it feel like a new statement grounded in all accumulated insights rather than a minor refinement?'
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
        description: 'HMW uses 4-part structure with specific details in each field',
        checkPrompt: 'Does the HMW use the 4-part structure (Given that / persona / immediate goal / deeper goal) with specific, research-grounded details in each field (not generic statements)?'
      }
    ],

    'ideation': [
      {
        name: 'Mind Mapping Quality',
        description: 'Mind Mapping sub-step produced 3-4 themed clusters with wild cards',
        checkPrompt: 'Does the Mind Mapping sub-step (8a) produce 3-4 themed clusters, each containing 3-4 ideas including 1-2 wild cards? Are the themes genuinely different approaches (not variations of one idea)?'
      },
      {
        name: 'Wild Card Creativity',
        description: 'Wild card ideas feel genuinely unconventional',
        checkPrompt: 'Do the wild card ideas challenge assumptions or draw from other industries? Do they feel genuinely unconventional and boundary-pushing (not just slight variations of normal ideas)?'
      },
      {
        name: 'Crazy 8s Volume',
        description: 'Crazy 8s sub-step produced 8 rapid-fire ideas',
        checkPrompt: 'Does the Crazy 8s sub-step (8b) produce 8 rapid-fire ideas? Are these ideas rough and quick (embracing speed over polish)?'
      },
      {
        name: 'Brain Writing Coherence',
        description: 'Brain Writing sub-step evolved 5-8 ideas through 3 rounds',
        checkPrompt: 'Does the Brain Writing sub-step (8c) evolve 5-8 favorite ideas through 3 rounds of "Yes, and..." building? Did each enhancement add value without feature bloat? Is each enhanced idea still coherent and focused?'
      },
      {
        name: 'Sub-Step Order',
        description: 'Sub-steps executed in correct order: Mind Mapping -> Crazy 8s -> Brain Writing',
        checkPrompt: 'Were the sub-steps executed in the correct order: Mind Mapping (8a) first, then Crazy 8s (8b), then Brain Writing (8c)? Did Brain Writing reference ideas from the previous sub-steps?'
      },
      {
        name: 'Idea Volume',
        description: 'Sufficient quantity of distinct ideas generated across all sub-steps',
        checkPrompt: 'Are there at least 15+ distinct ideas across all sub-steps (Mind Mapping clusters + user ideas + Crazy 8s + Brain Writing)? Do the ideas span different categories and approaches?'
      },
      {
        name: 'HMW Alignment',
        description: 'Ideas address the reframed challenge from Step 7',
        checkPrompt: 'Do the generated ideas clearly address the reframed HMW statement from Step 7? Can each idea be connected to the persona pain point?'
      },
      {
        name: 'Selection Discipline',
        description: 'User selected 1-4 ideas for concept development',
        checkPrompt: 'Did the user select 1-4 ideas for concept development (not more)? Did AI enforce the hard limit if the user tried to select too many?'
      }
    ],

    'concept': [
      {
        name: 'Concept Completeness',
        description: 'Each concept has all required elements: name, pitch, USP, SWOT, feasibility, billboard',
        checkPrompt: 'Does each concept sheet include: name, elevator pitch, USP, SWOT analysis (3 bullets per quadrant), and feasibility scores (1-5 numeric with rationale for each dimension)?'
      },
      {
        name: 'SWOT Evidence',
        description: 'SWOT bullets reference prior research and persona',
        checkPrompt: 'Do the SWOT bullets trace to prior step evidence? Strengths to persona gains, weaknesses to persona pains, opportunities to research context, threats to stakeholder/research challenges? Are there any generic bullets not grounded in research?'
      },
      {
        name: 'Feasibility Rationale',
        description: 'Feasibility scores have specific rationale with evidence',
        checkPrompt: 'Do the 1-5 feasibility scores (technical, business, user desirability) each include specific reasoning citing prior steps? Are the rationales honest (acknowledging uncertainty where it exists)?'
      },
      {
        name: 'Billboard Clarity',
        description: 'Billboard Hero headline communicates value proposition clearly',
        checkPrompt: 'Does the Billboard Hero headline (6-10 words) communicate a clear benefit? Is it benefit-focused (not feature-focused)? Would the persona stop and pay attention to this billboard?'
      },
      {
        name: 'Dip Solution',
        description: 'Concept addresses the journey map dip from Step 6',
        checkPrompt: 'Does the concept clearly address the critical pain point (dip) identified in the journey map from Step 6? Is the connection explicit in the elevator pitch or USP?'
      }
    ],

    'validate': [
      {
        name: 'Narrative Quality',
        description: 'Narrative intro tells the journey story compellingly',
        checkPrompt: 'Does the narrative intro tell a compelling story from vague idea to validated concept? Does it make the user feel their time was well spent? Is it storytelling (not a dry summary)?'
      },
      {
        name: 'Step Coverage',
        description: 'Structured summary covers all 9-10 steps with key outputs',
        checkPrompt: 'Does the structured summary include key outputs from Steps 1-9 (and Step 10 itself)? Are there 2-3 bullet points per step capturing the MOST important outputs (not a data dump)?'
      },
      {
        name: 'Confidence Honesty',
        description: 'Confidence assessment is honest with specific rationale',
        checkPrompt: 'Is the confidence score honest (not inflated to make the user feel good)? Does the rationale explain what evidence supports the concept AND what gaps remain? Does research quality accurately reflect whether interviews were synthetic vs real?'
      },
      {
        name: 'Next Steps Specificity',
        description: 'Recommended next steps are concrete and specific to this concept',
        checkPrompt: 'Are the 3-5 next steps specific to THIS concept and workshop (not generic advice like "do more research")? Do they reference specific gaps identified during the journey? Are they actionable enough to execute?'
      },
      {
        name: 'Journey Arc Coherence',
        description: 'Summary shows clear arc from problem to validated concept',
        checkPrompt: 'Does the overall summary show a clear arc: problem definition -> research -> persona/journey -> reframe -> ideation -> concept -> validation? Can the user see how each step built on the previous ones?'
      }
    ]
  };

  return criteria[stepId] || [];
}
