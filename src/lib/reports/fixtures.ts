import type { Summary, Verdict, BuildPack } from './schemas';

/** Canned reports for AI_FAKE runs, so the summary page works end to end without a model. */
export const FAKE_SUMMARY: Summary = {
  headline: 'Test the text-back before building anything.',
  challenge: 'How might we help solo mobile groomers never lose a job to a missed call?',
  persona: 'Jess, 34, solo mobile groomer.',
  dip: 'The 7pm call-back when the slot has gone.',
  concept: 'A text-back and self-booking link that fills the slot while she works.',
  assumption: 'Callers will book from a text link within the hour.',
  test: 'Forward missed calls to an SMS link for two weeks. Target 40%, kill under 10%.',
  nextSevenDays: ['Set up the SMS auto-reply with one groomer', 'Log every missed call and link booking'],
};

export const FAKE_VERDICT: Verdict = {
  verdictLine: 'Not ready to build; run the two-week test first.',
  readiness: 'test_first',
  dimensions: [
    { dimension: 'problem', strength: 'thin', read: 'Two groomers said they ignore the phone. Nobody has counted lost jobs.', sources: ['Discover'], nextTest: 'Count missed calls for a week.' },
    { dimension: 'audience', strength: 'thin', read: 'Solo mobile groomers is specific and reachable.', sources: ['Setup'], nextTest: 'Ask in two groomer groups.' },
    { dimension: 'edge', strength: 'missing', read: 'Nothing looked at what groomers use today.', sources: [], nextTest: 'Check whether current tools already text back.' },
    { dimension: 'evidence', strength: 'thin', read: 'Two interview remarks; the rest is belief.', sources: ['Discover'], nextTest: 'The committed test.' },
    { dimension: 'cost_to_test', strength: 'solid', read: 'Cheap, concrete, with a kill threshold agreed in advance.', sources: ['Deliver'] },
  ],
  assumption: 'At least 40% of missed callers will book from a text link within the hour.',
  signal: { metric: 'Missed callers who book via the link within an hour', target: 40, kill: 10, unit: '% of missed callers', window: '14 days' },
  cheapestTest: 'Forward one groomer\'s missed calls to an SMS auto-reply with a booking link for 14 days. Log every missed call and link booking.',
};

export const FAKE_BUILD_PACK: BuildPack = {
  title: 'Build Pack: Booked While You Groom',
  sections: [
    { heading: 'Overview', markdown: 'Status: test first. A text-back with a booking link for solo mobile groomers.' },
    { heading: 'PRD', markdown: '- As a caller, I get a text within a minute with a link to free slots.\n- As Jess, I see new bookings without touching the phone.' },
    { heading: 'Tech specs', markdown: 'Data: missed calls, texts sent, bookings. Integrations: telephony forwarding, SMS, calendar.' },
    { heading: 'Risks and open questions', markdown: '- Existing booking tools may already do this.' },
    { heading: 'First two weeks', markdown: '1. Run the test with one groomer.\n2. Log results.' },
  ],
};
