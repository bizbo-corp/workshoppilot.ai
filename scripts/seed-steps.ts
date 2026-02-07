/**
 * Seed script for step_definitions table
 * Inserts all 10 design thinking step definitions
 * Safe to run multiple times (uses onConflictDoUpdate)
 */

import { db } from '../src/db/client';
import { stepDefinitions } from '../src/db/schema';

const STEP_DEFINITIONS = [
  {
    id: 'challenge' as const,
    name: 'Challenge',
    description: 'Extract the core problem and draft a How Might We statement',
    order: 1,
    promptTemplate: null,
  },
  {
    id: 'stakeholder-mapping' as const,
    name: 'Stakeholder Mapping',
    description: 'Identify and prioritize the people and groups involved',
    order: 2,
    promptTemplate: null,
  },
  {
    id: 'user-research' as const,
    name: 'User Research',
    description: 'Gather insights through synthetic interviews and research',
    order: 3,
    promptTemplate: null,
  },
  {
    id: 'sense-making' as const,
    name: 'Research Sense Making',
    description: 'Synthesize research into themes, pains (5), and gains (5)',
    order: 4,
    promptTemplate: null,
  },
  {
    id: 'persona' as const,
    name: 'Persona Development',
    description: 'Create a research-grounded user persona',
    order: 5,
    promptTemplate: null,
  },
  {
    id: 'journey-mapping' as const,
    name: 'Journey Mapping',
    description: 'Map the current user experience and find the critical dip',
    order: 6,
    promptTemplate: null,
  },
  {
    id: 'reframe' as const,
    name: 'Reframing Challenge',
    description: 'Craft a focused How Might We statement based on insights',
    order: 7,
    promptTemplate: null,
  },
  {
    id: 'ideation' as const,
    name: 'Ideation',
    description: 'Generate ideas using Mind Mapping, Crazy 8s, Brain Writing, and Billboard Hero',
    order: 8,
    promptTemplate: null,
  },
  {
    id: 'concept' as const,
    name: 'Concept Development',
    description: 'Develop concept sheets with SWOT analysis, feasibility, and elevator pitch',
    order: 9,
    promptTemplate: null,
  },
  {
    id: 'validate' as const,
    name: 'Validate',
    description: 'Create flow diagrams, prototyping, PRD generation, and Build Pack export',
    order: 10,
    promptTemplate: null,
  },
];

async function seedStepDefinitions() {
  console.log('Seeding step definitions...');

  try {
    // Clean up old step definitions (development only - safe pre-launch)
    await db.delete(stepDefinitions);
    console.log('✓ Cleaned up old step definitions\n');

    for (const step of STEP_DEFINITIONS) {
      await db
        .insert(stepDefinitions)
        .values(step)
        .onConflictDoUpdate({
          target: stepDefinitions.id,
          set: {
            name: step.name,
            description: step.description,
            order: step.order,
            promptTemplate: step.promptTemplate,
          },
        });

      console.log(`✓ Seeded: ${step.id} - ${step.name}`);
    }

    console.log('\n✅ Successfully seeded all 10 step definitions');
    process.exit(0);
  } catch (error) {
    console.error('❌ Error seeding step definitions:', error);
    process.exit(1);
  }
}

seedStepDefinitions();
