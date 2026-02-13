/**
 * Workshop Walkthrough E2E Test
 *
 * Tests the complete happy-path workshop flow from creation through all 10 steps.
 * Uses real Gemini API, real database, and real browser interactions.
 * No mocks, no seed data - creates a fresh workshop and walks forward.
 *
 * Test approach:
 * - Single long test that walks through all 10 steps sequentially
 * - Each step sends contextual user input and validates AI response
 * - Validates step transitions via Next button
 * - No back/revise scenarios (happy path only)
 *
 * Prerequisites:
 * - Dev server running with BYPASS_AUTH=true (handled by playwright.config.ts)
 * - Gemini API key configured in .env.local
 * - Database accessible (local Neon or test instance)
 */

import { test, expect } from '@playwright/test';

// Set overall test timeout to 20 minutes for the full walkthrough
test.setTimeout(1200000);

test.describe('Workshop Walkthrough', () => {
  test('Complete workshop from creation through all 10 steps', async ({ page }) => {
    // Log console errors
    page.on('console', msg => {
      if (msg.type() === 'error') {
        console.log('Browser console error:', msg.text());
      }
    });

    // Log page errors
    page.on('pageerror', error => {
      console.log('Page error:', error.message);
    });

    let sessionId: string;

    // ===== CREATE WORKSHOP AND LAND ON STEP 1 =====
    console.log('\n=== Creating workshop ===');
    await page.goto('/');

    const startButton = page.getByRole('button', { name: /start workshop/i });
    await startButton.click();

    await page.waitForURL(/\/workshop\/.*\/step\/1/, { timeout: 30000 });

    const url = page.url();
    const match = url.match(/\/workshop\/([^/]+)\/step\/1/);
    expect(match).toBeTruthy();
    sessionId = match![1];
    console.log('Workshop created with session ID:', sessionId);

    // Wait for the AI greeting
    await expect(page.locator('.prose').first()).toBeVisible({ timeout: 60000 });
    console.log('AI greeting received on Step 1');

    // ===== STEP 1: CHALLENGE =====
    console.log('\n=== Step 1: Challenge ===');
    const step1ExistingCount = await page.locator('.prose').count();

    const step1Input = page.locator('textarea[placeholder*="Type your message"]');
    await step1Input.fill('I want to build a pet care app that helps busy pet owners manage their pets\' daily routines and health needs');
    await step1Input.press('Enter');

    // Wait for AI response
    await expect(page.locator('text=AI is thinking...').last()).toBeVisible({ timeout: 5000 });
    await expect(page.locator('text=AI is thinking...').last()).not.toBeVisible({ timeout: 90000 });
    await expect(page.locator('.prose').nth(step1ExistingCount)).toBeVisible({ timeout: 5000 });
    console.log('AI response received on Step 1');

    // Navigate to Step 2
    await page.screenshot({ path: 'test-results/before-click-next.png', fullPage: true });
    const step1NextButton = page.getByRole('button', { name: /^(Next|Skip to Next)$/i });
    await expect(step1NextButton).toBeVisible();
    await expect(step1NextButton).toBeEnabled();
    const buttonText = await step1NextButton.textContent();
    const isDisabled = await step1NextButton.isDisabled();
    console.log('Next button - text:', buttonText, 'disabled:', isDisabled);

    // Force click to ensure it triggers even if something is overlaying
    await step1NextButton.click({ force: true });
    console.log('Button clicked (forced), current URL:', page.url());

    // Wait a bit to see if navigation is delayed
    await page.waitForTimeout(5000);
    console.log('After 5s wait, current URL:', page.url());

    await page.waitForURL(/\/step\/2$/, { timeout: 60000 });
    await page.waitForTimeout(2000);
    console.log('Navigated to Step 2');

    // ===== STEP 2: STAKEHOLDER MAPPING =====
    console.log('\n=== Step 2: Stakeholder Mapping ===');
    await expect(page.locator('.prose').first()).toBeVisible({ timeout: 60000 });
    const step2ExistingCount = await page.locator('.prose').count();

    const step2Input = page.locator('textarea[placeholder*="Type your message"]');
    await step2Input.fill('The main stakeholders are pet owners, veterinarians, pet sitters, and pet supply companies');
    await step2Input.press('Enter');

    await expect(page.locator('text=AI is thinking...').last()).toBeVisible({ timeout: 5000 });
    await expect(page.locator('text=AI is thinking...').last()).not.toBeVisible({ timeout: 90000 });
    await expect(page.locator('.prose').nth(step2ExistingCount)).toBeVisible({ timeout: 5000 });
    console.log('AI response received on Step 2');

    await page.getByRole('button', { name: /^(Next|Skip to Next)$/i }).click();
    await page.waitForURL(/\/step\/3$/, { timeout: 30000 });
    await page.waitForTimeout(2000);
    console.log('Navigated to Step 3');

    // ===== STEP 3: USER RESEARCH =====
    console.log('\n=== Step 3: User Research ===');
    await expect(page.locator('.prose').first()).toBeVisible({ timeout: 60000 });
    const step3ExistingCount = await page.locator('.prose').count();

    const step3Input = page.locator('textarea[placeholder*="Type your message"]');
    await step3Input.fill('I\'d like to interview busy professionals who own multiple pets and struggle with keeping up with vet appointments and feeding schedules');
    await step3Input.press('Enter');

    await expect(page.locator('text=AI is thinking...').last()).toBeVisible({ timeout: 5000 });
    await expect(page.locator('text=AI is thinking...').last()).not.toBeVisible({ timeout: 90000 });
    await expect(page.locator('.prose').nth(step3ExistingCount)).toBeVisible({ timeout: 5000 });
    console.log('AI response received on Step 3');

    await page.getByRole('button', { name: /^(Next|Skip to Next)$/i }).click();
    await page.waitForURL(/\/step\/4$/, { timeout: 30000 });
    await page.waitForTimeout(2000);
    console.log('Navigated to Step 4');

    // ===== STEP 4: SENSE MAKING =====
    console.log('\n=== Step 4: Sense Making ===');
    await expect(page.locator('.prose').first()).toBeVisible({ timeout: 60000 });
    const step4ExistingCount = await page.locator('.prose').count();

    const step4Input = page.locator('textarea[placeholder*="Type your message"]');
    await step4Input.fill('The key themes I see are time management struggles, anxiety about pet health, and desire for automated reminders');
    await step4Input.press('Enter');

    await expect(page.locator('text=AI is thinking...').last()).toBeVisible({ timeout: 5000 });
    await expect(page.locator('text=AI is thinking...').last()).not.toBeVisible({ timeout: 90000 });
    await expect(page.locator('.prose').nth(step4ExistingCount)).toBeVisible({ timeout: 5000 });
    console.log('AI response received on Step 4');

    await page.getByRole('button', { name: /^(Next|Skip to Next)$/i }).click();
    await page.waitForURL(/\/step\/5$/, { timeout: 30000 });
    await page.waitForTimeout(2000);
    console.log('Navigated to Step 5');

    // ===== STEP 5: PERSONA =====
    console.log('\n=== Step 5: Persona ===');
    await expect(page.locator('.prose').first()).toBeVisible({ timeout: 60000 });
    const step5ExistingCount = await page.locator('.prose').count();

    const step5Input = page.locator('textarea[placeholder*="Type your message"]');
    await step5Input.fill('Based on our research, the primary persona would be a working professional aged 28-35 who owns 2-3 pets');
    await step5Input.press('Enter');

    await expect(page.locator('text=AI is thinking...').last()).toBeVisible({ timeout: 5000 });
    await expect(page.locator('text=AI is thinking...').last()).not.toBeVisible({ timeout: 90000 });
    await expect(page.locator('.prose').nth(step5ExistingCount)).toBeVisible({ timeout: 5000 });
    console.log('AI response received on Step 5');

    await page.getByRole('button', { name: /^(Next|Skip to Next)$/i }).click();
    await page.waitForURL(/\/step\/6$/, { timeout: 30000 });
    await page.waitForTimeout(2000);
    console.log('Navigated to Step 6');

    // ===== STEP 6: JOURNEY MAPPING =====
    console.log('\n=== Step 6: Journey Mapping ===');
    await expect(page.locator('.prose').first()).toBeVisible({ timeout: 60000 });
    const step6ExistingCount = await page.locator('.prose').count();

    const step6Input = page.locator('textarea[placeholder*="Type your message"]');
    await step6Input.fill('The user\'s journey starts when they wake up and need to manage morning feeding, then continues through their workday worrying about their pets');
    await step6Input.press('Enter');

    await expect(page.locator('text=AI is thinking...').last()).toBeVisible({ timeout: 5000 });
    await expect(page.locator('text=AI is thinking...').last()).not.toBeVisible({ timeout: 90000 });
    await expect(page.locator('.prose').nth(step6ExistingCount)).toBeVisible({ timeout: 5000 });
    console.log('AI response received on Step 6');

    await page.getByRole('button', { name: /^(Next|Skip to Next)$/i }).click();
    await page.waitForURL(/\/step\/7$/, { timeout: 30000 });
    await page.waitForTimeout(2000);
    console.log('Navigated to Step 7');

    // ===== STEP 7: REFRAME =====
    console.log('\n=== Step 7: Reframe ===');
    await expect(page.locator('.prose').first()).toBeVisible({ timeout: 60000 });
    const step7ExistingCount = await page.locator('.prose').count();

    const step7Input = page.locator('textarea[placeholder*="Type your message"]');
    await step7Input.fill('I\'d like to focus the HMW on making pet care routine management effortless for multi-pet owners');
    await step7Input.press('Enter');

    await expect(page.locator('text=AI is thinking...').last()).toBeVisible({ timeout: 5000 });
    await expect(page.locator('text=AI is thinking...').last()).not.toBeVisible({ timeout: 90000 });
    await expect(page.locator('.prose').nth(step7ExistingCount)).toBeVisible({ timeout: 5000 });
    console.log('AI response received on Step 7');

    await page.getByRole('button', { name: /^(Next|Skip to Next)$/i }).click();
    await page.waitForURL(/\/step\/8$/, { timeout: 30000 });
    await page.waitForTimeout(2000);
    console.log('Navigated to Step 8');

    // ===== STEP 8: IDEATION =====
    console.log('\n=== Step 8: Ideation ===');
    await expect(page.locator('.prose').first()).toBeVisible({ timeout: 60000 });
    const step8ExistingCount = await page.locator('.prose').count();

    const step8Input = page.locator('textarea[placeholder*="Type your message"]');
    await step8Input.fill('Some initial ideas: smart feeding schedule optimizer, vet appointment coordinator with reminders, pet health dashboard, community care sharing platform');
    await step8Input.press('Enter');

    await expect(page.locator('text=AI is thinking...').last()).toBeVisible({ timeout: 5000 });
    await expect(page.locator('text=AI is thinking...').last()).not.toBeVisible({ timeout: 90000 });
    await expect(page.locator('.prose').nth(step8ExistingCount)).toBeVisible({ timeout: 5000 });
    console.log('AI response received on Step 8');

    await page.getByRole('button', { name: /^(Next|Skip to Next)$/i }).click();
    await page.waitForURL(/\/step\/9$/, { timeout: 30000 });
    await page.waitForTimeout(2000);
    console.log('Navigated to Step 9');

    // ===== STEP 9: CONCEPT =====
    console.log('\n=== Step 9: Concept ===');
    await expect(page.locator('.prose').first()).toBeVisible({ timeout: 60000 });
    const step9ExistingCount = await page.locator('.prose').count();

    const step9Input = page.locator('textarea[placeholder*="Type your message"]');
    await step9Input.fill('Let\'s develop the smart feeding schedule optimizer concept further with SWOT analysis');
    await step9Input.press('Enter');

    await expect(page.locator('text=AI is thinking...').last()).toBeVisible({ timeout: 5000 });
    await expect(page.locator('text=AI is thinking...').last()).not.toBeVisible({ timeout: 90000 });
    await expect(page.locator('.prose').nth(step9ExistingCount)).toBeVisible({ timeout: 5000 });
    console.log('AI response received on Step 9');

    await page.getByRole('button', { name: /^(Next|Skip to Next)$/i }).click();
    await page.waitForURL(/\/step\/10$/, { timeout: 30000 });
    await page.waitForTimeout(2000);
    console.log('Navigated to Step 10');

    // ===== STEP 10: VALIDATE =====
    console.log('\n=== Step 10: Validate ===');
    await expect(page.locator('.prose').first()).toBeVisible({ timeout: 60000 });
    const step10ExistingCount = await page.locator('.prose').count();

    const step10Input = page.locator('textarea[placeholder*="Type your message"]');
    await step10Input.fill('Let\'s create a user flow for the core feeding schedule feature and outline the key screens');
    await step10Input.press('Enter');

    await expect(page.locator('text=AI is thinking...').last()).toBeVisible({ timeout: 5000 });
    await expect(page.locator('text=AI is thinking...').last()).not.toBeVisible({ timeout: 90000 });
    await expect(page.locator('.prose').nth(step10ExistingCount)).toBeVisible({ timeout: 5000 });
    console.log('AI response received on Step 10');

    // Verify no Next button on last step
    const nextButton = page.getByRole('button', { name: /^Next$/i });
    await expect(nextButton).not.toBeVisible();
    console.log('Confirmed: No Next button on Step 10 (last step)');

    console.log('\n=== Workshop walkthrough complete! ===');
  });
});
