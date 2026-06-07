/**
 * Workshop Walkthrough E2E
 *
 * Two tests, by design:
 *
 * 1. "Workshop creation + AI chat" (RELIABLE / runs in CI) — covers the
 *    deterministic happy path that we can assert without flakiness: create a
 *    solo workshop via the dialog, land on /step/challenge (slug routing),
 *    receive the AI greeting, send a message, and get an AI response. This
 *    exercises creation, the slug redirect, the greeting flow, and the
 *    /api/chat round-trip (which only works because the BYPASS_AUTH path returns
 *    a synthetic owner — see src/lib/auth/bypass.ts).
 *
 * 2. "Complete workshop … all 10 steps" (test.fixme — PARKED, does not run) —
 *    the full forward walk. It cannot be made reliably green: advancing past
 *    each step requires the step's artifact to be CONFIRMED, and the Confirm/
 *    Accept button only appears once the canvas is populated with step-specific
 *    artifacts (see `showConfirm` in step-container.tsx). That population is
 *    driven by non-deterministic Gemini output, so a single chat message does
 *    not reliably produce a confirmable canvas — empirically the challenge step
 *    alone would not advance ("no confirm button; Next disabled"). The test is
 *    kept (robust, instrumented) so it can be resumed if/when step confirmation
 *    is made test-drivable (e.g. seeded canvas state or deterministic tool
 *    output). Un-fixme it and run locally to diagnose: each step logs greeting/
 *    response/confirm/Next state.
 *
 * Uses real Gemini, real DB, real browser. Requires the dev server with
 * BYPASS_AUTH=true (playwright.config.ts) and GEMINI/DATABASE keys in .env.local.
 */

import { test, expect, type Page } from '@playwright/test';

const RESP_TIMEOUT = 120_000; // AI response (Gemini can be slow on cold starts)
const NAV_TIMEOUT = 120_000; // step advance (server action + summary + redirect)
const GREETING_TIMEOUT = 90_000;

function urlRe(slug: string): RegExp {
  return new RegExp(`/workshop/[^/]+/step/${slug}(?:[?#]|$)`);
}

async function createSoloWorkshop(page: Page): Promise<string> {
  await page.goto('/');
  await page.getByRole('button', { name: /start workshop/i }).first().click();
  await page.getByPlaceholder(/Pet Care App/i).fill('E2E pet care walkthrough');
  await page.getByRole('button', { name: /by myself/i }).click();
  await page.getByRole('button', { name: /^Continue$/ }).click();
  await page.waitForURL(urlRe('challenge'), { timeout: 30_000 });
  const sessionId = page.url().match(/\/workshop\/([^/]+)\/step\/challenge/)?.[1];
  expect(sessionId, 'should extract sessionId from challenge URL').toBeTruthy();
  return sessionId!;
}

async function waitForGreeting(page: Page, label: string): Promise<void> {
  await expect(page.locator('.prose:visible').first()).toBeVisible({ timeout: GREETING_TIMEOUT });
  console.log(`[${label}] greeting visible`);
}

async function sendMessage(page: Page, text: string, label: string): Promise<void> {
  const before = await page.locator('.prose').count();
  const input = page.locator('textarea[placeholder*="Type your message"]:visible').first();
  await input.fill(text);
  await input.press('Enter');
  // Robust response wait: a NEW assistant bubble (.prose) renders. User messages
  // don't use .prose, so a count increase means the AI replied. No dependency on
  // the transient "AI is thinking…" indicator.
  await expect
    .poll(async () => page.locator('.prose').count(), { timeout: RESP_TIMEOUT, intervals: [1500] })
    .toBeGreaterThan(before);
  console.log(`[${label}] AI responded`);
}

test.describe('Workshop Walkthrough', () => {
  test('Workshop creation + AI chat (reliable smoke)', async ({ page }) => {
    test.setTimeout(240_000);
    page.on('pageerror', (e) => console.log('Page error:', e.message));

    console.log('\n=== Creating workshop ===');
    const sessionId = await createSoloWorkshop(page);
    console.log('Workshop created:', sessionId);

    // Slug routing: we landed on /step/challenge, shown as "Workshop Setup".
    await expect(page).toHaveURL(urlRe('challenge'));

    // Greeting flow + /api/chat auth (synthetic-owner bypass) work end-to-end.
    await waitForGreeting(page, 'challenge');
    await sendMessage(
      page,
      "I want to build a pet care app that helps busy pet owners manage their pets' daily routines and health needs.",
      'challenge',
    );

    // The AI produced at least one greeting + one response.
    expect(await page.locator('.prose').count()).toBeGreaterThanOrEqual(2);
    console.log('=== Reliable smoke passed: creation + greeting + chat round-trip ===');
  });

  // ── PARKED: see file header. Cannot be reliably green until step confirmation
  // is test-drivable. Robust + instrumented so it's ready to resume.
  test.fixme('Complete workshop from creation through all 10 steps', async ({ page }) => {
    test.setTimeout(1_200_000);
    page.on('pageerror', (e) => console.log('Page error:', e.message));

    const WALK: Array<{ slug: string; next: string | null; message: string }> = [
      { slug: 'stakeholder-mapping', next: 'user-research', message: 'The main stakeholders are pet owners, veterinarians, pet sitters, dog walkers, pet supply companies, and animal shelters.' },
      { slug: 'user-research', next: 'sense-making', message: 'Interview busy professionals who own multiple pets and struggle to keep up with vet appointments, feeding schedules, and medication reminders.' },
      { slug: 'sense-making', next: 'persona', message: 'Key themes: time-management struggles, anxiety about pet health, guilt when routines slip, and a strong desire for automated reminders.' },
      { slug: 'persona', next: 'journey-mapping', message: 'The primary persona is a working professional aged 28-35 who owns 2-3 pets and juggles a demanding job with pet care.' },
      { slug: 'journey-mapping', next: 'reframe', message: 'Their day starts with morning feeding, continues through a workday worrying about the pets, and ends with evening care and guilt about missed tasks.' },
      { slug: 'reframe', next: 'ideation', message: 'Focus the How Might We on making routine pet-care management effortless for busy multi-pet owners.' },
      { slug: 'ideation', next: 'brainwriting', message: 'Some ideas: a smart feeding-schedule optimizer, a vet-appointment coordinator with reminders, a pet-health dashboard, and a community care-sharing network.' },
      { slug: 'brainwriting', next: 'concept', message: 'Build on the smart feeding-schedule optimizer: add voice reminders, multi-pet profiles, and a shared caregiver view.' },
      { slug: 'concept', next: 'validate', message: 'Develop the smart feeding-schedule optimizer concept with a SWOT analysis and an elevator pitch.' },
      { slug: 'validate', next: null, message: 'Create a user flow for the core feeding-schedule feature and outline the key screens for the prototype.' },
    ];

    // Click the step's confirm/accept button if available, then Next. Returns true if it advanced.
    const confirmAndAdvance = async (nextSlug: string, label: string): Promise<boolean> => {
      const confirm = page.getByRole('button', { name: /^(Accept|Confirm|Complete|Done)\b/ }).first();
      if (await confirm.isVisible().catch(() => false)) {
        console.log(`[${label}] confirming: "${(await confirm.textContent())?.trim()}"`);
        await confirm.click().catch(() => {});
        await page.waitForTimeout(2000);
      } else {
        console.log(`[${label}] no confirm button visible`);
      }
      const next = page.getByRole('button', { name: /^Next$/ }).first();
      const nextEnabled = (await next.isVisible().catch(() => false)) && (await next.isEnabled().catch(() => false));
      console.log(`[${label}] Next enabled=${nextEnabled}`);
      if (!nextEnabled) return false;
      await next.click();
      await page.waitForURL(urlRe(nextSlug), { timeout: NAV_TIMEOUT }).catch(() => {});
      return urlRe(nextSlug).test(page.url());
    };

    console.log('\n=== Creating workshop ===');
    const sessionId = await createSoloWorkshop(page);
    console.log('Workshop created:', sessionId);

    console.log('\n=== Challenge (setup) ===');
    await waitForGreeting(page, 'challenge');
    await sendMessage(page, "I want to build a pet care app that helps busy pet owners manage their pets' daily routines and health needs.", 'challenge');
    expect(await confirmAndAdvance('stakeholder-mapping', 'challenge'), 'challenge should confirm + advance').toBe(true);

    let reached = 'stakeholder-mapping';
    for (const step of WALK) {
      console.log(`\n=== Step: ${step.slug} ===`);
      await expect(page, `should be on ${step.slug}`).toHaveURL(urlRe(step.slug));
      await waitForGreeting(page, step.slug);
      await sendMessage(page, step.message, step.slug);

      if (step.next === null) {
        await expect(page.getByRole('button', { name: /^Next$/ }).first(), 'validate has no Next').not.toBeVisible();
        reached = 'validate';
        break;
      }
      expect(await confirmAndAdvance(step.next, step.slug), `step ${step.slug} should advance to ${step.next}`).toBe(true);
      reached = step.next;
    }
    expect(reached, 'should reach validate').toBe('validate');
  });
});
