import { relations } from 'drizzle-orm';
import { users } from './users';
import { workshops, workshopMembers } from './workshops';
import { stepDefinitions, workshopSteps } from './steps';
import { stepArtifacts } from './step-artifacts';
import { stepSummaries } from './step-summaries';
import { sessions } from './sessions';
import { buildPacks } from './build-packs';
import { chatMessages } from './chat-messages';
import { aiUsageEvents } from './ai-usage-events';

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
  aiUsageEvents: many(aiUsageEvents),
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
export const workshopStepsRelations = relations(workshopSteps, ({ one, many }) => ({
  workshop: one(workshops, {
    fields: [workshopSteps.workshopId],
    references: [workshops.id],
  }),
  stepDefinition: one(stepDefinitions, {
    fields: [workshopSteps.stepId],
    references: [stepDefinitions.id],
  }),
  artifacts: many(stepArtifacts),
  summaries: many(stepSummaries),
}));

/**
 * Sessions relations
 */
export const sessionsRelations = relations(sessions, ({ one, many }) => ({
  workshop: one(workshops, {
    fields: [sessions.workshopId],
    references: [workshops.id],
  }),
  chatMessages: many(chatMessages),
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

/**
 * Chat Messages relations
 */
export const chatMessagesRelations = relations(chatMessages, ({ one }) => ({
  session: one(sessions, {
    fields: [chatMessages.sessionId],
    references: [sessions.id],
  }),
}));

/**
 * Step Artifacts relations
 */
export const stepArtifactsRelations = relations(stepArtifacts, ({ one }) => ({
  workshopStep: one(workshopSteps, {
    fields: [stepArtifacts.workshopStepId],
    references: [workshopSteps.id],
  }),
}));

/**
 * Step Summaries relations
 */
export const stepSummariesRelations = relations(stepSummaries, ({ one }) => ({
  workshopStep: one(workshopSteps, {
    fields: [stepSummaries.workshopStepId],
    references: [workshopSteps.id],
  }),
}));

/**
 * AI Usage Events relations
 */
export const aiUsageEventsRelations = relations(aiUsageEvents, ({ one }) => ({
  workshop: one(workshops, {
    fields: [aiUsageEvents.workshopId],
    references: [workshops.id],
  }),
}));
