import { test, expect, type Page } from '@playwright/test';

/**
 * Visual check, code edition: every sticky sits inside its zone, nothing
 * overlaps by more than a fifth, and every zone label is on screen. Runs
 * on a workshop driven to Define so the rings, the empathy map and the
 * journey strip are all populated.
 */

interface Box {
  x: number;
  y: number;
  w: number;
  h: number;
}

async function boxes(page: Page, selector: string): Promise<{ id: string; zone: string; box: Box }[]> {
  return page.$$eval(selector, (els) =>
    els.map((el) => {
      const r = el.getBoundingClientRect();
      return {
        id: el.getAttribute('data-item-id') ?? el.getAttribute('data-zone-container') ?? '',
        zone: el.getAttribute('data-zone') ?? el.getAttribute('data-zone-container') ?? '',
        box: { x: r.x, y: r.y, w: r.width, h: r.height },
      };
    }),
  );
}

function inside(inner: Box, outer: Box, tolerance = 1): boolean {
  return (
    inner.x >= outer.x - tolerance &&
    inner.y >= outer.y - tolerance &&
    inner.x + inner.w <= outer.x + outer.w + tolerance &&
    inner.y + inner.h <= outer.y + outer.h + tolerance
  );
}

function overlapRatio(a: Box, b: Box): number {
  const x = Math.max(0, Math.min(a.x + a.w, b.x + b.w) - Math.max(a.x, b.x));
  const y = Math.max(0, Math.min(a.y + a.h, b.y + b.h) - Math.max(a.y, b.y));
  const inter = x * y;
  return inter / Math.min(a.w * a.h, b.w * b.h);
}

async function agree(page: Page) {
  await expect(page.getByText('thinking', { exact: true })).toBeHidden();
  const box = page.getByPlaceholder('Reply, or work on the board');
  await box.fill('Yes, happy with that');
  await box.press('Enter');
  await expect(page.getByText('Yes, happy with that').last()).toBeVisible();
}

async function checkBoards(page: Page) {
  const zones = await boxes(page, '[data-zone-container]');
  const items = await boxes(page, '[data-item-id]');
  expect(items.length).toBeGreaterThan(0);

  for (const it of items) {
    const zone = zones.find((z) => z.id === it.zone);
    expect(zone, `zone ${it.zone} for item ${it.id}`).toBeTruthy();
    expect(inside(it.box, zone!.box), `item ${it.id} spills out of ${it.zone}`).toBe(true);
    expect(it.box.w, `item ${it.id} has no width`).toBeGreaterThan(20);
    expect(it.box.h, `item ${it.id} has no height`).toBeGreaterThan(10);
  }

  for (let i = 0; i < items.length; i++) {
    for (let j = i + 1; j < items.length; j++) {
      const r = overlapRatio(items[i].box, items[j].box);
      expect(r, `${items[i].id} overlaps ${items[j].id} by ${(r * 100).toFixed(0)}%`).toBeLessThanOrEqual(0.2);
    }
  }

  // Zone labels are rendered and not clipped away.
  for (const z of zones) {
    expect(z.box.w, `zone ${z.id} collapsed`).toBeGreaterThan(40);
  }
}

test('stickies stay inside their zones and never pile up, in light and dark mode', async ({ page }) => {
  await page.goto('/dashboard');
  await page.getByPlaceholder(/booking app for mobile dog groomers/).fill('A clinic onboarding process that takes new vets three weeks');
  await page.getByRole('button', { name: 'Start the workshop' }).click();
  await expect(page.getByText(/Welcome to Setup/)).toBeVisible();

  // Setup -> Discover -> Define, letting the scripted facilitator seed each board.
  await agree(page);
  await agree(page);
  await expect(page.locator('[data-stage="discover"]')).toBeVisible();
  await agree(page);

  // Add a few of our own so zones hold more than one item.
  for (const text of ['Practice manager', 'Head vet', 'Locum agency']) {
    await page.getByRole('button', { name: 'Add to Direct' }).click();
    const input = page.locator('[data-add-input]');
    await input.fill(text);
    await input.press('Enter');
    await expect(page.locator('[data-item-id]', { hasText: text })).toBeVisible();
  }
  await checkBoards(page);

  await agree(page);
  await expect(page.locator('[data-stage="define"]')).toBeVisible();
  await agree(page);
  // The pane shows one activity at a time; open the journey from the map.
  await page.locator('[data-activity="journey"]').click();
  await expect(page.locator('[data-zone-container="m1"] [data-item-id]')).toBeVisible();
  await checkBoards(page);

  await page.emulateMedia({ colorScheme: 'dark' });
  await page.getByRole('button', { name: 'Toggle theme' }).click();
  await checkBoards(page);
  await expect(page).toHaveScreenshot('define-boards-dark.png', { fullPage: true, maxDiffPixelRatio: 0.02, mask: [page.locator('[data-item-id]')] });
});
