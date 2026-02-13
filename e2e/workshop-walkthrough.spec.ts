/**
 * Workshop Walkthrough E2E Test
 *
 * Tests the complete happy-path workshop flow from creation through all 10 steps.
 * Uses real Gemini API, real database, and real browser interactions.
 * No mocks, no seed data - creates a fresh workshop and walks forward.
 *
 * Test approach:
 * - Single serial test suite (page state persists across steps)
 * - Each step sends contextual user input and validates AI response
 * - Validates step transitions via Next button
 * - No back/revise scenarios (happy path only)
 *
 * Prerequisites:
 * - Dev server running with BYPASS_AUTH=true (handled by playwright.config.ts)
 * - Gemini API key configured in .env.local
 * - Database accessible (local Neon or test instance)
 */

import { test, expect, type Page } from '@playwright/test';

// Set overall test timeout to 20 minutes for the full walkthrough
test.setTimeout(1200000);

test.describe.serial('Workshop Walkthrough - All 10 Steps', () => {
  let page: Page;
  let sessionId: string;

  test.beforeAll(async ({ browser }) => {
    page = await browser.newPage();
  });

  test.afterAll(async () => {
    await page.close();
  });

  test('Create workshop and land on Step 1', async () => {
    // Navigate to landing page
    await page.goto('/');

    // Click the "Start Workshop" button
    const startButton = page.getByRole('button', { name: /start workshop/i });
    await startButton.click();

    // Wait for navigation to /workshop/{sessionId}/step/1
    await page.waitForURL(/\/workshop\/.*\/step\/1/, { timeout: 30000 });

    // Extract sessionId from URL
    const url = page.url();
    const match = url.match(/\/workshop\/([^/]+)\/step\/1/);
    expect(match).toBeTruthy();
    sessionId = match![1];

    // Wait for the AI greeting to appear (auto-start trigger)
    // AI messages are wrapped in .prose class
    await expect(page.locator('.prose').first()).toBeVisible({ timeout: 60000 });

    // Verify we're on Step 1
    expect(page.url()).toContain('/step/1');
  });

  test('Step 1: Challenge - Define problem and HMW', async () => {
    // Verify we're on step 1
    expect(page.url()).toContain('/step/1');

    // Wait for initial AI greeting (should already be visible from previous test)
    await expect(page.locator('.prose').first()).toBeVisible({ timeout: 60000 });

    // Count existing assistant messages
    const existingCount = await page.locator('.prose').count();

    // Type contextual message into textarea
    const input = page.locator('textarea[placeholder*="Type your message"]');
    await input.fill('I want to build a pet care app that helps busy pet owners manage their pets\' daily routines and health needs');

    // Submit by pressing Enter
    await input.press('Enter');

    // Wait for AI to start thinking
    await expect(page.locator('text=AI is thinking...').last()).toBeVisible({ timeout: 5000 });

    // Wait for AI response to complete
    await expect(page.locator('text=AI is thinking...').last()).not.toBeVisible({ timeout: 90000 });

    // Verify new AI message appeared
    await expect(page.locator('.prose').nth(existingCount)).toBeVisible({ timeout: 5000 });

    // Verify the response has content
    const newMessage = page.locator('.prose').nth(existingCount);
    const messageText = await newMessage.textContent();
    expect(messageText).toBeTruthy();
    expect(messageText!.length).toBeGreaterThan(0);

    // Click Next button to advance to Step 2
    const nextButton = page.getByRole('button', { name: /next|skip to next/i });
    await nextButton.click();

    // Wait for navigation to step 2
    await page.waitForURL(/\/step\/2$/, { timeout: 30000 });

    // Small delay for hydration
    await page.waitForTimeout(2000);
  });

  test('Step 2: Stakeholder Mapping - Identify key people and groups', async () => {
    // Verify we're on step 2
    expect(page.url()).toContain('/step/2');

    // Wait for AI greeting
    await expect(page.locator('.prose').first()).toBeVisible({ timeout: 60000 });

    // Count existing messages
    const existingCount = await page.locator('.prose').count();

    // Send contextual message
    const input = page.locator('textarea[placeholder*="Type your message"]');
    await input.fill('The main stakeholders are pet owners, veterinarians, pet sitters, and pet supply companies');
    await input.press('Enter');

    // Wait for AI thinking and response
    await expect(page.locator('text=AI is thinking...').last()).toBeVisible({ timeout: 5000 });
    await expect(page.locator('text=AI is thinking...').last()).not.toBeVisible({ timeout: 90000 });

    // Verify new message
    await expect(page.locator('.prose').nth(existingCount)).toBeVisible({ timeout: 5000 });
    const messageText = await page.locator('.prose').nth(existingCount).textContent();
    expect(messageText!.length).toBeGreaterThan(0);

    // Advance to Step 3
    await page.getByRole('button', { name: /next|skip to next/i }).click();
    await page.waitForURL(/\/step\/3$/, { timeout: 30000 });
    await page.waitForTimeout(2000);
  });

  test('Step 3: User Research - Conduct synthetic interviews', async () => {
    // Verify we're on step 3
    expect(page.url()).toContain('/step/3');

    // Wait for AI greeting
    await expect(page.locator('.prose').first()).toBeVisible({ timeout: 60000 });

    // Count existing messages
    const existingCount = await page.locator('.prose').count();

    // Send contextual message
    const input = page.locator('textarea[placeholder*="Type your message"]');
    await input.fill('I\'d like to interview busy professionals who own multiple pets and struggle with keeping up with vet appointments and feeding schedules');
    await input.press('Enter');

    // Wait for AI response
    await expect(page.locator('text=AI is thinking...').last()).toBeVisible({ timeout: 5000 });
    await expect(page.locator('text=AI is thinking...').last()).not.toBeVisible({ timeout: 90000 });

    // Verify new message
    await expect(page.locator('.prose').nth(existingCount)).toBeVisible({ timeout: 5000 });
    const messageText = await page.locator('.prose').nth(existingCount).textContent();
    expect(messageText!.length).toBeGreaterThan(0);

    // Advance to Step 4
    await page.getByRole('button', { name: /next|skip to next/i }).click();
    await page.waitForURL(/\/step\/4$/, { timeout: 30000 });
    await page.waitForTimeout(2000);
  });

  test('Step 4: Sense Making - Synthesize research themes', async () => {
    // Verify we're on step 4
    expect(page.url()).toContain('/step/4');

    // Wait for AI greeting
    await expect(page.locator('.prose').first()).toBeVisible({ timeout: 60000 });

    // Count existing messages
    const existingCount = await page.locator('.prose').count();

    // Send contextual message
    const input = page.locator('textarea[placeholder*="Type your message"]');
    await input.fill('The key themes I see are time management struggles, anxiety about pet health, and desire for automated reminders');
    await input.press('Enter');

    // Wait for AI response
    await expect(page.locator('text=AI is thinking...').last()).toBeVisible({ timeout: 5000 });
    await expect(page.locator('text=AI is thinking...').last()).not.toBeVisible({ timeout: 90000 });

    // Verify new message
    await expect(page.locator('.prose').nth(existingCount)).toBeVisible({ timeout: 5000 });
    const messageText = await page.locator('.prose').nth(existingCount).textContent();
    expect(messageText!.length).toBeGreaterThan(0);

    // Advance to Step 5
    await page.getByRole('button', { name: /next|skip to next/i }).click();
    await page.waitForURL(/\/step\/5$/, { timeout: 30000 });
    await page.waitForTimeout(2000);
  });

  test('Step 5: Persona - Create user persona', async () => {
    // Verify we're on step 5
    expect(page.url()).toContain('/step/5');

    // Wait for AI greeting
    await expect(page.locator('.prose').first()).toBeVisible({ timeout: 60000 });

    // Count existing messages
    const existingCount = await page.locator('.prose').count();

    // Send contextual message
    const input = page.locator('textarea[placeholder*="Type your message"]');
    await input.fill('Based on our research, the primary persona would be a working professional aged 28-35 who owns 2-3 pets');
    await input.press('Enter');

    // Wait for AI response
    await expect(page.locator('text=AI is thinking...').last()).toBeVisible({ timeout: 5000 });
    await expect(page.locator('text=AI is thinking...').last()).not.toBeVisible({ timeout: 90000 });

    // Verify new message
    await expect(page.locator('.prose').nth(existingCount)).toBeVisible({ timeout: 5000 });
    const messageText = await page.locator('.prose').nth(existingCount).textContent();
    expect(messageText!.length).toBeGreaterThan(0);

    // Advance to Step 6
    await page.getByRole('button', { name: /next|skip to next/i }).click();
    await page.waitForURL(/\/step\/6$/, { timeout: 30000 });
    await page.waitForTimeout(2000);
  });

  test('Step 6: Journey Mapping - Map user experience and find the dip', async () => {
    // Verify we're on step 6
    expect(page.url()).toContain('/step/6');

    // Wait for AI greeting
    await expect(page.locator('.prose').first()).toBeVisible({ timeout: 60000 });

    // Count existing messages
    const existingCount = await page.locator('.prose').count();

    // Send contextual message
    const input = page.locator('textarea[placeholder*="Type your message"]');
    await input.fill('The user\'s journey starts when they wake up and need to manage morning feeding, then continues through their workday worrying about their pets');
    await input.press('Enter');

    // Wait for AI response
    await expect(page.locator('text=AI is thinking...').last()).toBeVisible({ timeout: 5000 });
    await expect(page.locator('text=AI is thinking...').last()).not.toBeVisible({ timeout: 90000 });

    // Verify new message
    await expect(page.locator('.prose').nth(existingCount)).toBeVisible({ timeout: 5000 });
    const messageText = await page.locator('.prose').nth(existingCount).textContent();
    expect(messageText!.length).toBeGreaterThan(0);

    // Advance to Step 7
    await page.getByRole('button', { name: /next|skip to next/i }).click();
    await page.waitForURL(/\/step\/7$/, { timeout: 30000 });
    await page.waitForTimeout(2000);
  });

  test('Step 7: Reframe - Craft focused HMW statement', async () => {
    // Verify we're on step 7
    expect(page.url()).toContain('/step/7');

    // Wait for AI greeting
    await expect(page.locator('.prose').first()).toBeVisible({ timeout: 60000 });

    // Count existing messages
    const existingCount = await page.locator('.prose').count();

    // Send contextual message
    const input = page.locator('textarea[placeholder*="Type your message"]');
    await input.fill('I\'d like to focus the HMW on making pet care routine management effortless for multi-pet owners');
    await input.press('Enter');

    // Wait for AI response
    await expect(page.locator('text=AI is thinking...').last()).toBeVisible({ timeout: 5000 });
    await expect(page.locator('text=AI is thinking...').last()).not.toBeVisible({ timeout: 90000 });

    // Verify new message
    await expect(page.locator('.prose').nth(existingCount)).toBeVisible({ timeout: 5000 });
    const messageText = await page.locator('.prose').nth(existingCount).textContent();
    expect(messageText!.length).toBeGreaterThan(0);

    // Advance to Step 8
    await page.getByRole('button', { name: /next|skip to next/i }).click();
    await page.waitForURL(/\/step\/8$/, { timeout: 30000 });
    await page.waitForTimeout(2000);
  });

  test('Step 8: Ideation - Generate ideas with Mind Mapping', async () => {
    // Verify we're on step 8
    expect(page.url()).toContain('/step/8');

    // Wait for AI greeting
    await expect(page.locator('.prose').first()).toBeVisible({ timeout: 60000 });

    // Count existing messages
    const existingCount = await page.locator('.prose').count();

    // Send contextual message
    const input = page.locator('textarea[placeholder*="Type your message"]');
    await input.fill('Some initial ideas: smart feeding schedule optimizer, vet appointment coordinator with reminders, pet health dashboard, community care sharing platform');
    await input.press('Enter');

    // Wait for AI response
    await expect(page.locator('text=AI is thinking...').last()).toBeVisible({ timeout: 5000 });
    await expect(page.locator('text=AI is thinking...').last()).not.toBeVisible({ timeout: 90000 });

    // Verify new message
    await expect(page.locator('.prose').nth(existingCount)).toBeVisible({ timeout: 5000 });
    const messageText = await page.locator('.prose').nth(existingCount).textContent();
    expect(messageText!.length).toBeGreaterThan(0);

    // Advance to Step 9
    await page.getByRole('button', { name: /next|skip to next/i }).click();
    await page.waitForURL(/\/step\/9$/, { timeout: 30000 });
    await page.waitForTimeout(2000);
  });

  test('Step 9: Concept - Develop concepts with SWOT analysis', async () => {
    // Verify we're on step 9
    expect(page.url()).toContain('/step/9');

    // Wait for AI greeting
    await expect(page.locator('.prose').first()).toBeVisible({ timeout: 60000 });

    // Count existing messages
    const existingCount = await page.locator('.prose').count();

    // Send contextual message
    const input = page.locator('textarea[placeholder*="Type your message"]');
    await input.fill('Let\'s develop the smart feeding schedule optimizer concept further with SWOT analysis');
    await input.press('Enter');

    // Wait for AI response
    await expect(page.locator('text=AI is thinking...').last()).toBeVisible({ timeout: 5000 });
    await expect(page.locator('text=AI is thinking...').last()).not.toBeVisible({ timeout: 90000 });

    // Verify new message
    await expect(page.locator('.prose').nth(existingCount)).toBeVisible({ timeout: 5000 });
    const messageText = await page.locator('.prose').nth(existingCount).textContent();
    expect(messageText!.length).toBeGreaterThan(0);

    // Advance to Step 10
    await page.getByRole('button', { name: /next|skip to next/i }).click();
    await page.waitForURL(/\/step\/10$/, { timeout: 30000 });
    await page.waitForTimeout(2000);
  });

  test('Step 10: Validate - Create flow diagrams and PRD', async () => {
    // Verify we're on step 10 (last step)
    expect(page.url()).toContain('/step/10');

    // Wait for AI greeting
    await expect(page.locator('.prose').first()).toBeVisible({ timeout: 60000 });

    // Count existing messages
    const existingCount = await page.locator('.prose').count();

    // Send contextual message
    const input = page.locator('textarea[placeholder*="Type your message"]');
    await input.fill('Let\'s create a user flow for the core feeding schedule feature and outline the key screens');
    await input.press('Enter');

    // Wait for AI response
    await expect(page.locator('text=AI is thinking...').last()).toBeVisible({ timeout: 5000 });
    await expect(page.locator('text=AI is thinking...').last()).not.toBeVisible({ timeout: 90000 });

    // Verify new message
    await expect(page.locator('.prose').nth(existingCount)).toBeVisible({ timeout: 5000 });
    const messageText = await page.locator('.prose').nth(existingCount).textContent();
    expect(messageText!.length).toBeGreaterThan(0);

    // On Step 10, there is no Next button (it's the last step)
    // Verify Next button is NOT present
    const nextButton = page.getByRole('button', { name: /^next$/i });
    await expect(nextButton).not.toBeVisible();

    // Test complete - workshop walkthrough finished successfully!
  });
});
