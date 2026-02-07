import { google } from '@ai-sdk/google';

/**
 * Gemini model configuration for chat
 * Using gemini-2.0-flash for fast, cost-effective MVP responses
 */
export const chatModel = google('gemini-2.0-flash');

/**
 * Generic system prompt for design thinking facilitation
 * Step-specific prompts will be added in MVP 1.0
 */
export const SYSTEM_PROMPT =
  'You are a helpful design thinking facilitator. Guide the user through the current step of the design thinking process. Be encouraging, ask probing questions, and help them think deeply about their ideas. Keep responses concise and actionable.';
