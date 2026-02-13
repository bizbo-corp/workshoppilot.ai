/**
 * Workshop Factory Helper
 *
 * Provides helper functions for E2E tests to create workshops and interact with the chat UI.
 * All selectors are based on the actual component structure inspected in:
 * - src/components/workshop/start-workshop-button.tsx
 * - src/components/workshop/chat-panel.tsx
 * - src/components/workshop/step-navigation.tsx
 */

import { Page, expect } from '@playwright/test';

/**
 * Create a new workshop via UI by clicking "Start Workshop" on the landing page.
 * Returns the session ID and full workshop URL.
 */
export async function createWorkshopViaUI(page: Page): Promise<{
  sessionId: string;
  workshopUrl: string;
}> {
  // Navigate to landing page
  await page.goto('/');

  // Click the "Start Workshop" button
  // The button contains text "Start Workshop" or "Setting up your workshop..." during loading
  const startButton = page.getByRole('button', { name: /start workshop/i });
  await startButton.click();

  // Wait for navigation to /workshop/{sessionId}/step/1
  await page.waitForURL(/\/workshop\/.*\/step\/1/, { timeout: 30000 });

  // Extract sessionId from URL
  const url = page.url();
  const match = url.match(/\/workshop\/([^/]+)\/step\/1/);
  if (!match) {
    throw new Error(`Failed to extract sessionId from URL: ${url}`);
  }

  const sessionId = match[1];
  const workshopUrl = url;

  return { sessionId, workshopUrl };
}

/**
 * Wait for the first AI greeting message to appear in the chat panel.
 * The AI auto-starts with a greeting when entering a step with no messages.
 * Timeout is 60s to account for cold starts and Gemini response time.
 */
export async function waitForAIGreeting(page: Page): Promise<void> {
  // Wait for an AI message bubble to appear
  // AI messages have a div with "AI" avatar and a muted background
  // Look for the first assistant message (not the loading state)
  await expect(
    page.locator('.prose').first()
  ).toBeVisible({ timeout: 60000 });
}

/**
 * Send a message in the chat input and wait for AI response.
 * @param page - Playwright page object
 * @param text - Message text to send
 */
export async function sendMessage(page: Page, text: string): Promise<void> {
  // Find the textarea input (placeholder: "Type your message...")
  const input = page.locator('textarea[placeholder*="Type your message"]');
  await input.fill(text);

  // Press Enter to submit (form submit)
  await input.press('Enter');

  // Wait for the AI to respond (loading indicator disappears and new message appears)
  // The loading indicator shows "AI is thinking..."
  await expect(
    page.locator('text=AI is thinking...').last()
  ).toBeVisible({ timeout: 5000 });

  await expect(
    page.locator('text=AI is thinking...').last()
  ).not.toBeVisible({ timeout: 120000 });
}

/**
 * Wait for a new AI response to appear in the chat.
 * Checks that the number of assistant messages has increased beyond existingCount.
 * @param page - Playwright page object
 * @param existingCount - Number of assistant messages before sending user message
 */
export async function waitForAIResponse(
  page: Page,
  existingCount: number
): Promise<void> {
  // Wait for the number of prose elements (AI messages) to exceed existingCount
  await page.waitForFunction(
    (count) => {
      const messages = document.querySelectorAll('.prose');
      return messages.length > count;
    },
    existingCount,
    { timeout: 120000 }
  );
}

/**
 * Click the "Next" button in step navigation to advance to the next step.
 * Waits for URL to change to the next step number.
 * @param page - Playwright page object
 */
export async function clickNextStep(page: Page): Promise<void> {
  // Extract current step number from URL
  const currentUrl = page.url();
  const match = currentUrl.match(/\/step\/(\d+)/);
  if (!match) {
    throw new Error(`Failed to extract step number from URL: ${currentUrl}`);
  }

  const currentStep = parseInt(match[1], 10);
  const nextStep = currentStep + 1;

  // Click the "Next" button (contains "Next" or "Skip to Next" text and ChevronRight icon)
  const nextButton = page.getByRole('button', { name: /next/i });
  await nextButton.click();

  // Wait for navigation to next step
  await page.waitForURL(new RegExp(`\\/step\\/${nextStep}$`), { timeout: 10000 });
}

/**
 * Get the count of assistant messages currently visible in the chat.
 * Useful for tracking message count before sending a new message.
 */
export async function getAssistantMessageCount(page: Page): Promise<number> {
  const messages = await page.locator('.prose').count();
  return messages;
}

/**
 * Check if a specific text appears in any assistant message.
 * Useful for verifying AI responses contain expected content.
 */
export async function hasAssistantMessageWithText(
  page: Page,
  text: string
): Promise<boolean> {
  const message = page.locator('.prose', { hasText: text });
  return (await message.count()) > 0;
}
