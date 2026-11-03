import { test, expect, type Page } from '@playwright/test';

/**
 * The whole journey with the scripted facilitator: sign-in bypass, start a
 * workshop from one sentence, go through Setup and all four stages by
 * agreeing with the AI, and land on the summary.
 */

async function agree(page: Page) {
  // Wait for the facilitator's turn to finish; the box drops input while it is thinking.
  await expect(page.getByText('thinking', { exact: true })).toBeHidden();
  const box = page.getByPlaceholder('Reply, or work on the board');
  await box.fill('Yes, happy with that');
  await box.press('Enter');
  await expect(page.getByText('Yes, happy with that').last()).toBeVisible();
}

test('a workshop runs from idea to summary', async ({ page }) => {
  await page.goto('/dashboard');
  await page.getByPlaceholder(/booking app for mobile dog groomers/).fill('A booking app for mobile dog groomers who miss calls while grooming');
  await page.getByRole('button', { name: 'Start the workshop' }).click();
  await expect(page).toHaveURL(/\/w\/wks_/);

  // Greeting arrives without the user typing.
  await expect(page.getByText(/Welcome to Setup/)).toBeVisible();

  const stages = ['Setup', 'Discover', 'Define', 'Develop', 'Deliver'];
  for (const stage of stages) {
    await expect(page.locator(`[data-stage="${stage.toLowerCase()}"]`)).toBeVisible();
    // Turn one: the AI fills the fields and boards.
    await agree(page);
    await expect(page.getByText('Drafted. Happy with that, or change something?').last()).toBeVisible();
    // Turn two: agreeing completes the stage.
    await agree(page);
    if (stage !== 'Deliver') {
      await expect(page.getByText(`Welcome to ${stages[stages.indexOf(stage) + 1]}`)).toBeVisible();
    }
  }

  await expect(page.getByText('That is the workshop done.')).toBeVisible();
  await page.getByRole('link', { name: 'See the summary' }).click();
  await expect(page).toHaveURL(/\/summary$/);

  // The free summary writes itself; the score is waiting for the Verdict.
  await expect(page.getByRole('heading', { name: /Test the text-back/ })).toBeVisible();
  await expect(page.locator('[data-score="armed"]')).toBeVisible();
  await expect(page.getByText(/Get the Verdict|Buy credits/).first()).toBeVisible();
});

test('the user can add a sticky and the AI sees it', async ({ page }) => {
  await page.goto('/dashboard');
  await page.getByPlaceholder(/booking app for mobile dog groomers/).fill('A faster way to onboard new staff at a vet clinic');
  await page.getByRole('button', { name: 'Start the workshop' }).click();
  await expect(page.getByText(/Welcome to Setup/)).toBeVisible();
  await agree(page);
  await agree(page);
  await expect(page.locator('[data-stage="discover"]')).toBeVisible();

  await page.getByRole('button', { name: 'Add to Core' }).click();
  const input = page.locator('[data-add-input]');
  await input.fill('Practice manager');
  await input.press('Enter');
  const sticky = page.locator('[data-item-id][data-zone="core"]', { hasText: 'Practice manager' });
  await expect(sticky).toBeVisible();

  // The sticky survives a reload because it is an event, not client state.
  await page.reload();
  await expect(page.locator('[data-item-id][data-zone="core"]', { hasText: 'Practice manager' })).toBeVisible();
});
