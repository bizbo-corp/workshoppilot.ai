-- Seed step definitions for all 10 design thinking steps
-- IDs MUST match step-metadata.ts STEPS[].id values
-- Uses ON CONFLICT to make this script idempotent (safe to run multiple times)

INSERT INTO step_definitions (id, name, description, "order", prompt_template, created_at)
VALUES
  (
    'challenge',
    'Challenge',
    'Extract the core problem and draft a How Might We statement',
    1,
    NULL,
    NOW()
  ),
  (
    'stakeholder-mapping',
    'Stakeholder Mapping',
    'Identify and prioritize the people and groups involved',
    2,
    NULL,
    NOW()
  ),
  (
    'user-research',
    'User Research',
    'Gather insights through synthetic interviews and research',
    3,
    NULL,
    NOW()
  ),
  (
    'sense-making',
    'Research Sense Making',
    'Synthesize research into themes, pains, and gains',
    4,
    NULL,
    NOW()
  ),
  (
    'persona',
    'Persona Development',
    'Create a research-grounded user persona',
    5,
    NULL,
    NOW()
  ),
  (
    'journey-mapping',
    'Journey Mapping',
    'Map the current user experience and find the critical dip',
    6,
    NULL,
    NOW()
  ),
  (
    'reframe',
    'Reframing Challenge',
    'Craft a focused How Might We statement based on insights',
    7,
    NULL,
    NOW()
  ),
  (
    'ideation',
    'Ideation',
    'Generate ideas using Mind Mapping, Crazy 8s, Brain Writing, and Billboard Hero',
    8,
    NULL,
    NOW()
  ),
  (
    'concept',
    'Concept Development',
    'Develop concept sheets with SWOT analysis, feasibility, and elevator pitch',
    9,
    NULL,
    NOW()
  ),
  (
    'validate',
    'Validate',
    'Create flow diagrams, prototyping, PRD generation, and Build Pack export',
    10,
    NULL,
    NOW()
  )
ON CONFLICT (id) DO UPDATE SET
  name = EXCLUDED.name,
  description = EXCLUDED.description,
  "order" = EXCLUDED."order",
  prompt_template = EXCLUDED.prompt_template;
