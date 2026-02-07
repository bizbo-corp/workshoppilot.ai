-- Seed step definitions for all 10 design thinking steps
-- Uses ON CONFLICT to make this script idempotent (safe to run multiple times)

INSERT INTO step_definitions (id, name, description, "order", prompt_template, created_at)
VALUES
  (
    'empathize',
    'Empathize',
    'Understand your users and their needs deeply through research and observation',
    1,
    NULL,
    NOW()
  ),
  (
    'define',
    'Define',
    'Synthesize research into a clear problem statement',
    2,
    NULL,
    NOW()
  ),
  (
    'ideate',
    'Ideate',
    'Generate a wide range of creative solutions',
    3,
    NULL,
    NOW()
  ),
  (
    'prototype',
    'Prototype',
    'Create low-fidelity representations of your solutions',
    4,
    NULL,
    NOW()
  ),
  (
    'test',
    'Test',
    'Validate prototypes with real users and gather feedback',
    5,
    NULL,
    NOW()
  ),
  (
    'prioritize',
    'Prioritize',
    'Evaluate and rank features for your minimum viable product',
    6,
    NULL,
    NOW()
  ),
  (
    'architect',
    'Architect',
    'Design the technical architecture and system structure',
    7,
    NULL,
    NOW()
  ),
  (
    'spec',
    'Spec',
    'Write detailed product requirements and specifications',
    8,
    NULL,
    NOW()
  ),
  (
    'story',
    'Story',
    'Break specifications into actionable user stories',
    9,
    NULL,
    NOW()
  ),
  (
    'pack',
    'Pack',
    'Assemble the complete Build Pack for development handoff',
    10,
    NULL,
    NOW()
  )
ON CONFLICT (id) DO UPDATE SET
  name = EXCLUDED.name,
  description = EXCLUDED.description,
  "order" = EXCLUDED."order",
  prompt_template = EXCLUDED.prompt_template;
