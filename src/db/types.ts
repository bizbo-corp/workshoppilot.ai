import { InferSelectModel, InferInsertModel } from 'drizzle-orm';
import {
  users,
  workshops,
  workshopMembers,
  stepDefinitions,
  workshopSteps,
  sessions,
  buildPacks,
} from './schema';

/**
 * Inferred TypeScript types from Drizzle schema
 * Used throughout the app for type-safe database operations
 */

// User types
export type User = InferSelectModel<typeof users>;
export type NewUser = InferInsertModel<typeof users>;

// Workshop types
export type Workshop = InferSelectModel<typeof workshops>;
export type NewWorkshop = InferInsertModel<typeof workshops>;

// Workshop Member types
export type WorkshopMember = InferSelectModel<typeof workshopMembers>;
export type NewWorkshopMember = InferInsertModel<typeof workshopMembers>;

// Step Definition types
export type StepDefinition = InferSelectModel<typeof stepDefinitions>;
export type NewStepDefinition = InferInsertModel<typeof stepDefinitions>;

// Workshop Step types
export type WorkshopStep = InferSelectModel<typeof workshopSteps>;
export type NewWorkshopStep = InferInsertModel<typeof workshopSteps>;

// Session types
export type Session = InferSelectModel<typeof sessions>;
export type NewSession = InferInsertModel<typeof sessions>;

// Build Pack types
export type BuildPack = InferSelectModel<typeof buildPacks>;
export type NewBuildPack = InferInsertModel<typeof buildPacks>;
