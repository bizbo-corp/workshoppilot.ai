/**
 * Seed script for step_definitions table
 * Inserts all 10 design thinking step definitions
 * Safe to run multiple times (uses onConflictDoUpdate)
 */

import { db } from '../src/db/client';
import { stepDefinitions } from '../src/db/schema';

const STEP_DEFINITIONS = [
  {
    id: 'empathize' as const,
    name: 'Empathize',
    description: 'Understand your users and their needs deeply through research and observation',
    order: 1,
    promptTemplate: null,
  },
  {
    id: 'define' as const,
    name: 'Define',
    description: 'Synthesize research into a clear problem statement',
    order: 2,
    promptTemplate: null,
  },
  {
    id: 'ideate' as const,
    name: 'Ideate',
    description: 'Generate a wide range of creative solutions',
    order: 3,
    promptTemplate: null,
  },
  {
    id: 'prototype' as const,
    name: 'Prototype',
    description: 'Create low-fidelity representations of your solutions',
    order: 4,
    promptTemplate: null,
  },
  {
    id: 'test' as const,
    name: 'Test',
    description: 'Validate prototypes with real users and gather feedback',
    order: 5,
    promptTemplate: null,
  },
  {
    id: 'prioritize' as const,
    name: 'Prioritize',
    description: 'Evaluate and rank features for your minimum viable product',
    order: 6,
    promptTemplate: null,
  },
  {
    id: 'architect' as const,
    name: 'Architect',
    description: 'Design the technical architecture and system structure',
    order: 7,
    promptTemplate: null,
  },
  {
    id: 'spec' as const,
    name: 'Spec',
    description: 'Write detailed product requirements and specifications',
    order: 8,
    promptTemplate: null,
  },
  {
    id: 'story' as const,
    name: 'Story',
    description: 'Break specifications into actionable user stories',
    order: 9,
    promptTemplate: null,
  },
  {
    id: 'pack' as const,
    name: 'Pack',
    description: 'Assemble the complete Build Pack for development handoff',
    order: 10,
    promptTemplate: null,
  },
];

async function seedStepDefinitions() {
  console.log('Seeding step definitions...');

  try {
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
