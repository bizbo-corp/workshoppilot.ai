import { relations } from 'drizzle-orm';
import { users } from './users';
import { workshops, workshopMembers } from './workshops';
import { stepDefinitions, workshopSteps } from './steps';
import { sessions } from './sessions';
import { buildPacks } from './build-packs';

/**
 * Users relations
 * Note: User has many workshops via logical relationship between users.clerkUserId
 * and workshops.clerkUserId (text match, not a foreign key). This is intentional
 * to maintain flexibility with Clerk's user management.
 */
export const usersRelations = relations(users, ({ many }) => ({
  // Logical relation: workshops.clerkUserId matches users.clerkUserId
  workshops: many(workshops),
}));

/**
 * Workshops relations
 * Enables: db.query.workshops.findFirst({ with: { steps: true, members: true, ... } })
 */
export const workshopsRelations = relations(workshops, ({ many }) => ({
  steps: many(workshopSteps),
  members: many(workshopMembers),
  sessions: many(sessions),
  buildPacks: many(buildPacks),
}));

/**
 * Workshop Members relations
 */
export const workshopMembersRelations = relations(workshopMembers, ({ one }) => ({
  workshop: one(workshops, {
    fields: [workshopMembers.workshopId],
    references: [workshops.id],
  }),
}));

/**
 * Step Definitions relations
 */
export const stepDefinitionsRelations = relations(stepDefinitions, ({ many }) => ({
  workshopSteps: many(workshopSteps),
}));

/**
 * Workshop Steps relations
 */
export const workshopStepsRelations = relations(workshopSteps, ({ one }) => ({
  workshop: one(workshops, {
    fields: [workshopSteps.workshopId],
    references: [workshops.id],
  }),
  stepDefinition: one(stepDefinitions, {
    fields: [workshopSteps.stepId],
    references: [stepDefinitions.id],
  }),
}));

/**
 * Sessions relations
 */
export const sessionsRelations = relations(sessions, ({ one }) => ({
  workshop: one(workshops, {
    fields: [sessions.workshopId],
    references: [workshops.id],
  }),
}));

/**
 * Build Packs relations
 */
export const buildPacksRelations = relations(buildPacks, ({ one }) => ({
  workshop: one(workshops, {
    fields: [buildPacks.workshopId],
    references: [workshops.id],
  }),
}));
